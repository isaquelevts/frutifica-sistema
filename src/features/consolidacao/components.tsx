import React from 'react';
import { AlertTriangle, Clock, MessageCircle, Phone, Snowflake, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Alerts, PersonType, Stage } from './consolidacaoService';
import { PERSON_TYPES, STAGES } from './constants';
import { firstName, formatPhone, whatsappLink } from './utils';

export const StageBadge: React.FC<{ stage: Stage; short?: boolean; className?: string }> = ({ stage, short, className }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', STAGES[stage].className, className)}>
    <span className={cn('size-1.5 rounded-full', STAGES[stage].dot)} />
    {short ? STAGES[stage].short : STAGES[stage].label}
  </span>
);

export const TypeBadge: React.FC<{ type: PersonType }> = ({ type }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
      type === 'novo_convertido' ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border text-muted-foreground'
    )}
  >
    {PERSON_TYPES[type]}
  </span>
);

/** Ícones de alerta com texto acessível — nunca só cor. */
export const AlertIcons: React.FC<{ alerts: Alerts; showUnassigned?: boolean; withText?: boolean }> = ({ alerts, showUnassigned, withText }) => {
  const items = [
    alerts.firstContactLate && { icon: <AlertTriangle className="size-3.5" />, text: '+48h sem contato', cls: 'text-destructive bg-destructive/10' },
    alerts.nextActionOverdue && { icon: <Clock className="size-3.5" />, text: 'Passo vencido', cls: 'text-amber-700 bg-amber-100' },
    alerts.cooling && { icon: <Snowflake className="size-3.5" />, text: 'Esfriando', cls: 'text-sky-700 bg-sky-100' },
    showUnassigned && alerts.unassigned && { icon: <UserX className="size-3.5" />, text: 'Sem responsável', cls: 'text-muted-foreground bg-muted' },
  ].filter(Boolean) as { icon: React.ReactNode; text: string; cls: string }[];
  if (!items.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((i) => (
        <span key={i.text} title={i.text} className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium', i.cls)}>
          {i.icon}
          {withText ? i.text : <span className="sr-only">{i.text}</span>}
        </span>
      ))}
    </span>
  );
};

export const ContactButtons: React.FC<{ phone: string | null; name: string; senderName?: string; size?: 'sm' | 'icon' }> = ({ phone, name, senderName, size = 'icon' }) => {
  if (!phone) return null;
  const greeting = `Olá, ${firstName(name)}! ${senderName ? `Aqui é ${firstName(senderName)}, ` : ''}da igreja. Foi uma alegria ter você com a gente! Como você está?`;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <span className="inline-flex gap-1" onClick={stop}>
      <Button asChild variant="outline" size={size === 'icon' ? 'icon' : 'sm'} className={size === 'icon' ? 'size-8 text-green-700' : 'text-green-700'}>
        <a href={whatsappLink(phone, greeting)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${name}`} title={`WhatsApp ${formatPhone(phone)}`}>
          <MessageCircle />
          {size === 'sm' && 'WhatsApp'}
        </a>
      </Button>
      <Button asChild variant="outline" size={size === 'icon' ? 'icon' : 'sm'} className={size === 'icon' ? 'size-8' : undefined}>
        <a href={`tel:+${phone.replace(/\D/g, '')}`} aria-label={`Ligar para ${name}`} title={`Ligar ${formatPhone(phone)}`}>
          <Phone />
          {size === 'sm' && 'Ligar'}
        </a>
      </Button>
    </span>
  );
};

export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const NativeSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select
    className={cn(
      'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
);

export const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode; hint?: string }> = ({ htmlFor, children, hint }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
    {children}
    {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
  </label>
);

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Carregando...' }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

export const ErrorBlock: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{message}</div>
);
