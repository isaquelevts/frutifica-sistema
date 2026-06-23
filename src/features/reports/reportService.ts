import { apiFetch } from '../../core/api/client';
import { Report } from '../../shared/types/types';

export const getReports = async (organizationId: string): Promise<Report[]> => {
    return apiFetch<Report[]>(`/api/reports?orgId=${organizationId}`);
};

export const getReportByCellAndDate = async (cellId: string, date: string): Promise<Report | undefined> => {
    try {
        const report = await apiFetch<Report>(`/api/reports/cell/${cellId}/date/${date}`);
        return report || undefined;
    } catch {
        return undefined;
    }
};

export const getReportById = async (id: string): Promise<Report | undefined> => {
    try {
        return await apiFetch<Report>(`/api/reports/${id}`);
    } catch {
        return undefined;
    }
};

export const saveReport = async (report: Report): Promise<void> => {
    await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
            id: report.id,
            cellId: report.cellId,
            organizationId: report.organizationId,
            participants: report.participants,
            visitors: report.visitors,
            date: report.date,
        }),
    });
};

export const updateReport = async (report: Report): Promise<void> => {
    await apiFetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            participants: report.participants,
            visitors: report.visitors,
            date: report.date,
        }),
    });
};

export const deleteReport = async (id: string): Promise<void> => {
    await apiFetch(`/api/reports/${id}`, { method: 'DELETE' });
};
