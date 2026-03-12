from fastapi import APIRouter, HTTPException, Depends
from schemas import ChatMessage, ChatResponse
from models import ChatSession
from database import get_db
from sqlalchemy.orm import Session
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from services.pharmacy_service import (
    detect_medicine_intent,
    extract_medicine_name,
    extract_quantity,
    extract_location_info,
    get_pharmacy_availability,
    generate_order_links,
    build_order_summary,
    simulate_order_confirmation,
    requires_prescription,
    is_otc,
    CONFIRM_KEYWORDS,
    EMERGENCY_KEYWORDS,
)

load_dotenv()

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ---------------------------------------------------------------------------
# In-memory session state (persists for the lifetime of the server process)
# Tracks the multi-turn ordering workflow per session_id
# ---------------------------------------------------------------------------
SESSION_STATE: dict = {}
# Structure per session_id:
# {
#   "state": "idle" | "awaiting_location" | "awaiting_confirm",
#   "medicine": str,
#   "quantity": str | None,
#   "location_info": dict,
#   "links": list,
# }

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

NORMAL_SYSTEM_PROMPT = (
    "You are MediLink AI, a helpful medical assistant specialising in "
    "emergency medicine, medication information, and medicine delivery. "
    "You can help users order medicines through pharmacy delivery services. "
    "Provide clear, calm, and accurate guidance. Always recommend consulting a doctor "
    "for serious conditions. Keep responses concise and actionable."
)

EMERGENCY_SYSTEM_PROMPT = (
    "You are MediLink AI assisting in a live medical emergency. The patient's "
    "profile is: {patient_context}. Use this information to give specific, "
    "actionable guidance. Warn about allergies and drug interactions. Keep "
    "responses brief and clear. Prioritize life-saving information."
)

LOCATION_REQUEST_MSG = (
    "I can arrange delivery for that! 🏪\n\n"
    "Please share your **6-digit pincode** or **city name** "
    "so I can check pharmacy availability in your area."
)

PRESCRIPTION_MSG = (
    "⚠️ **{medicine}** is a **prescription-only medicine**.\n\n"
    "For your safety, I cannot process an order without a valid prescription. "
    "Please:\n"
    "1. Consult your doctor to get a prescription\n"
    "2. Upload the prescription on the PharmEasy or 1mg app\n"
    "3. Or visit a nearby pharmacy with your prescription\n\n"
    "Would you like me to help with anything else?"
)


# ---------------------------------------------------------------------------
# Groq helper
# ---------------------------------------------------------------------------

def call_groq(messages: list) -> str:
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return response.choices[0].message.content


def save_to_db(db: Session, session_id: str, user_msg: str, assistant_msg: str):
    db.add(ChatSession(session_id=session_id, role="user", message=user_msg))
    db.add(ChatSession(session_id=session_id, role="assistant", message=assistant_msg))
    db.commit()


