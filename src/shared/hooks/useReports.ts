import { useQuery } from '@tanstack/react-query';
import { getReports, getReportById } from '../../features/reports/reportService';

export const useReports = (organizationId?: string) => {
    return useQuery({
        queryKey: ['reports', organizationId],
        queryFn: () => getReports(organizationId),
        enabled: !!organizationId,
    });
};

export const useReport = (reportId?: string) => {
    return useQuery({
        queryKey: ['reports', reportId],
        queryFn: () => getReportById(reportId!),
        enabled: !!reportId,
    });
};
