
import React, { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ImportResult } from '../types';

interface ImportProgressProps {
    logs: string[];
    progress: number;
    onComplete?: (results: ImportResult[]) => void;
    // Note: onComplete logic is handled in the parent hook `useBulkImport` which changes the step automatically
    // but we might want callback for UI animations if needed.
}

const ImportProgress: React.FC<ImportProgressProps> = ({ logs, progress }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="max-w-2xl mx-auto text-center space-y-8 py-8">

            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Processando Importação</h2>
                <p className="text-slate-500">Por favor, não feche esta janela.</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                <div
                    className="bg-blue-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-sm font-medium text-blue-600">{progress}% Concluído</p>

            {/* Logs */}
            <div
                ref={scrollRef}
                className="bg-slate-900 rounded-xl p-4 h-64 overflow-y-auto text-left font-mono text-sm shadow-inner custom-scrollbar"
            >
                {logs.length === 0 && <span className="text-slate-500">Iniciando...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        {log.includes('❌') ? (
                            <span className="text-red-400">{log}</span>
                        ) : log.includes('✅') ? (
                            <span className="text-green-400">{log}</span>
                        ) : (
                            <span className="text-slate-300">{log}</span>
                        )}
                    </div>
                ))}
                <div className="flex items-center gap-2 text-slate-500 animate-pulse mt-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processando...</span>
                </div>
            </div>
        </div>
    );
};

export default ImportProgress;
