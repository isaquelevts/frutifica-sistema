import { Report } from '../types/types';

/**
 * Um relatório só é considerado "realizado" se o líder marcou que houve
 * reunião E registrou pelo menos 1 presente. Relatórios com happened=true
 * mas 0 participantes (dados antigos, de antes dessa checagem existir)
 * são tratados como não realizados.
 */
export function isReportRealized(report: Pick<Report, 'happened' | 'participants' | 'visitors'>): boolean {
  return !!report.happened && ((report.participants || 0) > 0 || (report.visitors || 0) > 0);
}
