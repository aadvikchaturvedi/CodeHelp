'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import {
  ChevronRight, Send, Trash2, Copy, Check, Zap, MessageCircle,
  Paperclip, X, AlertTriangle, Sparkles, Wand2,
} from 'lucide-react'
import { useWorkspace } from '@/components/workspace-provider'
import { useFileSystem } from '@/context/FileSystemContext'

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const SUGGESTION_ACTIONS: { label: string; prompt: string }[] = [
  { label: 'Optimize', prompt: 'Optimize this code for performance and readability' },
  { label: 'Explain', prompt: 'Explain this code in detail' },
  { label: 'Find Bugs', prompt: 'Find potential bugs and issues in this code' },
  { label: 'Document', prompt: 'Add JSDoc comments and document this code' },
  { label: 'Refactor', prompt: 'Suggest a refactoring for this code' },
  { label: 'Test', prompt: 'Write unit tests for this code' },
]

export default function Chatbox() {
  const {
    chatMessages, addChatMessage, updateLastAssistantMessage,
    setMessageStatus, clearChat, isStreaming, setIsStreaming,
    attachedFile, setAttachedFile, demoMode,
  } = useWorkspace()

  const { tabs, activeTabId } = useFileSystem()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const [isOpen, setIsOpen] = useState(true)
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setIsOpen(p => !p) }
      if (isOpen && !isStreaming && inputRef.current && e.key === '/' && !input) { e.preventDefault(); inputRef.current.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, isStreaming, input])

  useEffect(() => {
    if (isOpen && inputRef.current && !isStreaming) inputRef.current.focus()
  }, [isOpen, isStreaming])

  useEffect(() => {
    const mm = (e: MouseEvent) => { if (isResizing) setPanelWidth(Math.max(320, Math.min(640, window.innerWidth - e.clientX))) }
    const mu = () => setIsResizing(false)
    if (isResizing) { window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) } }
  }, [isResizing])

  const handleAttachFile = useCallback(() => {
    if (!activeTab) { setAttachedFile(null); return }
    if (attachedFile && attachedFile.name === activeTab.name) { setAttachedFile(null); return }
    setAttachedFile({ name: activeTab.name, content: activeTab.content, language: activeTab.language })
  }, [activeTab, attachedFile, setAttachedFile])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsgId = `msg-${Date.now()}`
    addChatMessage({ id: userMsgId, role: 'user', content: text, status: 'done', timestamp: Date.now() })
    setInput('')
    setIsStreaming(true)

    const assistantMsgId = `msg-${Date.now()}-ai`
    addChatMessage({ id: assistantMsgId, role: 'assistant', content: '', status: 'streaming', timestamp: Date.now() })

    const previousMessages = chatMessages.filter((m) => m.status === 'done').map((m) => ({ role: m.role, content: m.content }))

    if (demoMode) {
      const demos = [
        "Here's what I'd suggest for this code:\n\n```typescript\nconst optimized = data\n  .filter(Boolean)\n  .map((x) => x.value)\n  .reduce((acc, v) => acc + v, 0);\n```\n\nThis chains operations efficiently. Want me to explain each step?",
        "I can see a potential improvement here. Consider:\n\n```typescript\n// Instead of multiple if-else\nconst handler: Record<string, () => void> = {\n  add: handleAdd,\n  remove: handleRemove,\n  update: handleUpdate,\n};\nhandler[action]?.();\n```\n\nCleaner dispatch pattern!",
        "Here's a more robust approach:\n\n```typescript\nasync function fetchWithRetry<T>(\n  url: string,\n  retries = 3\n): Promise<T> {\n  for (let i = 0; i < retries; i++) {\n    try {\n      return await fetch(url).then(r => r.json());\n    } catch (err) {\n      if (i === retries - 1) throw err;\n      await new Promise(r => setTimeout(r, 1000 * 2 ** i));\n    }\n  }\n  throw new Error('Unreachable');\n}\n```\n\nExponential backoff built in!",
      ]
      const full = demos[Math.floor(Math.random() * demos.length)]
      let idx = 0
      const interval = setInterval(() => {
        idx += 2
        if (idx >= full.length) { clearInterval(interval); updateLastAssistantMessage(full); setMessageStatus(assistantMsgId, 'done'); setIsStreaming(false) }
        else updateLastAssistantMessage(full.slice(0, idx))
      }, 20)
      return
    }

    try {
      const controller = new AbortController()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...previousMessages, { role: 'user', content: text }],
          currentOpenFile: activeTab?.name,
          currentCodeSnippet: attachedFile?.content || activeTab?.content,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        const errMsg = errBody?.error?.message ?? `Request failed (${res.status})`
        updateLastAssistantMessage(`⚡ ${errMsg}`)
        setMessageStatus(assistantMsgId, 'error')
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = '', accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.type === 'text') { accumulated += parsed.content; updateLastAssistantMessage(accumulated) }
            } catch {}
          }
        }
      }
      setMessageStatus(assistantMsgId, 'done')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      updateLastAssistantMessage(`⚠️ ${err instanceof Error ? err.message : 'Connection failed'}`)
      setMessageStatus(assistantMsgId, 'error')
    } finally { setIsStreaming(false) }
  }, [input, isStreaming, chatMessages, demoMode, attachedFile, activeTab, addChatMessage, updateLastAssistantMessage, setMessageStatus, setIsStreaming])

  const handleSendMessage = useCallback(() => sendMessage(input), [sendMessage, input])

  const handleQuickAction = useCallback((prompt: string) => {
    const context = activeTab?.content
    const fullPrompt = context ? `${prompt}\n\nHere's my code:\n\`\`\`${activeTab?.language ?? ''}\n${context.slice(0, 2000)}\n\`\`\`` : prompt
    setShowSuggestions(false)
    sendMessage(fullPrompt)
  }, [activeTab, sendMessage])

  const handleCopyCode = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(`copy-${Date.now()}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearChat = () => {
    if (chatMessages.length === 0) return
    if (window.confirm('Clear chat history?')) { clearChat(); setInput('') }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const inputTokens = estimateTokens(input)
  const charCount = input.length

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40
            bg-gradient-to-r from-amber-500/15 to-amber-600/10
            hover:from-amber-500/25 hover:to-amber-600/20
            border border-amber-500/20 hover:border-amber-500/50
            rounded-l-2xl p-3 transition-all duration-500 group
            shadow-[0_0_30px_rgba(217,119,6,0.05)]
            hover:shadow-[0_0_50px_rgba(217,119,6,0.15)]"
        >
          <MessageCircle className="w-6 h-6 text-amber-400 group-hover:text-amber-300 transition-all duration-300 group-hover:scale-110" />
        </button>
      )}

      <div
        className={`fixed right-0 top-0 bottom-0 flex flex-col transition-all duration-500 ease-out z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: isOpen ? `${panelWidth}px` : '0px' }}
      >
        {/* Ambient glow border */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/0 via-amber-500/30 to-amber-500/0" />
        </div>

        {/* Glass panel background */}
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl" />

        {isOpen && (
          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute left-0 top-0 bottom-0 w-1 z-10
              hover:bg-amber-500/40 cursor-col-resize transition-colors duration-300
              group"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full
              bg-amber-500/0 group-hover:bg-amber-500/50 transition-all duration-300" />
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 shrink-0
          bg-gradient-to-r from-zinc-900/60 to-zinc-900/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10
              shadow-[0_0_15px_rgba(217,119,6,0.1)]">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                CodeHelp AI
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500
                  ${isStreaming
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
                    : demoMode
                      ? 'bg-amber-600 shadow-[0_0_6px_rgba(217,119,6,0.3)]'
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                  }`}
                  style={isStreaming ? { animationDuration: '0.8s' } : undefined}
                />
                <span className="text-[10px] text-zinc-500">
                  {isStreaming ? 'Generating' : demoMode ? 'Demo' : 'Online'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowSuggestions(p => !p)}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-amber-400 transition-all"
              title="Quick Actions"
            >
              <Wand2 size={15} />
            </button>
            <button
              onClick={handleClearChat}
              disabled={chatMessages.length === 0 || isStreaming}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Quick Action Suggestions */}
        {showSuggestions && (
          <div className="relative z-10 px-3 py-3 border-b border-zinc-800/40 bg-zinc-900/40 animate-in slide-in-from-top-2 duration-300">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-400" />
              Quick Actions
              {activeTab?.name && <span className="text-zinc-700 normal-case tracking-normal">· {activeTab.name}</span>}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SUGGESTION_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isStreaming}
                  className="group px-2.5 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30
                    hover:border-amber-500/30 hover:bg-zinc-800/70
                    transition-all duration-200 text-left disabled:opacity-50"
                >
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-amber-300 transition-colors">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Demo mode banner */}
        {demoMode && (
          <div className="relative z-10 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-500/10 flex items-center gap-2 text-xs text-amber-400/80 shrink-0">
            <Sparkles size={12} />
            <span>Demo mode — <span className="text-amber-300">Ollama</span> not connected</span>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
          {chatMessages.length === 0 ? (
            <EmptyState
              onSelectPrompt={(p) => { setInput(p); inputRef.current?.focus() }}
              onQuickAction={(p) => handleQuickAction(p)}
              activeFileName={activeTab?.name}
            />
          ) : (
            chatMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopyCode={handleCopyCode}
                isCopied={copiedId === `copy-${message.id}`}
              />
            ))
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 pl-1">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-zinc-600">Generating response...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="relative z-10 border-t border-zinc-800/40 bg-gradient-to-t from-zinc-900/60 to-transparent p-3 space-y-2 shrink-0">
          {attachedFile && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
              bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-xs
              animate-in slide-in-from-bottom-2 duration-200">
              <Paperclip size={11} className="text-amber-400 shrink-0" />
              <span className="text-zinc-300 truncate flex-1">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"><X size={11} /></button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.currentTarget.value)
                  e.currentTarget.style.height = 'auto'
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI anything about your code..."
                disabled={isStreaming}
                rows={2}
                className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-xl px-3 py-2.5
                  text-sm text-zinc-100 placeholder-zinc-600 resize-none
                  focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20
                  transition-all duration-300 disabled:opacity-50 max-h-[120px]
                  shadow-[0_0_20px_rgba(217,119,6,0.03)]"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 p-2.5 rounded-xl
                bg-gradient-to-br from-amber-500 to-amber-600
                hover:from-amber-400 hover:to-amber-500
                text-black font-semibold
                transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-[0_0_20px_rgba(217,119,6,0.15)]
                hover:shadow-[0_0_30px_rgba(217,119,6,0.3)]
                active:scale-95 h-10 w-10 flex items-center justify-center"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-600">
            <button
              onClick={handleAttachFile}
              disabled={!activeTab || isStreaming}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200
                ${attachedFile ? 'bg-amber-500/15 text-amber-400' : 'hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Paperclip size={11} />
              <span>{attachedFile ? 'Attached' : 'Attach'}</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{charCount}c · ≈{inputTokens}t</span>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/50 rounded text-[9px] text-zinc-600">↵</kbd>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/10 z-40 backdrop-blur-sm lg:hidden" />
      )}
    </>
  )
}

function MessageBubble({ message, onCopyCode, isCopied }: {
  message: { id: string; role: string; content: string; status: string; timestamp: number }
  onCopyCode: (c: string) => void
  isCopied: boolean
}) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 fade-in duration-200`}>
      <div className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl text-sm transition-all duration-200
        ${isUser
          ? 'bg-gradient-to-br from-amber-500/15 to-amber-600/10 border border-amber-500/20 text-amber-50'
          : isError
            ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 text-red-300'
            : 'bg-zinc-800/30 border border-zinc-700/30 text-zinc-200 shadow-[0_0_20px_rgba(0,0,0,0.1)]'
        }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight, rehypeSanitize]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className ?? '')
                  if (match) return <code className={className} {...props}>{children}</code>
                  return <code className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-xs text-amber-300/90" {...props}>{children}</code>
                },
                pre({ children }) {
                  return (
                    <div className="group relative my-3 bg-zinc-950/80 border border-zinc-800 rounded-xl overflow-hidden
                      shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all duration-200
                      hover:border-zinc-700/60">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-mono">&lt;/&gt;</span>
                        <button
                          onClick={() => onCopyCode(extractTextContent(children))}
                          className="p-1 rounded-md hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-200 transition-all"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="p-3 text-xs overflow-x-auto"><code>{children}</code></pre>
                    </div>
                  )
                },
                p({ children }) { return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p> },
                ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1 text-sm">{children}</ul> },
                ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm">{children}</ol> },
                strong({ children }) { return <strong className="font-semibold text-zinc-100">{children}</strong> },
              }}
            >
              {message.content || ''}
            </ReactMarkdown>
            {isStreaming && message.content && (
              <span className="inline-block w-2 h-4 rounded-sm bg-amber-400 ml-0.5 align-text-bottom animate-pulse" style={{ animationDuration: '0.6s' }} />
            )}
            {isStreaming && !message.content && (
              <span className="text-zinc-600 italic text-xs flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                Thinking
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-zinc-600">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          {isError && <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle size={10} />Failed</span>}
        </div>
      </div>
    </div>
  )
}

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractTextContent).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractTextContent((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

function EmptyState({ onSelectPrompt, onQuickAction, activeFileName }: {
  onSelectPrompt: (p: string) => void
  onQuickAction: (p: string) => void
  activeFileName?: string
}) {
  const suggestions = [
    { icon: '✨', text: 'Explain this code', desc: 'Get AI analysis of your code', prompt: 'Explain this code in detail' },
    { icon: '⚡', text: 'Optimize', desc: 'Performance improvements', prompt: 'Optimize this code for performance' },
    { icon: '🐛', text: 'Find Bugs', desc: 'Debug and fix issues', prompt: 'Find potential bugs in this code' },
    { icon: '📝', text: 'Document', desc: 'Add comments and docs', prompt: 'Add documentation to this code' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5
        border border-amber-500/20 shadow-[0_0_30px_rgba(217,119,6,0.08)]">
        <Zap className="w-7 h-7 text-amber-400" />
      </div>

      <div className="text-center space-y-1.5">
        <h3 className="text-sm font-semibold text-zinc-100">CodeHelp AI</h3>
        <p className="text-xs text-zinc-600 max-w-[220px] mx-auto leading-relaxed">
          {activeFileName
            ? `Ask me anything about ${activeFileName}`
            : 'Open a file and ask me to explain, optimize, or debug your code'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full px-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => { onSelectPrompt(s.text); if (activeFileName) onQuickAction(s.prompt) }}
            className="group px-3 py-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/30
              hover:border-amber-500/30 hover:bg-zinc-800/50
              transition-all duration-200 text-left
              hover:shadow-[0_0_20px_rgba(217,119,6,0.05)]"
          >
            <p className="text-base mb-0.5">{s.icon}</p>
            <p className="text-xs font-medium text-zinc-200 group-hover:text-amber-300 transition-colors">{s.text}</p>
            <p className="text-[10px] text-zinc-600 group-hover:text-zinc-500">{s.desc}</p>
          </button>
        ))}
      </div>

      <div className="text-center mt-2">
        <p className="text-[10px] text-zinc-700">
          <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/50 rounded text-xs mx-0.5">⌘B</kbd> toggle ·
          <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700/50 rounded text-xs mx-0.5">/</kbd> focus
        </p>
      </div>
    </div>
  )
}
