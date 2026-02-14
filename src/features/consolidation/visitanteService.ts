import { supabase } from '../../core/supabase/supabaseClient';
import { Visitante } from '../../shared/types/types';

export const getVisitantes = async (organizationId?: string): Promise<Visitante[]> => {
    let query = supabase.from('visitantes').select('*');
    if (organizationId) query = query.eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) return [];

    return data.map((v: any) => ({
        ...v,
        organizationId: v.organization_id,
        cultoId: v.culto_id,
        dataPrimeiraVisita: v.data_primeira_visita,
        primeiraVez: v.primeira_vez,
        tipoOrigem: v.tipo_origem as any,
        celulaOrigemId: v.celula_origem_id,
        celulaDestinoId: v.celula_destino_id,
        jaParticipaCelula: v.ja_participa_celula,
        statusKanban: v.status_kanban as any,
        responsavelId: v.responsavel_id,
        presencasNaCelula: v.presencas_na_celula,
        ultimoContato: v.ultimo_contato,
        proximaAcao: v.proxima_acao,
        proximaAcaoData: v.proxima_acao_data,
        dataIntegracao: v.data_integracao,
        observacoes: v.observacoes,
        criadoEm: v.criado_em,
        atualizadoEm: v.atualizado_em
    }));
};

export const getVisitanteById = async (id: string): Promise<Visitante | undefined> => {
    const { data, error } = await supabase.from('visitantes').select('*').eq('id', id).single();
    if (error) return undefined;

    return {
        ...data,
        organizationId: data.organization_id,
        cultoId: data.culto_id,
        dataPrimeiraVisita: data.data_primeira_visita,
        primeiraVez: data.primeira_vez,
        tipoOrigem: data.tipo_origem as any,
        celulaOrigemId: data.celula_origem_id,
        celulaDestinoId: data.celula_destino_id,
        jaParticipaCelula: data.ja_participa_celula,
        statusKanban: data.status_kanban as any,
        responsavelId: data.responsavel_id,
        presencasNaCelula: data.presencas_na_celula,
        ultimoContato: data.ultimo_contato,
        proximaAcao: data.proxima_acao,
        proximaAcaoData: data.proxima_acao_data,
        dataIntegracao: data.data_integracao,
        observacoes: data.observacoes,
        criadoEm: data.criado_em,
        atualizadoEm: data.atualizado_em
    };
};

export const saveVisitante = async (visitante: Visitante): Promise<void> => {
    const { error } = await supabase.from('visitantes').insert({
        id: visitante.id,
        organization_id: visitante.organizationId,
        nome: visitante.nome,
        telefone: visitante.telefone,
        endereco: visitante.endereco,
        email: visitante.email,
        birthday: visitante.birthday,
        culto_id: visitante.cultoId,
        data_primeira_visita: visitante.dataPrimeiraVisita,
        primeira_vez: visitante.primeiraVez,
        tipo_origem: visitante.tipoOrigem,
        celula_origem_id: visitante.celulaOrigemId,
        celula_destino_id: visitante.celulaDestinoId,
        ja_participa_celula: visitante.jaParticipaCelula,
        status_kanban: visitante.statusKanban,
        responsavel_id: visitante.responsavelId,
        tags: visitante.tags,
        presencas_na_celula: visitante.presencasNaCelula,
        ultimo_contato: visitante.ultimoContato,
        proxima_acao: visitante.proximaAcao,
        proxima_acao_data: visitante.proximaAcaoData,
        data_integracao: visitante.dataIntegracao,
        observacoes: visitante.observacoes
    });
    if (error) throw error;
};

export const updateVisitante = async (visitante: Visitante): Promise<void> => {
    const { error } = await supabase.from('visitantes').update({
        organization_id: visitante.organizationId,
        nome: visitante.nome,
        telefone: visitante.telefone,
        endereco: visitante.endereco,
        email: visitante.email,
        birthday: visitante.birthday,
        culto_id: visitante.cultoId,
        data_primeira_visita: visitante.dataPrimeiraVisita,
        primeira_vez: visitante.primeiraVez,
        tipo_origem: visitante.tipoOrigem,
        celula_origem_id: visitante.celulaOrigemId,
        celula_destino_id: visitante.celulaDestinoId,
        ja_participa_celula: visitante.jaParticipaCelula,
        status_kanban: visitante.statusKanban,
        responsavel_id: visitante.responsavelId,
        tags: visitante.tags,
        presencas_na_celula: visitante.presencasNaCelula,
        ultimo_contato: visitante.ultimoContato,
        proxima_acao: visitante.proximaAcao,
        proxima_acao_data: visitante.proximaAcaoData,
        data_integracao: visitante.dataIntegracao,
        observacoes: visitante.observacoes
    }).eq('id', visitante.id);
    if (error) throw error;
};

export const deleteVisitante = async (id: string): Promise<void> => {
    const { error } = await supabase.from('visitantes').delete().eq('id', id);
    if (error) throw error;
};
