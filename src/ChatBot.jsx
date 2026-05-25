import React, { useEffect, useRef, useState } from 'react'
import './ChatBot.css'

const SUGGESTED = [
  'What properties are available?',
  'How do I book a viewing?',
  'What areas do you cover?',
  'How does checkout work?',
]

const BotIcon = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <rect width="200" height="200" fill="#ffffff" rx="10"/>
    <polygon points="100,28 150,72 50,72" fill="#111111"/>
    <rect x="46" y="68" width="108" height="72" fill="#111111"/>
    <rect x="76" y="104" width="26" height="36" rx="2" fill="#ffffff"/>
    <rect x="54" y="80" width="20" height="16" rx="2" fill="#ffffff"/>
    <rect x="126" y="80" width="20" height="16" rx="2" fill="#ffffff"/>
    <rect x="124" y="20" width="9" height="30" fill="#111111"/>
  </svg>
)

const ThinkingDots = () => (
  <div className="cb-thinking">
    <span/><span/><span/>
  </div>
)

const uid = () => crypto.randomUUID()

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: uid(),
      role: 'assistant',
      text: "Hi! I'm Nawft 👋 Your NawftHomes assistant. Ask me anything about our properties, rentals, or how to book a viewing.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setError('')

    const userMsg = { id: uid(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.filter(m => m.role !== 'system')

      const res = await fetch('https://newboy-1.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')

      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: data.reply }])
    } catch (err) {
      setError('Something went wrong. Please try again or call 09027512008.')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showSuggested = messages.length === 1 && !loading

  return (
    <>
      {/* Floating button */}
      <button
        className={`cb-fab ${open ? 'cb-fab--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat assistant'}
        type="button"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <BotIcon />
        )}
        {!open && <span className="cb-fab-ping" aria-hidden/>}
      </button>

      {/* Chat panel */}
      <div className={`cb-panel ${open ? 'cb-panel--open' : ''}`} role="dialog" aria-label="NawftHomes chat assistant">
        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-avatar">
            <BotIcon />
          </div>
          <div className="cb-header-info">
            <p className="cb-header-name">Nawft</p>
            <p className="cb-header-sub">NawftHomes Assistant · Online</p>
          </div>
          <button className="cb-close" onClick={() => setOpen(false)} aria-label="Close" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`cb-msg cb-msg--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="cb-msg-avatar"><BotIcon /></div>
              )}
              <div className="cb-msg-bubble">
                {msg.text.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br/>}</span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="cb-msg cb-msg--assistant">
              <div className="cb-msg-avatar"><BotIcon /></div>
              <div className="cb-msg-bubble"><ThinkingDots /></div>
            </div>
          )}

          {error && (
            <div className="cb-error">{error}</div>
          )}

          {/* Suggested prompts */}
          {showSuggested && (
            <div className="cb-suggested">
              {SUGGESTED.map((s) => (
                <button key={s} className="cb-chip" type="button" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="cb-input-wrap">
          <textarea
            ref={inputRef}
            className="cb-input"
            rows={1}
            placeholder="Ask about properties, rentals, viewings…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="cb-send"
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="cb-footer-note">Powered by Claude · NawftHomes AI</p>
      </div>

      {/* Backdrop on mobile */}
      {open && <div className="cb-backdrop" onClick={() => setOpen(false)}/>}
    </>
  )
}