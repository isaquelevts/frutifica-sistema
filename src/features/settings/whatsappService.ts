import { supabase } from '../../core/supabase/supabaseClient';

export interface WhatsappConfig {
  id?: string;
  organizationId: string;
  instanceName?: string;
  groupJid?: string;
  groupName?: string;
  active: boolean;
  connected?: boolean;
}

export interface WhatsappGroup {
  id: string;
  subject: string;
}

export interface SetupWhatsappResult {
  connected: boolean;
  instanceName?: string;
  qrCode?: string;
  error?: string;
}

export interface WhatsappStatus {
  connected: boolean;
  state: string;
  error?: string;
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
    instanceName: data.instance_name,
    groupJid: data.group_jid,
    groupName: data.group_name,
    active: data.active,
    connected: data.connected ?? false,
  };
};

export const upsertWhatsappConfig = async (config: WhatsappConfig): Promise<void> => {
  const { error } = await supabase
    .from('whatsapp_config')
    .upsert(
      {
        organization_id: config.organizationId,
        group_jid: config.groupJid || null,
        group_name: config.groupName || null,
        active: config.active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    );

  if (error) throw new Error(error.message);
};

export const setupWhatsappInstance = async (): Promise<SetupWhatsappResult> => {
  const { data, error } = await supabase.functions.invoke('setup-whatsapp-instance', {});

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as SetupWhatsappResult;
};

export const getWhatsappStatus = async (): Promise<WhatsappStatus> => {
  const { data, error } = await supabase.functions.invoke('get-whatsapp-status', {});

  if (error) throw new Error(error.message);

  return (data ?? { connected: false, state: 'unknown' }) as WhatsappStatus;
};

export const fetchWhatsappGroups = async (): Promise<WhatsappGroup[]> => {
  const { data, error } = await supabase.functions.invoke('fetch-whatsapp-groups', {});

  // A função sempre retorna 200 — erros ficam em data.error
  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
};
