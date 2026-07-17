
import React from 'react';
import { ImportRow } from '../schemas/importSchema';
import { ImportSummary } from '../types';
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

interface ImportPreviewProps {
    data: ImportRow[];
    summary: ImportSummary | null;
    onConfirm: () => void;
    onBack: () => void;
}

const ImportPreview: React.FC<ImportPreviewProps> = ({ data, summary, onConfirm, onBack }) => {
    if (!summary) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
                    <p className="text-sm text-muted-foreground">Gerações</p>
                    <p className="text-2xl font-bold text-foreground">{summary.totalGenerations}</p>
                    <p className="text-xs text-green-600 mt-1">
                        {summary.newGenerations.length} novas, {summary.existingGenerations.length} existentes
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
                    <p className="text-sm text-muted-foreground">Células</p>
                    <p className="text-2xl font-bold text-foreground">{summary.totalCells}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
                    <p className="text-sm text-muted-foreground">Líderes</p>
                    <p className="text-2xl font-bold text-foreground">{summary.totalLeaders}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {summary.existingEmailsInDb.length > 0 ? `${summary.existingEmailsInDb.length} já existem (serão pulados)` : 'Todos novos'}
                    </p>
                </div>
            </div>

            {/* Warnings */}
            {summary.existingEmailsInDb.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3 text-yellow-800 border border-yellow-100">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-sm">Atenção: Cadastros Duplicados</h4>
                        <p className="text-sm mt-1">
                            Encontramos {summary.existingEmailsInDb.length} emails que já estão cadastrados no sistema.
                            As linhas correspondentes a estes líderes <strong>não serão processadas</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Table Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/50">
                    <h3 className="font-semibold text-foreground">Pré-visualização dos Dados</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Geração</th>
                                <th className="px-4 py-2">Célula</th>
                                <th className="px-4 py-2">Líder</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.map((row, idx) => {
                                const exists = summary.existingEmailsInDb.includes(row.lider_email);
                                return (
                                    <tr key={idx} className={exists ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50'}>
                                        <td className="px-4 py-2">
                                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: row.cor_geracao }}></span>
                                            {row.geracao}
                                        </td>
                                        <td className="px-4 py-2">{row.celula}</td>
                                        <td className="px-4 py-2">{row.lider_nome}</td>
                                        <td className="px-4 py-2">{row.lider_email}</td>
                                        <td className="px-4 py-2">
                                            {exists ? (
                                                <span className="text-amber-600 text-xs font-semibold px-2 py-1 bg-amber-50 rounded-full">Existente</span>
                                            ) : (
                                                <span className="text-green-600 text-xs font-semibold px-2 py-1 bg-green-50 rounded-full">Novo</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-input text-foreground font-medium hover:bg-muted/50 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Voltar
                </button>
                <button
                    onClick={onConfirm}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <CheckCircle size={18} />
                    Confirmar e Processar
                </button>
            </div>
        </div>
    );
};

export default ImportPreview;
