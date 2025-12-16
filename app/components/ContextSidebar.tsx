import { useState, useEffect } from 'react';
import { Trash2, Database, RefreshCw, ChevronLeft, ChevronRight, Home } from 'lucide-react';

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
    const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className={`${isCollapsed ? 'w-20' : 'w-72'} bg-[#111111] border-r border-[#222] flex flex-col h-full transition-all duration-300 ease-in-out`}>
            {/* Header / Home Button */}
            <div className="p-4 border-b border-[#222]">
                <button
                    onClick={() => onSelectContext('')}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'} bg-[#1F1F1F] hover:bg-[#252525] border border-[#333] hover:border-[#444] text-gray-200 p-3 rounded-xl transition-all shadow-sm`}
                    title="Home / New Ingestion"
                >
                    <Home size={18} className="text-blue-400" />
                    {!isCollapsed && <span className="font-medium text-sm">Home</span>}
                </button>
            </div>

            {/* Contexts List Header */}
            <div className={`px-4 mt-6 mb-2 flex items-center justify-between ${isCollapsed ? 'flex-col gap-4' : ''}`}>
                {!isCollapsed && (
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        Contexts
                    </h2>
                )}
                <button
                    onClick={fetchContexts}
                    className="text-gray-600 hover:text-gray-300 transition-colors"
                    title="Refresh List"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                {contexts.length === 0 && !loading && (
                    <div className="text-gray-600 text-xs text-center py-4">
                        {isCollapsed ? '...' : 'No contexts'}
                    </div>
                )}

                {contexts.map((ctx) => (
                    <div
                        key={ctx.name}
                        onClick={() => onSelectContext(ctx.name)}
                        className={`
                            group flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2.5 rounded-lg cursor-pointer transition-all border
                            ${selectedContext === ctx.name
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm'
                                : 'text-gray-400 border-transparent hover:bg-[#1A1A1A] hover:text-gray-200'}
                        `}
                        title={ctx.name}
                    >
                        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'w-auto' : 'flex-1'}`}>
                            <Database size={16} className={`shrink-0 ${selectedContext === ctx.name ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                            {!isCollapsed && (
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate text-sm font-medium">{ctx.name}</span>
                                    <span className="text-[10px] text-gray-600">{(ctx.size / 1024).toFixed(0)}KB</span>
                                </div>
                            )}
                        </div>

                        {!isCollapsed && (
                            <button
                                onClick={(e) => deleteContext(ctx.name, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded transition-all"
                                title="Delete Context"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer / Toggle */}
            <div className="p-4 border-t border-[#222] mt-auto mb-8">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1A1A1A] transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : (
                        <div className="flex items-center gap-2">
                            <ChevronLeft size={18} />
                            <span className="text-xs font-medium">Collapse Sidebar</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}
