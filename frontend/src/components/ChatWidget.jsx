import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { 
  XMarkIcon, 
  TrashIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { API_URL } from '../config'

export default function ChatWidget({ patientContext = null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('medilink_chat')
    if (saved) return JSON.parse(saved)
    return [
      {
        role: 'assistant',
        content: patientContext
          ? `🚨 Emergency mode active. I have the medical context for ${patientContext.name} loaded. How can I help?`
          : '👋 Hi! I\'m MediLink AI. Ask me any medical question or emergency guidance.',
        timestamp: new Date().toISOString()
      },
    ]
  })
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Persist history
  useEffect(() => {
    sessionStorage.setItem('medilink_chat', JSON.stringify(messages))
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatContent = (content) => {
    if (!content) return content;
    
    // Split into lines for basic markdown-like processing
    return content.split('\n').map((line, i) => {
      let styledLine = line;
      
      // 1. "CALL 112" style
      if (line.includes('CALL 112')) {
        return <p key={i} className="text-red-500 font-black uppercase tracking-tight animate-pulse mb-2">{line}</p>;
      }
      
      // 2. Bold text **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = styledLine.split(boldRegex);
      const elements = parts.map((part, index) => 
        index % 2 === 1 ? <strong key={index} className="font-black text-slate-900 dark:text-white">{part}</strong> : part
      );

      // 3. Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return <li key={i} className="ml-4 mb-1 list-disc">{elements}</li>;
      }

      return <p key={i} className="mb-1 leading-relaxed">{elements}</p>;
    });
  };

  const getQuickPrompts = useCallback(() => {
    const chips = ["What should I do in a medical emergency?", "Check my drug interactions"];
    if (patientContext?.conditions?.some(c => c.toLowerCase().includes('cardiac'))) chips.unshift("Cardiac arrest first aid steps");
    if (patientContext?.conditions?.some(c => c.toLowerCase().includes('diabetic'))) chips.unshift("Signs of hypoglycemia");
    if (patientContext?.conditions?.some(c => c.toLowerCase().includes('epileptic'))) chips.unshift("Epileptic seizure protocol");
    if (patientContext?.conditions?.some(c => c.toLowerCase().includes('asthmatic'))) chips.unshift("Asthma attack management");
    if (patientContext?.allergies?.length > 0) chips.push("My allergy emergency response");
    return chips.slice(0, 4);
  }, [patientContext]);

  const sendMessage = async (overrideMsg = null) => {
    const text = overrideMsg || input.trim();
    if (!text || isStreaming) return;
    
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsStreaming(true);

    // Add placeholder for assistant
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString() }]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
          patient_context: patientContext
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: "⚠️ Error connecting to AI. Please try again." };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const clearChat = () => {
    const initial = [
      {
        role: 'assistant',
        content: patientContext
          ? `🚨 Emergency mode active. I have the medical context for ${patientContext.name} loaded. How can I help?`
          : '👋 Hi! I\'m MediLink AI. Ask me any medical question or emergency guidance.',
        timestamp: new Date().toISOString()
      },
    ];
    setMessages(initial);
    sessionStorage.setItem('medilink_chat', JSON.stringify(initial));
  };

  const getConditionColor = (c) => {
    const low = c.toLowerCase();
    if (low.includes('cardiac')) return 'bg-red-500 shadow-red-500/20';
    if (low.includes('diabetic')) return 'bg-amber-500 shadow-amber-500/20';
    if (low.includes('epileptic')) return 'bg-purple-500 shadow-purple-500/20';
    if (low.includes('asthmatic')) return 'bg-blue-500 shadow-blue-500/20';
    return 'bg-slate-500';
  }

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group 
            ${patientContext ? 'bg-red-600 border-2 border-white' : 'bg-slate-900 dark:bg-white'}`}
        >
          {patientContext ? (
            <ExclamationTriangleIcon className="w-8 h-8 text-white animate-pulse" />
          ) : (
            <SparklesIcon className="w-8 h-8 text-white dark:text-slate-900 group-hover:rotate-12 transition-transform" />
          )}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">AI</span>
        </button>
      )}

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden transition-opacity animate-in fade-in"
        />
      )}

      {/* Chat Panel */}
      <div className={`fixed z-[60] transition-all duration-500 ease-in-out shadow-2xl flex flex-col bg-white dark:bg-slate-900
        ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
        md:top-0 md:right-0 md:h-screen md:w-[380px] md:border-l md:border-slate-200 md:dark:border-slate-800
        bottom-0 left-0 right-0 h-[85vh] rounded-t-[2.5rem] md:rounded-none overflow-hidden`}
      >
        {/* Medical Disclaimer Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-900/30 px-4 py-1.5 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">AI guidance only — consult doctors</p>
        </div>

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-lg shadow-black/20">
                <SparklesIcon className="w-6 h-6 text-white dark:text-slate-900" />
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">MediLink AI</h2>
                <div className="flex items-center gap-1.5 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Engine Active</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearChat} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Clear Chat">
              <TrashIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Patient Context Header Card */}
        {patientContext && (
          <div className="mx-4 mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-red-500/20">
                   {patientContext.name?.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advising For</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{patientContext.name}</p>
                </div>
                <div className="ml-auto text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                  Context Loaded <span className="text-sm">✓</span>
                </div>
             </div>
             <div className="flex flex-wrap gap-1.5">
                {patientContext.conditions?.slice(0, 3).map((c, i) => (
                  <span key={i} className={`text-[10px] font-black text-white px-2.5 py-1 rounded-full shadow-sm ${getConditionColor(c)}`}>
                    {c}
                  </span>
                ))}
             </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar"
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-[1.5rem] p-4 text-sm shadow-sm transition-all duration-300
                ${msg.role === 'user' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-br-none' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="relative">
                  {formatContent(msg.content)}
                  {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="inline-block w-2.5 h-4 bg-red-500 ml-1 animate-pulse align-middle font-mono">▊</span>
                  )}
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-1.5 px-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
           
           {/* Quick Prompts */}
           <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
              {getQuickPrompts().map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  disabled={isStreaming}
                  className="whitespace-nowrap px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
           </div>

           <div className="relative group">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault() || sendMessage())}
                placeholder="Ask anything..."
                rows={1}
                disabled={isStreaming}
                className="w-full pl-5 pr-14 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-500/20 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none transition-all resize-none shadow-inner"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="absolute right-3 top-2.5 w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-lg shadow-black/20"
              >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
              </button>
           </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}
