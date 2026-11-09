import type { ActivityType, Outcome, PersonType, Stage } from './consolidacaoService';

export const STAGE_ORDER: Stage[] = ['novo', 'contatado', 'convidado', 'em_celula', 'consolidado'];

export const STAGES: Record<Stage, { label: string; short: string; description: string; className: string; dot: string }> = {
  novo: {
    label: 'Aguardando contato', short: 'Novo',
    description: 'Cadastrado, ainda sem conversa',
    className: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500',
  },
  contatado: {
    label: 'Contatado', short: 'Contatado',
    description: 'Já houve conversa com a pessoa',
    className: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500',
  },
  convidado: {
    label: 'Convidado p/ célula', short: 'Convidado',
    description: 'Recebeu convite para uma célula',
    className: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500',
  },
  em_celula: {
    label: 'Frequentando célula', short: 'Em célula',
    description: 'Já participa de uma célula',
    className: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500',
  },
  consolidado: {
    label: 'Consolidado', short: 'Consolidado',
    description: 'Integrado à igreja',
    className: 'bg-green-100 text-green-800', dot: 'bg-green-600',
  },
  sem_retorno: {
    label: 'Sem retorno', short: 'Sem retorno',
    description: 'Não quis seguir ou não foi possível contato',
    className: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground',
  },
};

export const PERSON_TYPES: Record<PersonType, string> = {
  visitante: 'Visitante',
  novo_convertido: 'Novo convertido',
  reconciliacao: 'Reconciliação',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  whatsapp: 'Mensagem no WhatsApp',
  ligacao: 'Ligação',
  visita: 'Visita na casa',
  presencial: 'Conversa presencial',
  convite_celula: 'Convite para célula',
  convite_culto: 'Convite para culto/evento',
  nota: 'Anotação',
  cadastro: 'Cadastro',
  etapa: 'Mudança de etapa',
  atribuicao: 'Responsável alterado',
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  respondeu: 'Respondeu',
  sem_resposta: 'Não respondeu',
  numero_invalido: 'Número inválido',
};

export const HOW_FOUND_OPTIONS = [
  'Convite de amigo ou familiar',
  'Redes sociais',
  'Passou em frente',
  'Célula',
  'Evento',
  'Pesquisa na internet',
  'Outro',
];

export const SERVICE_SUGGESTIONS = [
  'Culto de domingo (manhã)',
  'Culto de domingo (noite)',
  'Culto de jovens',
  'Culto de meio de semana',
  'Evento especial',
];

export const MARITAL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'];

export const LOST_REASONS = [
  'Não quis continuar',
  'Já frequenta outra igreja',
  'Mudou de cidade',
  'Sem resposta após várias tentativas',
  'Número inválido',
  'Outro',
];
