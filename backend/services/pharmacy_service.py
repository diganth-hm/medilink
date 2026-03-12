"""
Pharmacy Service — Medicine ordering intent detection, OTC check,
location parsing, and structured order summary generation.
"""

import re
import random
from urllib.parse import quote_plus
from typing import Optional, List, Dict

# ---------------------------------------------------------------------------
# OTC vs Prescription classification
# ---------------------------------------------------------------------------

OTC_MEDICINES = {
    "paracetamol", "acetaminophen", "ibuprofen", "aspirin", "dolo",
    "crocin", "combiflam", "meftal", "disprin", "cetirizine", "loratadine",
    "fexofenadine", "ranitidine", "pantoprazole", "omeprazole", "antacid",
    "eno", "digene", "gelusil", "ors", "electral", "becosules",
    "vitamin c", "vitamin d", "calcium", "zinc", "iron",
    "strepsils", "vicks", "halls", "benadryl", "sinarest",
    "nasal spray", "otrivin", "nasivion", "betadine", "dettol",
    "savlon", "bandaid", "volini", "moov", "iodex",
    "glycerin", "calamine", "lacto calamine", "boroline",
    "loperamide", "immodium", "emetrol", "domperidone",
    "clonazepam",  # low-dose OTC in some regions
}

PRESCRIPTION_MEDICINES = {
    "metformin", "insulin", "losartan", "amlodipine", "atenolol",
    "metoprolol", "lisinopril", "atorvastatin", "rosuvastatin",
    "levothyroxine", "thyroxine", "azithromycin", "amoxicillin",
    "ciprofloxacin", "doxycycline", "cefixime", "ceftriaxone",
    "prednisolone", "dexamethasone", "hydrocortisone",
    "alprazolam", "diazepam", "lorazepam", "sertraline", "fluoxetine",
    "escitalopram", "olanzapine", "risperidone", "quetiapine",
    "levetiracetam", "phenytoin", "carbamazepine", "valproate",
    "warfarin", "clopidogrel", "enoxaparin", "heparin",
    "salbutamol", "montelukast", "budesonide", "formoterol",
    "methotrexate", "hydroxychloroquine", "sulfasalazine",
    "tamsulosin", "sildenafil", "tadalafil",
    "codeine", "tramadol", "morphine", "oxycodone",
}

# ---------------------------------------------------------------------------
# Intent keywords
# ---------------------------------------------------------------------------

INTENT_KEYWORDS = [
    "order", "buy", "purchase", "get me", "need", "deliver", "delivery",
    "medicine", "medication", "drug", "tablet", "tablets", "capsule",
    "capsules", "syrup", "strip", "strips", "ml", "mg",
    "pharmeasy", "1mg", "netmeds", "apollo", "practo", "blinkit", "zepto",
]

ORDER_ACTION_KEYWORDS = [
    "order", "buy", "purchase", "deliver", "get me", "where can i buy",
    "where to buy", "how to order", "i need", "can i get", "i want",
]

CONFIRM_KEYWORDS = ["confirm", "yes", "proceed", "place order", "ok", "okay", "go ahead", "sure"]

EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "stroke", "unconscious", "not breathing",
    "seizure", "overdose", "bleeding heavily", "accident", "emergency", "911", "ambulance",
]

# ---------------------------------------------------------------------------
# Platform definitions
# ---------------------------------------------------------------------------

