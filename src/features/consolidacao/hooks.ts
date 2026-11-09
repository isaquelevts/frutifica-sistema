import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../core/auth/AuthContext';
import {
  consolidacaoApi, consolidationAccess, type ActivityInput, type Person, type PersonDetail,
  type PersonInput, type Stage, type TeamMember, type Access,
} from './consolidacaoService';

const KEY = ['consolidacao'] as const;

export const useConsolidationAccess = (): Access | null => {
  const { user } = useAuth();
  return consolidationAccess(user?.roles as string[] | undefined);
};

export const usePeople = () =>
  useQuery({ queryKey: [...KEY, 'pessoas'], queryFn: consolidacaoApi.listPeople, staleTime: 30_000 });

export const usePerson = (id?: string) =>
  useQuery({ queryKey: [...KEY, 'pessoa', id], queryFn: () => consolidacaoApi.getPerson(id!), enabled: !!id });

export const useResponsibles = () =>
  useQuery({ queryKey: [...KEY, 'responsaveis'], queryFn: consolidacaoApi.responsibles, staleTime: 60_000 });

export const useSummary = (from: string, to: string, enabled = true) =>
  useQuery({ queryKey: [...KEY, 'resumo', from, to], queryFn: () => consolidacaoApi.summary(from, to), enabled });

export const useTeam = () =>
  useQuery({ queryKey: [...KEY, 'equipe'], queryFn: consolidacaoApi.team });

/** Toda escrita invalida lista, detalhe e painel — os números do gestor dependem de tudo. */
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

/** Atualiza a pessoa na lista em cache na hora, para o quadro não "pular" ao arrastar. */
function usePatchListCache() {
  const qc = useQueryClient();
  return (person: Person) => {
    qc.setQueryData<Person[]>([...KEY, 'pessoas'], (old) => old?.map((p) => (p.id === person.id ? person : p)));
    qc.setQueryData<PersonDetail>([...KEY, 'pessoa', person.id], (old) => (old ? { ...old, ...person } : old));
  };
}

export const useCreatePerson = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: PersonInput) => consolidacaoApi.createPerson(input), onSuccess: invalidate });
};

export const useUpdatePerson = (id: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Parameters<typeof consolidacaoApi.updatePerson>[1]) => consolidacaoApi.updatePerson(id, input),
    onSuccess: invalidate,
  });
};

export const useSetStage = () => {
  const invalidate = useInvalidate();
  const patch = usePatchListCache();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: Stage; lostReason?: string }) =>
      consolidacaoApi.setStage(id, stage, lostReason),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: [...KEY, 'pessoas'] });
      const prev = qc.getQueryData<Person[]>([...KEY, 'pessoas']);
      qc.setQueryData<Person[]>([...KEY, 'pessoas'], (old) => old?.map((p) => (p.id === id ? { ...p, stage } : p)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData([...KEY, 'pessoas'], ctx.prev); },
    onSuccess: (person) => { patch(person); invalidate(); },
  });
};

export const useAddActivity = (id: string) => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: ActivityInput) => consolidacaoApi.addActivity(id, input), onSuccess: invalidate });
};

export const useAssign = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string | null }) => consolidacaoApi.assign(id, assignedToId),
    onSuccess: invalidate,
  });
};

export const useArchivePerson = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => consolidacaoApi.archive(id), onSuccess: invalidate });
};

export const useSetAccess = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ userId, access }: { userId: string; access: TeamMember['access'] }) => consolidacaoApi.setAccess(userId, access),
    onSuccess: invalidate,
  });
};

export const useCreateMember = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: consolidacaoApi.createMember, onSuccess: invalidate });
};
