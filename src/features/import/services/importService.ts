
import { supabase } from '../../../core/supabase/supabaseClient';
import { ImportRow } from '../schemas/importSchema';
import { ImportResult, ProcessedGeneration } from '../types';
import { Generation, Cell } from '../../../shared/types/types';

export const importService = {
    async fetchExistingEmails(organizationId: string, emails: string[]): Promise<string[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('organization_id', organizationId)
            .in('email', emails);

        if (error) throw error;
        return data.map((d: any) => d.email);
    },

    async fetchExistingGenerations(organizationId: string): Promise<Generation[]> {
        const { data, error } = await supabase
            .from('generations')
            .select('*')
            .eq('organization_id', organizationId);

        if (error) throw error;
        return data.map((g: any) => ({
            ...g,
            organizationId: g.organization_id,
            leaderId: g.leader_id,
            leaderName: g.leader?.name, // This might be missing if we don't join, but for name matching it's fine
        }));
    },

    async fetchExistingCells(organizationId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('cells')
            .select('name')
            .eq('organization_id', organizationId);

        if (error) throw error;
        return data.map((c: any) => c.name);
    },

    async createGenerations(
        organizationId: string,
        generationsToCreate: { name: string; color: string }[]
    ): Promise<ProcessedGeneration[]> {
        if (generationsToCreate.length === 0) return [];

        const newGenerations: ProcessedGeneration[] = [];

        for (const gen of generationsToCreate) {
            const id = crypto.randomUUID();
            const { error } = await supabase.from('generations').insert({
                id,
                organization_id: organizationId,
                name: gen.name,
                color: gen.color,
                active: true
            });

            if (error) throw error;
            newGenerations.push({ name: gen.name, id, isNew: true });
        }

        return newGenerations;
    },

    async createLeaderAccounts(leaders: { name: string; email: string; password?: string }[]): Promise<any[]> {
        if (leaders.length === 0) return [];

        // Call Edge Function
        const { data, error } = await supabase.functions.invoke('create-leader-account', {
            body: { leaders }
        });

        if (error) throw error;
        return data.results;
    },

    async createCells(cells: Partial<Cell>[]): Promise<void> {
        if (cells.length === 0) return;

        // Insert manually to handle specific fields mapping if needed
        // But since we built Partial<Cell>, we need to map to DB columns
        const dbCells = cells.map(c => ({
            id: c.id,
            organization_id: c.organizationId,
            name: c.name,
            leader_name: c.leaderName,
            leader_id: c.leaderId,
            whatsapp: c.whatsapp,
            day_of_week: c.dayOfWeek,
            time: c.time,
            address: c.address,
            target_audience: c.targetAudience,
            generation_id: c.generationId,
            active: c.active,
            // co_leaders: [] // Default
        }));

        const { error } = await supabase.from('cells').insert(dbCells);
        if (error) throw error;
    },

    async linkLeadersToCells(links: { cellId: string; leaderId: string }[]): Promise<void> {
        if (links.length === 0) return;

        // 1. Create cell_leaders entries
        const cellLeaders = links.map(l => ({
            cell_id: l.cellId,
            profile_id: l.leaderId,
            role: 'leader'
        }));

        const { error: errorLeaders } = await supabase.from('cell_leaders' as any).insert(cellLeaders);
        if (errorLeaders) throw errorLeaders;

        // 2. Update profiles.cell_id
        // We have to do this one by one or finding a way to bulk update with different values
        // For simplicity and safety, loop updates (or Promise.all)
        const updatePromises = links.map(l =>
            supabase.from('profiles').update({ cell_id: l.cellId }).eq('id', l.leaderId)
        );

        await Promise.all(updatePromises);
    }
};
