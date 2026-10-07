import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAuthHeader } from '@/lib/postgres'
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  ExternalLink,
  MessageSquare,
  Activity,
  DollarSign,
  BookOpen,
  ArrowRight,
  Shield,
} from 'lucide-react'

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: string
  action?: { link: string; label: string }
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()

  // Do not display chatbot on the home page
  if (location.pathname === '/') {
    return null
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'bot',
      text: '👋 Bonjour ! Je suis votre assistant virtuel. Je peux vous informer sur le **trafic en direct**, les **mangas populaires**, la **facturation**, ou vous guider dans l\'administration.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (customQuery?: string) => {
    const questionText = customQuery || input
    if (!questionText.trim() || loading) return

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: questionText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    if (!customQuery) setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify({ question: questionText.trim() }),
      })
      const data = await res.json()

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Désolé, je n\'ai pas pu traiter votre demande.',
        action: data.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: 'Une erreur de communication est survenue. Veuillez réessayer.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    { label: '📊 Trafic Live', query: 'Quel est le trafic en direct ?' },
    { label: '📖 Top Mangas', query: 'Quels sont les mangas les plus lus ?' },
    { label: '💳 Factures', query: 'Combien de factures en attente ?' },
    { label: '🛠️ Aide Admin', query: 'Quels sont les outils administrateur ?' },
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* ── CHAT WINDOW ── */}
      {isOpen && (
        <div
          className={`bg-card text-foreground border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 mb-3 animate-in fade-in slide-in-from-bottom-4 ${
            isExpanded
              ? 'w-[95vw] sm:w-[540px] h-[80vh] max-h-[700px]'
              : 'w-[90vw] sm:w-[380px] h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground grid place-items-center shadow-md">
                  <Bot size={18} />
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 border-2 border-card" />
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm text-foreground flex items-center gap-1.5">
                  Assistant <Sparkles size={13} className="text-amber-400 fill-amber-400" />
                </h4>
                <p className="text-[10px] text-muted-foreground font-semibold">En ligne · Données réelles</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
                title={isExpanded ? 'Réduire' : 'Agrandir'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
                title="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted/60 text-foreground border border-border/80 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.action && (
                    <div className="mt-2.5 pt-2 border-t border-border/40">
                      <Link
                        to={msg.action.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-card/80 text-foreground font-bold text-[11px] shadow-sm border border-border transition"
                      >
                        <span>{msg.action.label}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-mono mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="italic">L'assistant analyse les données...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(qp.query)}
                className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-[10px] font-bold text-foreground whitespace-nowrap shadow-sm transition shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 border-t border-border bg-card flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez une question sur le portail..."
              className="flex-1 h-9 px-3 rounded-xl border border-input bg-muted/20 text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground grid place-items-center disabled:opacity-40 transition shadow-md shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING LAUNCHER BUTTON ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 text-primary-foreground font-black text-xs shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
        aria-label="Ouvrir l'assistant IA"
      >
        <Bot size={20} className="animate-bounce" />
        <span className="hidden sm:inline font-headline tracking-wide">Assistant</span>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
      </button>
    </div>
  )
}
