import { supabase } from '../../core/supabase/supabaseClient';

export interface WhatsappConfig {
  id?: string;
  organizationId: string;
  evolutionApiUrl: string;
  apiKey: string;
  instanceName: string;
  groupJid?: string;
  groupName?: string;
  active: boolean;
}

export interface WhatsappGroup {
  id: string;
  subject: string;
}

export const getWhatsappConfig = async (organizationId: string): Promise<WhatsappConfig | null> => {
  const { data, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    evolutionApiUrl: data.evolution_api_url,
    apiKey: data.api_key,
    instanceName: data.instance_name,
    groupJid: data.group_jid,
    groupName: data.group_name,
    active: data.active,
  };
};

export const upsertWhatsappConfig = async (config: WhatsappConfig): Promise<void> => {
  const { error } = await supabase
    .from('whatsapp_config')
    .upsert(
      {
        organization_id: config.organizationId,
        evolution_api_url: config.evolutionApiUrl,
        api_key: config.apiKey,
        instance_name: config.instanceName,
        group_jid: config.groupJid || null,
        group_name: config.groupName || null,
        active: config.active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    );

  if (error) throw new Error(error.message);
};

async function extractInvokeError(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // não conseguiu parsear — usa mensagem genérica
  }
  return error?.message ?? 'Erro desconhecido';
}

export const fetchWhatsappGroups = async (
  evolutionApiUrl: string,
  apiKey: string,
  instanceName: string
): Promise<WhatsappGroup[]> => {
  const { data, error } = await supabase.functions.invoke('fetch-whatsapp-groups', {
    body: {
      evolution_api_url: evolutionApiUrl,
      api_key: apiKey,
      instance_name: instanceName,
    },
  });

  if (error) throw new Error(await extractInvokeError(error));
  if (data?.error) throw new Error(data.error);

  return data?.groups ?? [];
};

export const sendTestReminder = async (organizationId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
    body: {
      organization_id: organizationId,
      force: true,
    },
  });

  if (error) throw new Error(await extractInvokeError(error));
  if (data?.error) throw new Error(data.error);
};
