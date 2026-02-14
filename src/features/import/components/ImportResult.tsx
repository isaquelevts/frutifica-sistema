
import React from 'react';
import { Download, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ImportResult } from '../types';
import { exportResultsToCsv } from '../utils/csvExporter';

interface ImportResultProps {
    results: ImportResult[];
    onRetry: () => void;
}

const ImportResultPage: React.FC<ImportResultProps> = ({ results, onRetry }) => {
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const total = results.length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Banner Aviso Importante */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col sm:flex-row items-start gap-4">
                <div className="bg-amber-100 p-2 rounded-full shrink-0 text-amber-600">
                    <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-800">IMPORTANTE: Salve as credenciais agora!</h3>
                    <p className="text-amber-700 mt-1">
                        As senhas temporárias geradas <strong>não poderão ser recuperadas depois</strong>.
                        Baixe o arquivo CSV abaixo e compartilhe com os líderes com segurança.
                    </p>
                    <button
                        onClick={() => exportResultsToCsv(results)}
                        className="mt-4 flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition w-full sm:w-auto justify-center"
                    >
                        <Download size={18} />
                        Baixar Credenciais (CSV)
                    </button>
                </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-green-800 uppercase font-bold tracking-wide">Sucesso</p>
                        <p className="text-2xl font-bold text-green-900">{successCount} <span className="text-sm font-normal text-green-700">/ {total}</span></p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full text-red-600">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-red-800 uppercase font-bold tracking-wide">Erros</p>
                        <p className="text-2xl font-bold text-red-900">{errorCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Detalhamento da Importação</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Nome</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Senha Temp.</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Mensagem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((res, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{res.name}</td>
                                    <td className="px-4 py-2 text-slate-500">{res.email}</td>
                                    <td className="px-4 py-2 font-mono text-slate-600">
                                        {res.password ? (
                                            <span className="bg-slate-100 px-2 py-1 rounded select-all">{res.password}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        {res.status === 'success' ? (
                                            <span className="text-green-600 flex items-center gap-1 font-medium">
                                                <CheckCircle size={14} /> Sucesso
                                            </span>
                                        ) : (
                                            <span className="text-red-600 flex items-center gap-1 font-medium">
                                                <XCircle size={14} /> Erro
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 max-w-xs truncate" title={res.errorMessage}>
                                        {res.errorMessage || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-4 py-2 font-medium transition-colors"
                >
                    <RefreshCw size={18} />
                    Nova Importação
                </button>
            </div>
        </div>
    );
};

export default ImportResultPage;
