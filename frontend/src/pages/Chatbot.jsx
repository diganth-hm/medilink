import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import ChatWidget from '../components/ChatWidget'

const SUGGESTIONS = [
  'I need Paracetamol 650mg, 10 tablets',
  'Order Cetirizine 10mg, 1 strip',
  'What do I do if someone is unresponsive?',
  'Steps for managing anaphylaxis?',
  'Is ibuprofen safe for a cardiac patient?',
  'How to help someone having a seizure?',
]

const ORDER_STATE_CONFIG = {
  awaiting_location: {
    placeholder: 'Enter your city or 6-digit pincode (e.g. 560038)…',
    helperText: '📍 Share your delivery location to continue',
    helperColor: 'text-blue-400',
  },
  awaiting_confirm: {
    placeholder: 'Type "confirm" to place the order, or ask to change anything…',
    helperText: '🛒 Review your order above and type confirm to proceed',
    helperColor: 'text-green-400',
  },
  idle: {
    placeholder: 'Ask a medical question or order a medicine…',
    helperText: null,
  },
}

// ── Delivery option card (outside component to avoid remount) ──────────────
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

// ── Confirm button ─────────────────────────────────────────────────────────
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

// ── Message bubble ─────────────────────────────────────────────────────────
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
        {/* Render markdown-style bold */}
        <span dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
        }} />

        {/* Delivery options */}
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

        {/* Order confirmed badge */}
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

// ── Main Chatbot page ──────────────────────────────────────────────────────
export default function Chatbot() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm MediLink AI 🤖\n\nI can help you with:\n• **Medical questions** and emergency guidance\n• **Order medicines** from top pharmacy delivery services\n\nTry: *\"I need Paracetamol 650mg, 10 tablets\"*",
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

  const sendMessage = useCallback(async (content) => {
    const msg = (content || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await axios.post('/chatbot/chat', {
        message: msg,
        session_id: sessionId,
      })

      const newState = res.data.order_state || 'idle'
      setOrderState(newState)

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
  }, [input, loading, sessionId])

  const handleConfirm = useCallback(() => {
    sendMessage('confirm')
  }, [sendMessage])

  const config = ORDER_STATE_CONFIG[orderState] || ORDER_STATE_CONFIG.idle

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4 pt-8 pb-4">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl text-2xl">
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">MediLink AI</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm">Online · Medical Assistant + Medicine Delivery</span>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Suggested</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-xl text-slate-300 hover:text-white transition-all duration-200"
                >
                  {s}
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

        {/* Input area */}
        <div className="glass rounded-2xl p-3 border border-slate-700/50">
          {config.helperText && (
            <div className={`mb-2 px-2 text-xs flex items-center gap-2 ${config.helperColor}`}>
              <span>{config.helperText}</span>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              id="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={config.placeholder}
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
