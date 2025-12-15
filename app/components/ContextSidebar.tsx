'use client';
import { useState, useEffect } from 'react';
import { Trash2, Database, RefreshCw } from 'lucide-react';

type Context = {
    name: string;
    fileName: string;
    size: number;
    createdAt: string;
};

interface ContextSidebarProps {
    onSelectContext: (name: string) => void;
    selectedContext: string | null;
    refreshTrigger: number; // Prop to trigger refresh from parent
}

export default function ContextSidebar({ onSelectContext, selectedContext, refreshTrigger }: ContextSidebarProps) {
    const [contexts, setContexts] = useState<Context[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch contexts
    const fetchContexts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/contexts');
            if (res.ok) {
                const data = await res.json();
                setContexts(data);
            }
        } catch (error) {
            console.error('Failed to fetch contexts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContexts();
    }, [refreshTrigger]);

    // Delete context
    const deleteContext = async (name: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selection
        if (!confirm(`Are you sure you want to delete context "${name}"?`)) return;

        try {
            const res = await fetch('/api/contexts', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                fetchContexts();
                if (selectedContext === name) {
                    onSelectContext('');
                }
            }
        } catch (error) {
            console.error('Failed to delete context', error);
        }
    };

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database size={20} />
                    Contexts
                </h2>
                <button
                    onClick={fetchContexts}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                    title="Refresh List"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {contexts.length === 0 && !loading && (
                    <div className="text-gray-500 text-sm italic text-center py-4">
                        No contexts found.<br />Ingest a repo to get started.
                    </div>
                )}

                {contexts.map((ctx) => (
                    <div
                        key={ctx.name}
                        onClick={() => onSelectContext(ctx.name)}
                        className={`
              group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
              ${selectedContext === ctx.name
                                ? 'bg-blue-600/20 border border-blue-500/50 text-blue-200'
                                : 'bg-gray-800/50 border border-transparent hover:bg-gray-800 text-gray-300'}
            `}
                    >
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium truncate" title={ctx.name}>
                                {ctx.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                {(ctx.size / 1024).toFixed(1)} KB
                            </span>
                        </div>

                        <button
                            onClick={(e) => deleteContext(ctx.name, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-all"
                            title="Delete Context"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
