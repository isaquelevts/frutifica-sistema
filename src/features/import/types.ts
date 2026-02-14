
import { ImportRow } from './schemas/importSchema';

export interface ValidationError {
    row: number;
    column: string;
    message: string;
}

export interface ImportResult {
    email: string;
    name: string;
    password?: string;
    cellName: string;
    generationName: string;
    status: 'success' | 'error';
    errorMessage?: string;
    user_id?: string | null;
}

export type ImportStep = 'upload' | 'preview' | 'processing' | 'result';

export interface ProcessedGeneration {
    name: string;
    id: string; // uuid
    isNew: boolean;
}

export interface ImportSummary {
    totalGenerations: number;
    totalCells: number;
    totalLeaders: number;
    newGenerations: string[];
    existingGenerations: string[];
    duplicateEmails: string[];
    existingEmailsInDb: string[];
}
