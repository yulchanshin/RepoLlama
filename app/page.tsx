'use client';
import { useState, useRef, useEffect } from 'react';
import ContextSidebar from './components/ContextSidebar';
import { FolderUp, Send, Loader2, Bot, User, FileCode, Check, Copy, Terminal, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: { source: string; text: string }[];
};

// Custom Code Block Component
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If inline is true, or if content is short (<= 3 lines), render as simple inline-style block
  // This keeps the chat clean for short snippets.
  const lineCount = codeText.split(/\r\n|\r|\n/).length;
  const isShortBlock = lineCount <= 3;

  if (inline || isShortBlock) {
    return (
      <code className="bg-zinc-800 text-pink-300 px-1.5 py-0.5 rounded text-sm font-mono break-words whitespace-pre-wrap" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-zinc-800 bg-[#1e1e1e] group font-mono text-sm shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-bold flex items-center gap-2 uppercase tracking-wider">
          <Terminal size={12} />
          {match ? match[1] : 'Code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto bg-[#1e1e1e] text-zinc-300">
        <code className={className} {...props}>{children}</code>
      </div>
    </div>
  );
};


export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Ingestion State
  const [repoPath, setRepoPath] = useState('');
  const [contextName, setContextName] = useState('');
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  // Chat/Search State
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectContext = (ctx: string) => {
    setSelectedContext(ctx);
    setMessages([]); // Clear chat on switch
    setQuery('');
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    setIngestLoading(true);
    setIngestStatus('Ingesting repository... this might take a while.');

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: repoPath, name: contextName }),
      });

      const data = await res.json();
      if (res.ok) {
        setIngestStatus(`Success! Processed ${data.filesProcessed} files.`);
        setRepoPath('');
        setContextName('');
        setRefreshTrigger(prev => prev + 1);
      } else {
        setIngestStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setIngestStatus('Failed to connect to server.');
    } finally {
      setIngestLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !selectedContext || chatLoading) return;

    const userMessage = query;
    setQuery('');

    // Optimistic update
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          contextName: selectedContext
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to fetch');

      // 1. Get Sources from header
      const sourcesHeader = res.headers.get('x-sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];

      // 2. Initialize Assistant Message
      // We rely on a local variable to accumulate the text to prevent duplication bugs
      // caused by React strict mode double-invocations or race conditions in sequential updates.
      let accumulatedResponse = "";

      setMessages(prev => [...prev, { role: 'assistant', content: '', sources }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });

        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              accumulatedResponse += json.response;

              // Update the last message with the AUTHENTIC accumulated text
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastIndex = newMsgs.length - 1;
                if (lastIndex >= 0 && newMsgs[lastIndex].role === 'assistant') {
                  newMsgs[lastIndex] = {
                    ...newMsgs[lastIndex],
                    content: accumulatedResponse
                  };
                }
                return newMsgs;
              });
            }
          } catch (e) {
            // Partial JSON, skip
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, verification failed or model error.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-blue-500/30">
      <ContextSidebar
        onSelectContext={handleSelectContext}
        selectedContext={selectedContext}
        refreshTrigger={refreshTrigger}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#050505]">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>

        {/* --- INGESTION VIEW --- */}
        {!selectedContext && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">

            <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight">
              RepoLlama
            </h1>

            <div className="w-full max-w-lg bg-[#0A0A0A] p-8 rounded-2xl border border-[#222] shadow-2xl shadow-black/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner">
                  <FolderUp className="text-blue-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Ingest Repository</h2>
                  <p className="text-sm text-gray-500">Import a local codebase to get started.</p>
                </div>
              </div>

              <form onSubmit={handleIngest} className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Repository Path</label>
                    <input
                      type="text"
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      placeholder="e.g. C:\Projects\MyRepo"
                      className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-gray-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700 hover:border-[#333]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Context Name <span className="text-gray-600 normal-case tracking-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={contextName}
                      onChange={(e) => setContextName(e.target.value)}
                      placeholder="e.g. Finance App"
                      className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3.5 text-sm text-gray-200 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-700 hover:border-[#333]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ingestLoading || !repoPath}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-900/20 border border-blue-500/20"
                >
                  {ingestLoading ? <Loader2 className="animate-spin" /> : <FolderUp size={18} />}
                  {ingestLoading ? 'Ingesting...' : 'Start Ingestion'}
                </button>

                {ingestStatus && (
                  <div className={`p-4 rounded-xl text-sm border flex items-center justify-center gap-2 ${ingestStatus.includes('Error')
                    ? 'bg-red-500/5 border-red-500/20 text-red-400'
                    : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
                    {ingestStatus.includes('Error') ? null : <Check size={16} />}
                    {ingestStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* --- CHAT VIEW --- */}
        {selectedContext && (
          <div className="flex-1 flex flex-col min-h-0 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 border-b border-[#222] bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/5">
                  <Database size={16} className="text-gray-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-200 leading-tight">{selectedContext}</h2>
                  <p className="text-[11px] text-gray-500 font-mono">Active Context</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContext(null)}
                className="text-xs text-gray-500 hover:text-gray-200 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#1A1A1A]"
              >
                <FolderUp size={14} /> Change Context
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-8 px-6 py-8 custom-scrollbar scroll-smooth">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                  <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center shadow-xl">
                    <Bot size={32} strokeWidth={1.5} className="text-gray-500" />
                  </div>
                  <p className="text-sm font-medium">RepoLlama is ready.</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-4xl mx-auto`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#151515] border border-[#222] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Bot size={16} className="text-purple-400" />
                    </div>
                  )}

                  <div className={`
                    max-w-[85%] rounded-2xl p-6 shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-[#111] border border-[#222] text-gray-100' // Minimalist User Bubble
                      : 'bg-transparent text-gray-300 pl-0 pt-1'} // Transparent Assistant Bubble
                  `}>
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown components={{
                        code: CodeBlock,
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-gray-100 mt-6 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-gray-200 mt-8 mb-4 flex items-center gap-2" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-gray-100 mt-6 mb-3" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-outside space-y-2 mb-4 ml-4 text-gray-400 marker:text-gray-600" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-outside space-y-2 mb-4 ml-4 text-gray-400 marker:text-gray-600" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-gray-300" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-blue-500/50 pl-4 italic text-gray-500 my-4" {...props} />,
                      }}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-[#222] flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <FileCode size={12} /> Sources
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.slice(0, 3).map((src, i) => (
                            <span key={i} className="text-[11px] bg-[#111] border border-[#222] px-2 py-1 rounded-md text-gray-400 font-mono truncate max-w-[200px]">
                              {src.source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-5 max-w-4xl mx-auto">
                  <div className="w-8 h-8 rounded-lg bg-[#151515] border border-[#222] flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-purple-400" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 max-w-4xl mx-auto w-full">
              <form onSubmit={handleChat} className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-2xl pl-6 pr-14 py-4 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none shadow-2xl transition-all placeholder:text-gray-600 text-gray-200 group-hover:border-[#333]"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !query}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-200 disabled:opacity-0 disabled:scale-95 text-black p-2.5 rounded-xl transition-all duration-200 shadow-lg"
                >
                  <Send size={18} strokeWidth={2} className="-ml-0.5 mt-0.5" />
                </button>
              </form>
              <div className="text-center mt-3">
                <p className="text-[10px] text-gray-600">AI can make mistakes. Verify important code.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
