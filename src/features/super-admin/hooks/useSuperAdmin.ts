import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminService } from '../services/superAdminService';
import { PlanType } from '../../../shared/types/types';

export const useAllOrganizations = () => {
  return useQuery({
    queryKey: ['super-admin', 'organizations'],
    queryFn: () => superAdminService.getAllOrganizations(),
  });
};

export const useOrganizationsWithStats = () => {
  return useQuery({
    queryKey: ['super-admin', 'organizations-with-stats'],
    queryFn: () => superAdminService.getOrganizationsWithCellCount(),
  });
};

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['super-admin', 'platform-stats'],
    queryFn: () => superAdminService.getPlatformStats(),
  });
};

export const useOrganizationDetail = (orgId?: string) => {
  return useQuery({
    queryKey: ['super-admin', 'org-detail', orgId],
    queryFn: () => superAdminService.getOrganizationWithStats(orgId!),
    enabled: !!orgId,
  });
};

export const useOrganizationCells = (orgId?: string) => {
  return useQuery({
    queryKey: ['super-admin', 'org-cells', orgId],
    queryFn: () => superAdminService.getOrganizationCells(orgId!),
    enabled: !!orgId,
  });
};

export const useOrganizationGenerations = (orgId?: string) => {
  return useQuery({
    queryKey: ['super-admin', 'org-generations', orgId],
    queryFn: () => superAdminService.getOrganizationGenerations(orgId!),
    enabled: !!orgId,
  });
};

export const useOrganizationReportsByWeek = (orgId?: string) => {
  return useQuery({
    queryKey: ['super-admin', 'org-reports-week', orgId],
    queryFn: () => superAdminService.getOrganizationReportsByWeek(orgId!),
    enabled: !!orgId,
  });
};

export const useSuperAdmins = () => {
  return useQuery({
    queryKey: ['super-admin', 'super-admins-list'],
    queryFn: () => superAdminService.getSuperAdmins(),
  });
};

export const useUpdateOrganizationName = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, name }: { orgId: string; name: string }) =>
      superAdminService.updateOrganizationName(orgId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

export const useUpdateOrganizationPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, plan, maxCells }: { orgId: string; plan: PlanType; maxCells: number }) =>
      superAdminService.updateOrganizationPlan(orgId, plan, maxCells),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

export const useSuspendOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => superAdminService.suspendOrganization(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

export const useReactivateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => superAdminService.reactivateOrganization(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

export const useDeleteOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => superAdminService.deleteOrganization(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

export const useAddSuperAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => superAdminService.addSuperAdmin(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin', 'super-admins-list'] });
    },
  });
};

export const useRemoveSuperAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => superAdminService.removeSuperAdmin(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin', 'super-admins-list'] });
    },
  });
};
