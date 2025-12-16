'use client';
import { useState, useRef, useEffect } from 'react';
import ContextSidebar from './components/ContextSidebar';
import { FolderUp, Send, Loader2, Bot, User, FileCode, Check, Copy, Terminal } from 'lucide-react';
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
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <ContextSidebar
        onSelectContext={handleSelectContext}
        selectedContext={selectedContext}
        refreshTrigger={refreshTrigger}
      />

      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
        <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 shrink-0">
          RepoLlama
        </h1>

        {/* --- INGESTION VIEW --- */}
        {!selectedContext && (
          <div className="flex-1 flex flex-col items-center justify-center -mt-20">
            <div className="w-full max-w-2xl bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <div className="p-3 bg-blue-900/30 rounded-lg">
                  <FolderUp className="text-blue-400" size={24} />
                </div>
                Ingest Repository
              </h2>

              <form onSubmit={handleIngest} className="flex flex-col gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Repository Path</label>
                    <input
                      type="text"
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      placeholder="C:\Projects\MyRepo"
                      className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Context Name (Optional)</label>
                    <input
                      type="text"
                      value={contextName}
                      onChange={(e) => setContextName(e.target.value)}
                      placeholder="My Project"
                      className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ingestLoading || !repoPath}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {ingestLoading ? <Loader2 className="animate-spin" /> : <FolderUp size={20} />}
                  {ingestLoading ? 'Ingesting...' : 'Start Ingestion'}
                </button>

                {ingestStatus && (
                  <div className={`p-3 rounded-lg text-sm text-center ${ingestStatus.includes('Error') ? 'bg-red-900/20 text-red-200' : 'bg-green-900/20 text-green-200'}`}>
                    {ingestStatus}
                  </div>
                )}
              </form>
            </div>

            <p className="mt-8 text-zinc-500 text-sm">Select an existing context from the sidebar or create a new one.</p>
          </div>
        )}

        {/* --- CHAT VIEW --- */}
        {selectedContext && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-2 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Context:</span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm font-medium border border-blue-800/50">
                  {selectedContext}
                </span>
              </div>
              <button
                onClick={() => setSelectedContext(null)}
                className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <FolderUp size={14} /> Change Context
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-6 px-4 pr-6 mb-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50 space-y-4">
                  <Bot size={64} strokeWidth={1} />
                  <p className="text-lg">Ask me anything about your code</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-700/30">
                      <Bot size={16} className="text-purple-300" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/20 text-blue-50'
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-100'
                    }`}>
                    <div className="text-zinc-100 text-sm leading-relaxed">
                      <ReactMarkdown components={{
                        code: CodeBlock,
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-blue-300 mt-6 mb-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-blue-200 mt-6 mb-3 border-b border-zinc-700 pb-2" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-base font-bold text-zinc-100 mt-4 mb-2" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 ml-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-zinc-300" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-4 text-zinc-300 leading-6 last:mb-0" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                      }}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources (if any) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1">
                          <FileCode size={12} /> Sources (Top Match)
                        </p>
                        <div className="bg-black/30 rounded p-2 text-xs font-mono text-zinc-500 truncate">
                          {msg.sources[0].source}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-700/30">
                      <User size={16} className="text-blue-300" />
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-purple-300" />
                  </div>
                  <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center gap-2">
                    <Loader2 className="animate-spin text-zinc-500" size={16} />
                    <span className="text-zinc-500 text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleChat} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-5 pr-14 py-4 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xl transition-all"
              />
              <button
                type="submit"
                disabled={chatLoading || !query}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:opacity-0 text-white p-2.5 rounded-lg transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