# ---------------------------------------------------------------------------
# Main chat endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatMessage, db: Session = Depends(get_db)):
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        return ChatResponse(
            reply=(
                "MediLink AI is not configured. Please set GROQ_API_KEY in "
                "the backend .env file. For emergencies, call 112."
            ),
            session_id=payload.session_id,
        )

    session_id = payload.session_id
    message = payload.message.strip()
    msg_lower = message.lower()

    # Initialise session state if new
    if session_id not in SESSION_STATE:
        SESSION_STATE[session_id] = {"state": "idle"}

    state = SESSION_STATE[session_id]

    # -----------------------------------------------------------------------
    # EMERGENCY OVERRIDE — always goes to Groq
    # -----------------------------------------------------------------------
    if any(kw in msg_lower for kw in EMERGENCY_KEYWORDS):
        SESSION_STATE[session_id] = {"state": "idle"}  # reset ordering
        return await _groq_response(payload, db, emergency=True)

    # -----------------------------------------------------------------------
    # STATE: awaiting_confirm — user should reply "confirm" or change request
    # -----------------------------------------------------------------------
    if state.get("state") == "awaiting_confirm":
        if any(kw in msg_lower for kw in CONFIRM_KEYWORDS):
            # Place simulated order via the fastest platform
            links = state.get("links", [])
            platform = links[0]["name"] if links else "PharmEasy"
            confirmation = simulate_order_confirmation(
                state.get("medicine", "medicine"),
                state.get("quantity"),
                platform,
            )
            SESSION_STATE[session_id] = {"state": "idle"}
            save_to_db(db, session_id, message, confirmation)
            return ChatResponse(
                reply=confirmation,
                session_id=session_id,
                order_state="confirmed",
            )
        else:
            # User said something else — treat as new message, fall through
            SESSION_STATE[session_id] = {"state": "idle"}

    # -----------------------------------------------------------------------
    # STATE: awaiting_location — user just gave their location
    # -----------------------------------------------------------------------
    if state.get("state") == "awaiting_location":
        location_info = extract_location_info(message)
        # Also treat the whole message as a possible city/pincode or check live location
        if not location_info:
            import re
            if re.match(r"^\d{6}$", message.strip()):
                location_info = {"pincode": message.strip()}
            elif payload.location and "," in payload.location and "{" not in payload.location:
                location_info = {"coordinates": payload.location, "city": "Your Live Location"}
            else:
                location_info = {"city": message.strip().title()}

        medicine = state.get("medicine", "medicine")
        quantity = state.get("quantity")

        available_platforms = get_pharmacy_availability(location_info)
        links = generate_order_links(medicine, available_platforms)

        # Check if location resolved to anything useful
        if not available_platforms:
            reply = (
                "I couldn't find pharmacy delivery services for that location. "
                "Please try a 6-digit pincode or a major city name like **Bangalore**, **Mumbai**, etc."
            )
            save_to_db(db, session_id, message, reply)
            return ChatResponse(reply=reply, session_id=session_id, order_state="awaiting_location")

        summary = build_order_summary(medicine, quantity, location_info, links)

        SESSION_STATE[session_id] = {
            "state": "awaiting_confirm",
            "medicine": medicine,
            "quantity": quantity,
            "location_info": location_info,
            "links": links,
        }

        save_to_db(db, session_id, message, summary)
        return ChatResponse(
            reply=summary,
            session_id=session_id,
            pharmacy_links=links,
            order_state="awaiting_confirm",
        )

    # -----------------------------------------------------------------------
    # STATE: idle — check for medicine ordering intent
    # -----------------------------------------------------------------------
    if detect_medicine_intent(message):
        medicine = extract_medicine_name(message)
        quantity = extract_quantity(message)

        if medicine:
            # Prescription check
            if requires_prescription(medicine) and not is_otc(medicine):
                reply = PRESCRIPTION_MSG.format(medicine=medicine)
                save_to_db(db, session_id, message, reply)
                return ChatResponse(reply=reply, session_id=session_id, order_state="idle")

            # Need location
            SESSION_STATE[session_id] = {
                "state": "awaiting_location",
                "medicine": medicine,
                "quantity": quantity,
            }
            save_to_db(db, session_id, message, LOCATION_REQUEST_MSG)
            return ChatResponse(
                reply=LOCATION_REQUEST_MSG,
                session_id=session_id,
                order_state="awaiting_location",
            )

    # -----------------------------------------------------------------------
    # DEFAULT — send to Groq AI
    # -----------------------------------------------------------------------
    return await _groq_response(payload, db)


# ---------------------------------------------------------------------------
# Groq fallback
# ---------------------------------------------------------------------------

async def _groq_response(payload: ChatMessage, db: Session, emergency: bool = False) -> ChatResponse:
    try:
        if payload.patient_context or emergency:
            system_prompt = EMERGENCY_SYSTEM_PROMPT.format(
                patient_context=payload.patient_context or "unknown"
            )
        else:
            system_prompt = NORMAL_SYSTEM_PROMPT

        history = db.query(ChatSession).filter(
            ChatSession.session_id == payload.session_id
        ).order_by(ChatSession.timestamp).all()

        messages = [{"role": "system", "content": system_prompt}]
        for entry in history[-10:]:
            messages.append({"role": entry.role, "content": entry.message})
        messages.append({"role": "user", "content": payload.message})

        reply = call_groq(messages)
        save_to_db(db, payload.session_id, payload.message, reply)

        return ChatResponse(
            reply=reply,
            session_id=payload.session_id,
            order_state="idle",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")
