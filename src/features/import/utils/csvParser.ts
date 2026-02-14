// @ts-ignore
import Papa from 'papaparse';
import { ImportRow, importFileSchema } from '../schemas/importSchema';
import { ValidationError } from '../types';

export function parseCsv(file: File): Promise<{ data: ImportRow[]; errors: ValidationError[] }> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                const rawData = results.data;
                const errors: ValidationError[] = [];

                // 1. Validar Zod
                // Validate array structure first
                const parseResult = importFileSchema.safeParse(rawData);

                if (!parseResult.success) {
                    // If array validation fails, it's global
                    errors.push({ row: 0, column: 'Geral', message: parseResult.error.issues[0].message });
                } else {
                    // Validate row by row for detailed errors
                    rawData.forEach((row: any, index: number) => {
                        // Check required columns from schema keys
                        const rowResult = importFileSchema.element.safeParse(row);
                        if (!rowResult.success) {
                            rowResult.error.issues.forEach((err: any) => {
                                errors.push({
                                    row: index + 1,
                                    column: String(err.path[0]),
                                    message: err.message
                                });
                            });
                        }
                    });
                }

                // 2. Validar emails duplicados no CSV
                const emails = new Set<string>();
                rawData.forEach((row: any, index) => {
                    if (row.lider_email) {
                        if (emails.has(row.lider_email)) {
                            errors.push({
                                row: index + 1,
                                column: 'lider_email',
                                message: `Email duplicado no arquivo: ${row.lider_email}`
                            });
                        }
                        emails.add(row.lider_email);
                    }
                });

                resolve({ data: rawData as ImportRow[], errors });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}
