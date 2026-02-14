
import { ImportResult } from '../types';

export function exportResultsToCsv(results: ImportResult[]): void {
    const header = 'nome,email,senha_temporaria,celula,geracao,status,observacao\n';
    const rows = results.map(r =>
        `${r.name},${r.email},${r.password || ''},${r.cellName},${r.generationName},${r.status === 'success' ? 'Criado' : 'Erro'},${r.errorMessage || ''}`
    ).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' }); // BOM para acentos no Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credenciais-lideres-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
