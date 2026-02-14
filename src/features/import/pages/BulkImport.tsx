
import React, { useEffect } from 'react';
import { useBulkImport } from '../hooks/useBulkImport';
import CsvUploader from '../components/CsvUploader';
import ImportPreview from '../components/ImportPreview';
import ImportProgress from '../components/ImportProgress';
import ImportResultPage from '../components/ImportResult'; // Renamed export in component file
import { Upload, ChevronRight, FileText, Loader, CheckCircle } from 'lucide-react';

const BulkImport: React.FC = () => {
    const {
        step,
        handleFileUpload,
        rawData,
        setStep,
        summary,
        handleProcess,
        results,
        isProcessing,
        progress,
        logs,
        reset,
        errors,
    } = useBulkImport();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Importação em Massa</h1>
                <p className="text-slate-500">Importe gerações, células e líderes de uma vez via CSV.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between max-w-3xl mx-auto relative mb-12">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10" />

                <StepIndicator
                    current={step}
                    id="upload"
                    label="Upload"
                    icon={<Upload size={20} />}
                    order={1}
                />
                <StepIndicator
                    current={step}
                    id="preview"
                    label="Preview"
                    icon={<FileText size={20} />}
                    order={2}
                />
                <StepIndicator
                    current={step}
                    id="processing"
                    label="Processamento"
                    icon={<Loader size={20} />}
                    order={3}
                />
                <StepIndicator
                    current={step}
                    id="result"
                    label="Conclusão"
                    icon={<CheckCircle size={20} />}
                    order={4}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
                {step === 'upload' && (
                    <CsvUploader onFileSelected={handleFileUpload} />
                )}

                {step === 'preview' && (
                    <ImportPreview
                        data={rawData}
                        summary={summary}
                        onConfirm={handleProcess}
                        onBack={reset}
                    />
                )}

                {step === 'processing' && (
                    <ImportProgress
                        logs={logs}
                        progress={progress}
                    />
                )}

                {step === 'result' && (
                    <ImportResultPage
                        results={results}
                        onRetry={reset}
                    />
                )}
            </div>
        </div>
    );
};

// Helper Component for Stepper
const StepIndicator = ({ current, id, label, icon, order }: any) => {
    const steps = ['upload', 'preview', 'processing', 'result'];
    const currentIndex = steps.indexOf(current);
    const stepIndex = steps.indexOf(id);

    const status = stepIndex < currentIndex ? 'completed' : stepIndex === currentIndex ? 'active' : 'pending';

    return (
        <div className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={`
        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
        ${status === 'completed' ? 'bg-green-100 text-green-600' :
                    status === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}
      `}>
                {status === 'completed' ? <CheckCircle size={20} /> : icon}
            </div>
            <span className={`text-xs font-medium ${status === 'active' ? 'text-blue-700' : 'text-slate-500'}`}>
                {label}
            </span>
        </div>
    );
};

export default BulkImport;
