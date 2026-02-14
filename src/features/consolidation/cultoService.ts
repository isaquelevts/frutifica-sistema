import { supabase } from '../../core/supabase/supabaseClient';
import { Culto } from '../../shared/types/types';

export const getCultos = async (organizationId?: string): Promise<Culto[]> => {
    let query = supabase.from('cultos').select('*');
    if (organizationId) query = query.eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) return [];

    return data.map((c: any) => ({
        ...c,
        organizationId: c.organization_id,
        criadoPor: c.criado_por,
        criadoEm: c.criado_em
    }));
};

export const saveCulto = async (culto: Culto): Promise<void> => {
    const { error } = await supabase.from('cultos').insert({
        id: culto.id,
        organization_id: culto.organizationId,
        data: culto.data,
        hora: culto.hora,
        tipo: culto.tipo,
        observacoes: culto.observacoes,
        criado_por: culto.criadoPor
    });
    if (error) throw error;
};
