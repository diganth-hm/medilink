# MediLink — Emergency Medical Record Access System

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Groq-Qwen3--32b-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/SQLite-3.x-003B57?style=flat-square&logo=sqlite" />
</p>

MediLink is a full-stack Emergency Medical Record Access System. First responders can scan a patient's QR code to instantly access critical medical data — **no login required**. Powered by an AI assistant (Groq / Qwen) for context-aware emergency guidance.

---

## 🏗️ Project Structure

```
medilink/
├── backend/        # Python FastAPI + SQLite
└── frontend/       # React + Vite + Tailwind CSS
```

---

## ⚡ Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file and add your keys:
# GROQ_API_KEY=your_key_here
# SECRET_KEY=your_jwt_secret

# Start the backend
uvicorn main:app --reload
```

The backend runs on **http://localhost:8000**. On first start, it auto-creates the SQLite database and seeds 2 demo patients.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs on **http://localhost:5173**.

---

## 🔑 Demo Credentials

| Name       | Email                   | Password   | Conditions           |
|------------|-------------------------|------------|----------------------|
| John Doe   | john.doe@demo.com       | demo1234   | Cardiac, Diabetic    |
| Jane Smith | jane.smith@demo.com     | demo1234   | Epileptic, Asthmatic |

---

## 🤖 Groq API Key Setup

1. Visit [https://console.groq.com](https://console.groq.com) and sign up for free
2. Create an API key under "API Keys"
3. Add it to `backend/.env`:
   ```
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Restart the backend: the AI chatbot will activate automatically

Without a Groq key, the chatbot returns a helpful placeholder message instead of failing.

---

## 📲 Testing the QR Scan Flow

1. Log in as a demo patient (e.g., `john.doe@demo.com`)
2. Go to **Dashboard → View QR** to generate and download the QR code
3. Open a new browser tab and go to **http://localhost:5173/scan**
4. Use **Manual Token Entry** and paste the QR token (or use the full URL)
   - Or scan with your phone camera pointed at the QR image on screen
5. The **Emergency View** loads instantly with all critical medical data
6. Click **"Get AI Emergency Guidance"** to open the chatbot with patient context pre-loaded

---

## 🔐 Security

- Passwords hashed with **bcrypt** (passlib)
- Sessions protected with **JWT** tokens (python-jose)
- Emergency QR endpoint is **intentionally public** — exposes minimum required fields
- Input validation via **Pydantic** on all endpoints
- CORS configured for localhost development

---

## 🌐 API Documentation

With the backend running, visit:
- Swagger UI: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

---

## 🏥 Emergency Scenarios Covered

| Scenario | Data Available |
|---|---|
| Road accident / trauma | Blood type, emergency contacts |
| Cardiac arrest | Cardiac history, pacemaker status, heart meds |
| Allergic reaction | Full allergen list, severity |
| Diabetic emergency | Insulin/diabetes flag, medication list |
| Unconscious patient | Full QR profile access, no patient cooperation |
| Epileptic seizure | Epilepsy flag, anticonvulsants |
| Asthma attack | Asthma flag, inhaler info |
| Psychiatric crisis | Psychiatric medications, contacts |
| Surgical emergency | Surgical history, implants, blood group |
| Pediatric emergency | DOB to calculate age, vaccination records |
| Poisoning / overdose | Full medication list for toxicology |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python FastAPI + Uvicorn |
| Database | SQLite via SQLAlchemy ORM |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| AI Chatbot | Groq API (Qwen3-32b model) |
| QR Generation | Python `qrcode` library |
| QR Scanning | html5-qrcode (browser camera API) |
