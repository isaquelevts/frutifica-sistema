
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImportRow } from '../schemas/importSchema';
import { ImportResult, ImportStep, ImportSummary, ValidationError } from '../types';
import { importService } from '../services/importService';
import { generateTemporaryPassword } from '../utils/passwordGenerator';
import { useAuth } from '../../../core/auth/AuthContext';
import { parseCsv } from '../utils/csvParser';
import { z } from 'zod';

export function useBulkImport() {
    const [step, setStep] = useState<ImportStep>('upload');
    const [rawData, setRawData] = useState<ImportRow[]>([]);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const { organization } = useAuth();
    const queryClient = useQueryClient();

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleFileUpload = async (file: File) => {
        try {
            const { data, errors: validationErrors } = await parseCsv(file);

            if (validationErrors.length > 0) {
                setErrors(validationErrors);
                return;
            }

            setRawData(data);
            setErrors([]);

            // Calculate Summary
            const generations = new Set(data.map(r => r.geracao));
            const cells = new Set(data.map(r => r.celula));
            const leaders = new Set(data.map(r => r.lider_email));

            // Fetch existing data for preview
            if (organization?.id) {
                const existingEmails = await importService.fetchExistingEmails(organization.id, Array.from(leaders));
                const existingGenerations = await importService.fetchExistingGenerations(organization.id);

                const existingGenNames = existingGenerations.map(g => g.name);
                const newGens = Array.from(generations).filter(g => !existingGenNames.includes(g));

                setSummary({
                    totalGenerations: generations.size,
                    totalCells: cells.size,
                    totalLeaders: leaders.size,
                    newGenerations: newGens,
                    existingGenerations: Array.from(generations).filter(g => existingGenNames.includes(g)),
                    duplicateEmails: [], // Handled in parser
                    existingEmailsInDb: existingEmails
                });
            }

            setStep('preview');
        } catch (err: any) {
            setErrors([{ row: 0, column: 'Arquivo', message: err.message || 'Erro ao processar arquivo' }]);
        }
    };

    const handleProcess = async () => {
        if (!organization?.id || !summary) return;

        setStep('processing');
        setIsProcessing(true);
        setResults([]);
        setLogs([]);
        setProgress(0);

        const totalSteps = 4; // 1. Generations, 2. Leaders, 3. Cells, 4. Link
        let currentProgress = 0;

        try {
            // 1. Create Generations
            addLog('Verificando e criando gerações...');
            const generationsToCreate = summary.newGenerations.map(genName => {
                const row = rawData.find(r => r.geracao === genName);
                return { name: genName, color: row?.cor_geracao || '#6B7280' };
            });

            const createdGens = await importService.createGenerations(organization.id, generationsToCreate);
            const existingGens = await importService.fetchExistingGenerations(organization.id);

            // Create map: Name -> ID
            const generationMap = new Map<string, string>();
            existingGens.forEach(g => generationMap.set(g.name, g.id));
            createdGens.forEach(g => generationMap.set(g.name, g.id));

            createdGens.forEach(g => addLog(`✅ Geração '${g.name}' criada`));

            currentProgress += 25;
            setProgress(currentProgress);

            // 2. Create Leaders
            addLog('Criando contas de líderes...');
            // Filter out existing emails
            const DEFAULT_PASSWORD = 'ibnc@2026'; // Senha padrão caso não seja especificada no CSV

            const leadersToCreate = rawData
                .filter(r => !summary.existingEmailsInDb.includes(r.lider_email))
                .map(r => ({
                    name: r.lider_nome,
                    email: r.lider_email,
                    password: r.senha && r.senha.trim() !== '' ? r.senha : DEFAULT_PASSWORD,
                    phone: r.lider_telefone
                }));

            // Unique leaders only (though parser checks duplicates, just to be safe)
            const uniqueLeaders = Array.from(new Map(leadersToCreate.map(item => [item.email, item])).values()) as { name: string; email: string; password?: string; phone?: string }[];
            const leaderResults = await importService.createLeaderAccounts(uniqueLeaders); // Calls Edge Function

            leaderResults.forEach(res => {
                if (res.status === 'success') {
                    addLog(`✅ Conta criada para ${res.email}`);
                } else {
                    addLog(`❌ Erro ao criar conta para ${res.email}: ${res.error}`);
                }
            });

            currentProgress += 25;
            setProgress(currentProgress);

            const leaderMap = new Map<string, string>(); // Email -> UserID
            leaderResults.filter(r => r.status === 'success').forEach(r => leaderMap.set(r.email, r.user_id));

            // 3. Create Cells
            addLog('Criando células...');
            const cellsToCreate: any[] = [];
            const leaderLinks: { cellId: string, leaderId: string }[] = [];
            const finalResults: ImportResult[] = [];

            for (const row of rawData) {
                // Skip if leader creation failed or exists (for now we skip linkage if leader exists? User implied existing emails are skipped entirely)
                // If email exists, we can't create account, so we can't link effectively unless we fetch the ID.
                // Assuming skipped leaders mean skipped rows for now OR we fetch their IDs? 
                // User prompt: "Emails que já existem no banco... será PULADO". So we skip row.

                if (summary.existingEmailsInDb.includes(row.lider_email)) {
                    finalResults.push({
                        email: row.lider_email,
                        name: row.lider_nome,
                        cellName: row.celula,
                        generationName: row.geracao,
                        status: 'error',
                        errorMessage: 'Email já cadastrado no sistema'
                    });
                    continue;
                }

                const leaderId = leaderMap.get(row.lider_email);
                const leaderResult = leaderResults.find(r => r.email === row.lider_email);

                if (!leaderId) {
                    finalResults.push({
                        email: row.lider_email,
                        name: row.lider_nome,
                        cellName: row.celula,
                        generationName: row.geracao,
                        status: 'error',
                        errorMessage: leaderResult?.error || 'Falha na criação do líder'
                    });
                    continue; // Skip cell creation if leader failed
                }

                const cellId = crypto.randomUUID();
                const genId = generationMap.get(row.geracao);

                cellsToCreate.push({
                    id: cellId,
                    organizationId: organization.id,
                    name: row.celula,
                    leaderId: leaderId,
                    leaderName: row.lider_nome,
                    whatsapp: row.lider_telefone,
                    dayOfWeek: row.dia_semana,
                    time: row.horario,
                    address: row.endereco,
                    targetAudience: row.publico_alvo,
                    generationId: genId,
                    active: true
                });

                leaderLinks.push({ cellId, leaderId });

                // Add to success results with password
                const passwordUsed = uniqueLeaders.find(l => l.email === row.lider_email)?.password;
                finalResults.push({
                    email: row.lider_email,
                    name: row.lider_nome,
                    cellName: row.celula,
                    generationName: row.geracao,
                    status: 'success',
                    user_id: leaderId,
                    password: passwordUsed
                });
            }

            if (cellsToCreate.length > 0) {
                await importService.createCells(cellsToCreate);
                addLog(`✅ ${cellsToCreate.length} células criadas`);
            }

            currentProgress += 25;
            setProgress(currentProgress);

            // 4. Link Leaders
            addLog('Vinculando líderes às células...');
            if (leaderLinks.length > 0) {
                await importService.linkLeadersToCells(leaderLinks);
                addLog(`✅ ${leaderLinks.length} líderes vinculados`);
            }

            currentProgress += 25;
            setProgress(currentProgress);

            setResults(finalResults);

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['cells'] });
            queryClient.invalidateQueries({ queryKey: ['generations'] });
            queryClient.invalidateQueries({ queryKey: ['profiles'] });

            setStep('result');

        } catch (error: any) {
            addLog(`❌ Erro crítico no processo: ${error.message}`);
            // Don't change step, stay on processing with error visible? Or go to result with partial?
            // Step to result so user can see what happened
            setStep('result');
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setStep('upload');
        setRawData([]);
        setErrors([]);
        setSummary(null);
        setResults([]);
        setLogs([]);
        setProgress(0);
    };

    return {
        step,
        setStep,
        rawData,
        errors,
        summary,
        results,
        isProcessing,
        progress,
        logs,
        handleFileUpload,
        handleProcess,
        reset
    };
}
