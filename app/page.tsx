'use client';
import { useState } from 'react';
import ContextSidebar from './components/ContextSidebar';
import { FolderUp, Search, Loader2 } from 'lucide-react';

export default function Home() {
  const [repoPath, setRepoPath] = useState('');
  const [contextName, setContextName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger sidebar refresh
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Clear search on context switch
  const handleSelectContext = (ctx: string) => {
    setSelectedContext(ctx);
    setResults([]);
    setQuery('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !selectedContext) return;

    setSearchLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, contextName: selectedContext }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    setLoading(true);
    setStatus('Ingesting repository... this might take a while.');

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: repoPath,
          name: contextName
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(`Success! Processed ${data.filesProcessed} files.`);
        setRepoPath('');
        setContextName('');
        setRefreshTrigger(prev => prev + 1); // Refresh sidebar
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <ContextSidebar
        onSelectContext={handleSelectContext}
        selectedContext={selectedContext}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          RepoLlama
        </h1>

        {/* Ingestion Section */}
        <section className="mb-12 p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FolderUp className="text-blue-400" />
            Ingest Repository
          </h2>

          <form onSubmit={handleIngest} className="flex flex-col gap-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="Absolute path to local repository (e.g. C:\Projects\MyRepo)"
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <input
                type="text"
                value={contextName}
                onChange={(e) => setContextName(e.target.value)}
                placeholder="Context Name (Optional)"
                className="w-64 bg-black border border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !repoPath}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FolderUp size={20} />}
              {loading ? 'Ingesting...' : 'Ingest Repository'}
            </button>
          </form>

          {status && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${status.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
              {status}
            </div>
          )}
        </section>

        {/* Search Section */}
        {selectedContext && (
          <section className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Search in:</h2>
              <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium border border-blue-800">
                {selectedContext}
              </span>
            </div>

            <form onSubmit={handleSearch} className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your codebase..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-lg transition-all"
              />
              <button
                type="submit"
                disabled={searchLoading || !query}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:opacity-0 text-white rounded-lg px-4 py-2 transition-all"
              >
                {searchLoading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
              </button>
            </form>

            {/* Results */}
            <div className="space-y-6 pb-8">
              {results.map((result, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-700 transition-colors">
                  <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                    <span className="font-mono text-sm text-blue-400 truncate max-w-[80%]">
                      {result.source.replace(/^.*[\\\/]/, '')}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Match: {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm text-zinc-300 bg-black/20">
                    <code>{result.text}</code>
                  </pre>
                  <div className="px-4 py-2 bg-zinc-950/30 border-t border-zinc-800 text-xs text-zinc-500 truncate">
                    {result.source}
                  </div>
                </div>
              ))}

              {results.length === 0 && !searchLoading && query && (
                <div className="text-center text-zinc-500 italic mt-12">
                  No results found. Try a different query.
                </div>
              )}
            </div>
          </section>
        )}

        {!selectedContext && (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Search size={48} className="opacity-20" />
            <p>Select a context from the sidebar to start searching.</p>
          </div>
        )}

      </main>
    </div>
  );
}
