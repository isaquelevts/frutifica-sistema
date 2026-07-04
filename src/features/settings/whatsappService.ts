import { apiFetch } from '../../core/api/client';

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

export const getWhatsappConfig = async (_organizationId: string): Promise<WhatsappConfig | null> => {
  return apiFetch<WhatsappConfig | null>('/api/whatsapp/config');
};

export const upsertWhatsappConfig = async (config: WhatsappConfig): Promise<void> => {
  await apiFetch('/api/whatsapp/config', {
    method: 'PUT',
    body: JSON.stringify({
      groupJid: config.groupJid || null,
      groupName: config.groupName || null,
      active: config.active,
    }),
  });
};

export const setupWhatsappInstance = async (): Promise<SetupWhatsappResult> => {
  const data = await apiFetch<SetupWhatsappResult>('/api/whatsapp/setup', { method: 'POST' });
  if (data?.error) throw new Error(data.error);
  return data;
};

export const getWhatsappStatus = async (): Promise<WhatsappStatus> => {
  return apiFetch<WhatsappStatus>('/api/whatsapp/status');
};

export const fetchWhatsappGroups = async (): Promise<WhatsappGroup[]> => {
  const data = await apiFetch<{ groups?: WhatsappGroup[]; error?: string }>('/api/whatsapp/groups');
  if (data?.error) throw new Error(data.error);
  return data?.groups ?? [];
};

export const sendTestReminder = async (_organizationId: string): Promise<void> => {
  const data = await apiFetch<{ error?: string }>('/api/whatsapp/send-reminder', {
    method: 'POST',
    body: JSON.stringify({ force: true }),
  });
  if (data?.error) throw new Error(data.error);
};
