import type { Alerts } from './consolidacaoService';

/** Hoje em YYYY-MM-DD no fuso local do navegador. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Datas puras (YYYY-MM-DD) ancoradas ao meio-dia para não "voltar um dia" no fuso do Brasil. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function relativeDays(iso?: string | null): string {
  if (!iso) return 'nunca';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - that.getTime()) / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days === -1) return 'amanhã';
  if (days < 0) return `em ${-days} dias`;
  return `há ${days} dias`;
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '');
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${full}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function firstName(name?: string | null): string {
  return (name || '').trim().split(/\s+/)[0] || '';
}

export function hasAlert(a: Alerts): boolean {
  return a.firstContactLate || a.nextActionOverdue || a.cooling;
}

export function alertLabels(a: Alerts): string[] {
  const out: string[] = [];
  if (a.firstContactLate) out.push('Sem contato há mais de 48h');
  if (a.nextActionOverdue) out.push('Próximo passo vencido');
  if (a.cooling) out.push('Sem interação há 14+ dias');
  if (a.unassigned) out.push('Sem responsável');
  return out;
}
