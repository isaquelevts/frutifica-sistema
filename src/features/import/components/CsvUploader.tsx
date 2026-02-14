
import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface CsvUploaderProps {
    onFileSelected: (file: File) => void;
    // If we want to display external errors from the hook, we could accept an error prop
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onFileSelected }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Por favor, selecione um arquivo CSV válido.');
            return;
        }
        setError(null);
        onFileSelected(file);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const downloadTemplate = () => {
        const csvContent = "geracao,cor_geracao,celula,dia_semana,horario,endereco,publico_alvo,lider_nome,lider_email,lider_telefone,senha\nGeração Fé,#3B82F6,Célula Centro,Segunda,19:30,Rua A 123,Jovens,João Silva,joao@email.com,11999990001,\nGeração Fé,#3B82F6,Célula Norte,Terça,20:00,Rua B 456,Casais,Maria Santos,maria@email.com,11999990002,SenhaCustom123";
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modelo_importacao.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className={`
          border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
        `}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Upload size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">Clique para selecionar ou arraste um arquivo CSV</h3>
                        <p className="text-sm text-slate-500 mt-1">O arquivo deve seguir o modelo padrão</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Since errors are handled in hook and showed in parent or separate state, 
          we need to make sure we display validation errors if they come back.
          Using a separate error display in BulkImport page for validation errors.
       */}

            <div className="mt-8 flex justify-center">
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
                >
                    <FileText size={18} />
                    Baixar modelo CSV
                </button>
            </div>
        </div>
    );
};

export default CsvUploader;