PLATFORMS = {
    "Apollo Pharmacy": {
        "url_template": "https://www.apollopharmacy.in/search-medicines/{medicine}",
        "icon": "⚕️",
        "coverage": "metro",
        "delivery_time": "30–60 minutes",
        "color": "#FF5722",
    },
    "PharmEasy": {
        "url_template": "https://pharmeasy.in/search/all?name={medicine}",
        "icon": "💊",
        "coverage": "nationwide",
        "delivery_time": "2–3 hours",
        "color": "#4CAF50",
    },
    "Tata 1mg": {
        "url_template": "https://www.1mg.com/search/all?name={medicine}",
        "icon": "🏥",
        "coverage": "nationwide",
        "delivery_time": "Same day",
        "color": "#E91E63",
    },
    "NetMeds": {
        "url_template": "https://www.netmeds.com/catalogsearch/result?q={medicine}",
        "icon": "🩺",
        "coverage": "nationwide",
        "delivery_time": "1–2 days",
        "color": "#2196F3",
    },
    "Blinkit": {
        "url_template": "https://blinkit.com/search?q={medicine}",
        "icon": "⚡",
        "coverage": "metro",
        "delivery_time": "10–20 minutes",
        "color": "#FFEB3B",
    },
    "Zepto": {
        "url_template": "https://www.zeptonow.com/search?query={medicine}",
        "icon": "🚀",
        "coverage": "metro",
        "delivery_time": "10–20 minutes",
        "color": "#9C27B0",
    },
}

# ---------------------------------------------------------------------------
# City tier classification
# ---------------------------------------------------------------------------

METRO_CITIES = {
    "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai",
    "kolkata", "pune", "ahmedabad", "surat", "noida", "gurgaon", "gurugram",
    "thane", "pimpri", "faridabad", "meerut",
}

MAJOR_CITIES = METRO_CITIES | {
    "jaipur", "lucknow", "kanpur", "nagpur", "indore", "bhopal", "patna",
    "vadodara", "coimbatore", "agra", "nashik", "kochi", "visakhapatnam",
    "chandigarh", "bhubaneswar", "mysuru", "mysore", "ranchi", "amritsar",
}

# Bangalore pincode prefixes (560xxx)
BANGALORE_PINCODE_PREFIX = "560"


# ---------------------------------------------------------------------------
# Core utility functions
# ---------------------------------------------------------------------------

def requires_prescription(medicine: str) -> bool:
    """Return True if the medicine likely requires a prescription."""
    med_lower = medicine.lower().strip()
    # Check exact match or if any prescription keyword is in the name
    for rx in PRESCRIPTION_MEDICINES:
        if rx in med_lower:
            return True
    return False


def is_otc(medicine: str) -> bool:
    """Return True if the medicine is clearly OTC."""
    med_lower = medicine.lower().strip()
    for otc in OTC_MEDICINES:
        if otc in med_lower:
            return True
    return False


def detect_medicine_intent(message: str) -> bool:
    """Return True if the message indicates a medicine ordering intent."""
    msg_lower = message.lower()

    # Emergency override — do NOT trigger medicine flow
    if any(kw in msg_lower for kw in EMERGENCY_KEYWORDS):
        return False

    has_action = any(kw in msg_lower for kw in ORDER_ACTION_KEYWORDS)
    has_medicine_context = any(kw in msg_lower for kw in [
        "medicine", "medication", "tablet", "tablets", "capsule", "capsules",
        "syrup", "strip", "strips", "mg", "ml",
    ])

    # Direct pattern: "<MedicineName> <dosage> <quantity>" without action verb
    bare_pattern = re.search(
        r"\b([a-zA-Z]{3,})\s+\d+\s*(?:mg|ml|mcg)\b.*\b\d+\s*(?:tablet|capsule|strip|ml|piece)",
        msg_lower
    )

    return has_action or (has_medicine_context and has_action) or bare_pattern is not None


