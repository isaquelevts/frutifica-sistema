/**
 * Normaliza número de telefone para o formato que a Evolution API espera
 * (dígitos apenas, com DDI 55 quando ausente).
 *
 * Vive aqui porque tanto a criação de célula (routes/cells) quanto o aceite de
 * convite (routes/invites) gravam leaderPhone, e os lembretes de WhatsApp
 * dependem do mesmo formato nos dois caminhos.
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}
