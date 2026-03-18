import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { API_URL } from '../config'
import { useUserLocation } from '../context/LocationContext'

const SUGGESTIONS = [
  { label: 'Medicine Order', text: 'I need Paracetamol 650mg, 10 tablets', icon: '💊' },
  { label: 'CPR Guide', text: 'How to perform CPR in an emergency?', icon: '🫀' },
  { label: 'Stroke Check', text: 'What are the signs of a stroke?', icon: '🧠' },
  { label: 'Burn First Aid', text: 'First aid for severe burns?', icon: '🔥' },
  { label: 'Allergy Check', text: 'Check for drug interactions with Ibuprofen', icon: '⚠️' },
]

// ── Delivery option card ──────────────────────────────────────────────────
function DeliveryCard({ link }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 rounded-xl bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600 hover:border-blue-400 transition-all group"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{link.icon}</span>
        <div>
          <div className="font-semibold text-slate-100 group-hover:text-white text-sm">
            {link.name}
          </div>
          {link.delivery_time && (
            <div className="text-xs text-slate-400">{link.delivery_time}</div>
          )}
        </div>
      </div>
      <span className="text-xs text-blue-400 font-semibold whitespace-nowrap">Order →</span>
    </a>
  )
}

// ── Confirm button ────────────────────────────────────────────────────────
function ConfirmButton({ onConfirm, loading }) {
  return (
    <button
      onClick={onConfirm}
      disabled={loading}
      className="mt-3 w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
    >
      ✅ Confirm Order
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, onConfirm, loading, orderState }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
        isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-violet-600'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm max-w-lg whitespace-pre-wrap'
          : 'bg-slate-800 text-slate-100 rounded-tl-sm max-w-lg'
      }`}>
        <span dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
        }} />

        {msg.pharmacy_links && msg.pharmacy_links.length > 0 && (
          <div className="mt-3 space-y-2">
            {msg.pharmacy_links.map((link, idx) => (
              <DeliveryCard key={idx} link={link} />
            ))}
            {orderState === 'awaiting_confirm' && (
              <ConfirmButton onConfirm={onConfirm} loading={loading} />
            )}
          </div>
        )}

        {msg.order_state === 'confirmed' && (
          <div className="mt-3 flex items-center gap-2 bg-green-500/15 border border-green-500/30 rounded-xl px-3 py-2">
            <span className="text-green-400 text-lg">🎉</span>
            <span className="text-green-300 text-xs font-medium">Order placed successfully!</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Chatbot page ─────────────────────────────────────────────────────
export default function Chatbot() {
  const { coords, address, locationLoading } = useUserLocation()

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm MediLink AI 🤖\n\nI can help you with:\n• **Medical questions** and emergency guidance\n• **Order medicines** delivered to your location\n\nTry: *\"I need Paracetamol 650mg, 10 tablets\"*",
    pharmacy_links: null,
    order_state: 'idle',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [orderState, setOrderState] = useState('idle')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build location payload: always include live coords when available
  const buildLocationPayload = useCallback(() => {
    if (coords) {
      return `${coords.lat},${coords.lng}`
    }
    return null
  }, [coords])

  const sendMessage = useCallback(async (content, extraLocation) => {
    const msg = (content || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    // Always attach live location to every message
    const locationStr = extraLocation || buildLocationPayload()

    try {
      const res = await axios.post(`${API_URL}/chatbot/chat`, {
        message: msg,
        session_id: sessionId,
        location: locationStr,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
      })

      const newState = res.data.order_state || 'idle'
      setOrderState(newState)

      // If backend still asks for location (no coords were available before), auto-send now
      if (newState === 'awaiting_location' && coords) {
        // Silently reply with coords so user never sees pincode prompt
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '📍 Using your live location for delivery...',
          pharmacy_links: null,
          order_state: 'awaiting_location',
        }])
        setLoading(false)
        // Give backend a moment then auto-reply with coordinates
        setTimeout(() => {
          sendMessage(`${coords.lat},${coords.lng}`, `${coords.lat},${coords.lng}`)
        }, 500)
        return
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.reply,
        pharmacy_links: res.data.pharmacy_links || null,
        order_state: newState,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I couldn\'t connect to the AI service. Please try again.',
        order_state: 'idle',
      }])
      setOrderState('idle')
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, coords, buildLocationPayload])

  const handleConfirm = useCallback(() => {
    sendMessage('confirm')
  }, [sendMessage])

  const placeholder = orderState === 'awaiting_confirm'
    ? 'Type "confirm" to place the order…'
    : 'Ask a medical question or order a medicine…'

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4 pt-8 pb-4">

        {/* Header */}
        <div className="glass-premium p-6 rounded-3xl mb-8 flex items-center justify-between border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl text-3xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">MediLink AI <span className="text-xs font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md ml-2 border border-blue-500/20 uppercase tracking-widest">PRO</span></h1>
              <div className="flex items-center gap-3 flex-wrap mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  <span className="text-green-400 text-sm font-medium">Assistant Online</span>
                </div>
                {locationLoading ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1 animate-pulse">
                     📍 Locating...
                  </span>
                ) : coords ? (
                  <span className="text-xs text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    📍 {address || 'Live Location Active'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([messages[0]])} className="p-3 bg-slate-800/50 hover:bg-red-500/20 rounded-xl border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-all z-10" title="Clear Chat">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">Recommended Actions</p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-blue-600/10 border border-slate-700/50 hover:border-blue-500/50 rounded-2xl text-left transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 group"
                >
                  <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-300">{s.icon}</span>
                  <div>
                    <div className="text-slate-200 font-semibold text-sm group-hover:text-blue-400 transition-colors">{s.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5 line-clamp-1 italic">"{s.text}"</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onConfirm={handleConfirm}
              loading={loading}
              orderState={i === messages.length - 1 ? orderState : 'idle'}
            />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm">🤖</div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Location warning if unavailable */}
        {!coords && !locationLoading && (
          <div className="mb-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-400 flex items-center gap-2">
            ⚠️ Location access is disabled. Medicine ordering will ask for your city name.
          </div>
        )}

        {/* Confirm helper */}
        {orderState === 'awaiting_confirm' && (
          <div className="mb-2 px-2 text-xs flex items-center gap-2 text-green-400">
            🛒 Review your order above and type confirm to proceed
          </div>
        )}

        {/* Input area */}
        <div className="glass rounded-2xl p-3 border border-slate-700/50">
          <div className="flex gap-3 items-end">
            <textarea
              id="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={placeholder}
              rows={2}
              className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm resize-none"
            />
            <button
              id="chatbot-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-2">
          MediLink AI provides general guidance only. Always consult a doctor for serious conditions.
        </p>
      </div>
    </div>
  )
}