def extract_medicine_name(message: str) -> Optional[str]:
    """Extract the primary medicine name from a user message."""
    # Pattern 1: action verb + medicine name
    patterns = [
        r"(?:order|buy|purchase|get me?|deliver|i need|i want|need to order|want to order)\s+([a-zA-Z][a-zA-Z0-9\s\-]+?)(?:\s+\d|\s+for|\s+from|\s+tablet|\s+mg|\s+ml|$)",
        r"(?:where (?:can i buy|to buy|do i get))\s+([a-zA-Z][a-zA-Z0-9\s\-]+?)(?:\s+\d|\s+for|\s+tablet|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            candidate = re.sub(r"\s+(for|from|some|a|an|the|my|medicine|medication)$", "", candidate, flags=re.IGNORECASE)
            if candidate and len(candidate) > 1:
                return candidate.title()

    # Pattern 2: bare "MedicineName dosage quantity" — pick first looks-like-drug word
    bare = re.match(r"^([a-zA-Z][a-zA-Z0-9\-]+)\s+\d", message.strip())
    if bare:
        return bare.group(1).title()

    # Fallback: first capitalised word that isn't a common word
    common = {"i", "please", "can", "you", "help", "the", "a", "an", "get", "me", "need", "want", "order"}
    for word in message.split():
        clean = re.sub(r"[^a-zA-Z]", "", word)
        if clean and clean[0].isupper() and len(clean) > 3 and clean.lower() not in common:
            return clean

    return None


def extract_quantity(message: str) -> Optional[str]:
    """Extract quantity from a message, e.g. '10 tablets', '2 strips', '100 ml'.
    Prioritises count-based units (tablets/strips) over dosage units (mg/ml).
    """
    # Priority 1: count-based units (most useful for ordering)
    count_pattern = re.search(
        r"(\d+)\s*(tablet[s]?|cap[s]?|capsule[s]?|strip[s]?|piece[s]?|pack[s]?|bottle[s]?|sachet[s]?)",
        message, re.IGNORECASE
    )
    if count_pattern:
        return f"{count_pattern.group(1)} {count_pattern.group(2)}"

    # Priority 2: volume/weight units
    vol_pattern = re.search(r"(\d+)\s*(ml|litre[s]?|liter[s]?)", message, re.IGNORECASE)
    if vol_pattern:
        return f"{vol_pattern.group(1)} {vol_pattern.group(2)}"

    # Priority 3: generic quantity (x N, N pcs, N units)
    gen_pattern = re.search(r"(?:x\s*)?(\d+)\s*(?:pcs?|nos?|units?)", message, re.IGNORECASE)
    if gen_pattern:
        return f"{gen_pattern.group(1)} units"

    return None



def extract_location_info(message: str) -> Dict:
    """
    Extract city, pincode, state, landmark from a message.
    Returns dict with available keys filled.
    """
    result = {}

    # Pincode: 6-digit number
    pin_match = re.search(r"\b(\d{6})\b", message)
    if pin_match:
        result["pincode"] = pin_match.group(1)
        # Infer city from known pincode prefixes
        pin = pin_match.group(1)
        if pin.startswith("560"):
            result["city"] = "Bangalore"
            result["state"] = "Karnataka"
        elif pin.startswith("400"):
            result["city"] = "Mumbai"
            result["state"] = "Maharashtra"
        elif pin.startswith("110"):
            result["city"] = "Delhi"
            result["state"] = "Delhi"
        elif pin.startswith("600"):
            result["city"] = "Chennai"
            result["state"] = "Tamil Nadu"
        elif pin.startswith("500"):
            result["city"] = "Hyderabad"
            result["state"] = "Telangana"
        elif pin.startswith("700"):
            result["city"] = "Kolkata"
            result["state"] = "West Bengal"

    # City name
    msg_lower = message.lower()
    for city in METRO_CITIES | MAJOR_CITIES:
        if city in msg_lower:
            result["city"] = city.title()
            break

    # Landmark: anything after "near", "opposite", "beside", "at"
    landmark_match = re.search(r"(?:near|opposite|beside|at|next to)\s+([a-zA-Z0-9\s,]+?)(?:,|$)", message, re.I)
    if landmark_match:
        result["landmark"] = landmark_match.group(1).strip()

    return result


def is_metro_pincode(pincode: str) -> bool:
    """Return True if the pincode belongs to a metro city."""
    metro_prefixes = ["560", "400", "110", "600", "500", "700", "411", "380"]
    return any(pincode.startswith(p) for p in metro_prefixes)


def get_pharmacy_availability(location_info: Dict) -> List[str]:
    """Return available platform names based on location info."""
    if "coordinates" in location_info:
        return list(PLATFORMS.keys())  # Assumed all platforms available for demo when live coordinates

    pincode = location_info.get("pincode", "")
    city = location_info.get("city", "").lower()

    is_metro = (
        city in METRO_CITIES
        or (pincode and is_metro_pincode(pincode))
    )
    is_major = city in MAJOR_CITIES

    if is_metro:
        return list(PLATFORMS.keys())  # All platforms including Blinkit/Zepto
    elif is_major:
        return [n for n, d in PLATFORMS.items() if d["coverage"] in ("nationwide", "major", "city")]
    else:
        return [n for n, d in PLATFORMS.items() if d["coverage"] == "nationwide"]


def generate_order_links(medicine: str, available_platforms: Optional[List[str]] = None) -> List[Dict]:
    """Generate pharmacy order link objects for a medicine."""
    encoded = quote_plus(medicine.lower())
    platforms_to_use = available_platforms or list(PLATFORMS.keys())
    links = []
    for name in platforms_to_use:
        if name not in PLATFORMS:
            continue
        p = PLATFORMS[name]
        links.append({
            "name": name,
            "url": p["url_template"].format(medicine=encoded),
            "icon": p["icon"],
            "color": p["color"],
            "delivery_time": p["delivery_time"],
        })
    return links


def build_order_summary(medicine: str, quantity: Optional[str], location_info: Dict, links: List[Dict]) -> str:
    """Build the structured order summary reply text."""
    qty_str = quantity or "as required"
    city = location_info.get("city", "your area")
    pincode = location_info.get("pincode", "")
    landmark = location_info.get("landmark", "")

    address_parts = []
    if landmark:
        address_parts.append(landmark)
    if city:
        address_parts.append(city)
    if pincode:
        address_parts.append(pincode)
    address_str = ", ".join(address_parts) if address_parts else "your area"

    delivery_lines = "\n".join(
        [f"{i+1}. {l['icon']} **{l['name']}** — {l['delivery_time']}" for i, l in enumerate(links[:4])]
    )

    return (
        f"✅ **Medicine available for delivery!**\n\n"
        f"**📦 Order Summary**\n"
        f"• Medicine: **{medicine}**\n"
        f"• Quantity: **{qty_str}**\n"
        f"• Delivery to: **{address_str}**\n\n"
        f"**🚚 Delivery Options:**\n{delivery_lines}\n\n"
        f"Reply **confirm** to place the order, or ask me to change anything."
    )


def build_pharmacy_response(medicine: str, location: str) -> Dict:
    """Legacy single-arg entry point for backward compatibility."""
    location_info = extract_location_info(location)
    if not location_info:
        location_info = {"city": location.title()}
    available = get_pharmacy_availability(location_info)
    links = generate_order_links(medicine, available)
    reply = build_order_summary(medicine, None, location_info, links)
    return {"reply": reply, "pharmacy_links": links}


def simulate_order_confirmation(medicine: str, quantity: Optional[str], platform: str) -> str:
    """Generate a realistic simulated order confirmation message."""
    platform_data = PLATFORMS.get(platform, {})
    eta = platform_data.get("delivery_time", "within a few hours")
    order_id = f"ML{random.randint(100000, 999999)}"
    qty_str = quantity or "1 unit"
    return (
        f"🎉 **Order Placed Successfully!**\n\n"
        f"• **Order ID:** #{order_id}\n"
        f"• **Medicine:** {medicine}\n"
        f"• **Quantity:** {qty_str}\n"
        f"• **Via:** {platform_data.get('icon', '')} {platform}\n"
        f"• **Estimated Delivery:** {eta}\n\n"
        f"You will receive a confirmation SMS/email shortly. "
        f"Track your order on the {platform} app.\n\n"
        f"⚠️ *This is a simulated order for demo purposes.*"
    )
