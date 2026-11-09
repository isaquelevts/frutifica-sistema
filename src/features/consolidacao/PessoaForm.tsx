import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useCells } from '../../shared/hooks/useCells';
import { useIsSuspended } from '../../shared/hooks/useIsSuspended';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DuplicatePersonError, type Person, type PersonInput, type PersonType } from './consolidacaoService';
import { useConsolidationAccess, useCreatePerson, usePerson, useResponsibles, useUpdatePerson } from './hooks';
import { HOW_FOUND_OPTIONS, MARITAL_OPTIONS, PERSON_TYPES, SERVICE_SUGGESTIONS } from './constants';
import { ErrorBlock, FieldLabel, LoadingBlock, NativeSelect } from './components';
import { formatPhone, todayISO } from './utils';

type FormState = Required<Omit<PersonInput, 'ignoreDuplicate' | 'assignedToId' | 'cellId'>> & {
  assignedToId: string;
  cellId: string;
};

const emptyForm = (): FormState => ({
  name: '', phone: '', email: '', birthDate: '', gender: '', maritalStatus: '',
  neighborhood: '', address: '', type: 'visitante', visitDate: todayISO(), service: '',
  howFound: '', invitedBy: '', prayerRequest: '', notes: '', assignedToId: 'me', cellId: '',
});

function fromPerson(p: Person): FormState {
  return {
    name: p.name, phone: formatPhone(p.phone), email: p.email || '', birthDate: p.birthDate || '',
    gender: p.gender || '', maritalStatus: p.maritalStatus || '', neighborhood: p.neighborhood || '',
    address: p.address || '', type: p.type, visitDate: p.visitDate, service: p.service || '',
    howFound: p.howFound || '', invitedBy: p.invitedBy || '', prayerRequest: p.prayerRequest || '',
    notes: p.notes || '', assignedToId: p.assignedTo?.id || '', cellId: p.cell?.id || '',
  };
}

/** Máscara simples de celular brasileiro enquanto digita. */
function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="text-base">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
  </Card>
);

const PessoaForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const access = useConsolidationAccess();
  const isSuspended = useIsSuspended();

  const { data: existing, isLoading: loadingPerson } = usePerson(id);
  const { data: responsibles = [] } = useResponsibles();
  const { data: allCells = [] } = useCells(user?.organizationId);
  const cells = allCells.filter((c) => c.active !== false);

  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson(id || '');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);
  const [saved, setSaved] = useState<Person | null>(null);

  useEffect(() => {
    if (existing) setForm(fromPerson(existing));
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const pending = createMutation.isPending || updateMutation.isPending;

  const submit = async (ignoreDuplicate = false) => {
    setError('');
    setDuplicate(null);
    if (form.name.trim().length < 2) {
      setError('Informe o nome da pessoa.');
      return;
    }
    const digits = form.phone.replace(/\D/g, '');
    if (digits && digits.length < 10) {
      setError('Telefone incompleto — informe DDD + número.');
      return;
    }
    const { assignedToId, cellId, ...rest } = form;
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ ...rest, cellId: cellId || null });
        navigate(`/consolidacao/pessoas/${id}`);
      } else {
        const person = await createMutation.mutateAsync({
          ...rest,
          assignedToId: assignedToId || null,
          cellId: cellId || null,
          ignoreDuplicate,
        });
        setSaved(person);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      if (err instanceof DuplicatePersonError) setDuplicate(err.duplicate);
      else setError(err.message || 'Não foi possível salvar.');
    }
  };

  if (isEdit && loadingPerson) return <LoadingBlock />;

  if (saved) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{saved.name} foi cadastrado(a)</h2>
              <p className="mt-1 text-muted-foreground">
                {saved.assignedTo
                  ? `Acompanhamento com ${saved.assignedTo.name}. O primeiro contato deve acontecer em até 48h.`
                  : 'Ficou sem responsável — o gestor vai distribuir.'}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={() => { setSaved(null); setForm(emptyForm()); }}>
                <UserPlus /> Cadastrar outra pessoa
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={`/consolidacao/pessoas/${saved.id}`}>Abrir cadastro</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl space-y-5 pb-24"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar cadastro' : 'Cadastrar pessoa'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? existing?.name : 'Visitante, novo convertido ou reconciliação. Só o nome é obrigatório.'}
          </p>
        </div>
      </div>

      <Section title="Quem é">
        <div className="sm:col-span-2">
          <FieldLabel>Tipo</FieldLabel>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {(Object.keys(PERSON_TYPES) as PersonType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={form.type === t}
                onClick={() => set('type', t)}
                className={cn(
                  'rounded-lg border px-1 py-2.5 text-xs font-medium transition-colors sm:text-sm',
                  form.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                )}
              >
                {PERSON_TYPES[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="name">Nome completo *</FieldLabel>
          <Input id="name" autoFocus={!isEdit} autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Maria da Silva" />
        </div>
        <div>
          <FieldLabel htmlFor="phone" hint="(WhatsApp)">Telefone</FieldLabel>
          <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(11) 91234-5678" />
        </div>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
          <Input id="birthDate" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="gender">Sexo</FieldLabel>
            <NativeSelect id="gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel htmlFor="marital">Estado civil</FieldLabel>
            <NativeSelect id="marital" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
              <option value="">—</option>
              {MARITAL_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </NativeSelect>
          </div>
        </div>
      </Section>

      <Section title="Visita">
        <div>
          <FieldLabel htmlFor="visitDate">Data da visita</FieldLabel>
          <Input id="visitDate" type="date" value={form.visitDate} max={todayISO()} onChange={(e) => set('visitDate', e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="service">Culto / evento</FieldLabel>
          <Input id="service" list="service-options" value={form.service} onChange={(e) => set('service', e.target.value)} placeholder="Ex.: Culto de domingo (noite)" />
          <datalist id="service-options">
            {SERVICE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <FieldLabel htmlFor="howFound">Como conheceu a igreja</FieldLabel>
          <NativeSelect id="howFound" value={form.howFound} onChange={(e) => set('howFound', e.target.value)}>
            <option value="">—</option>
            {HOW_FOUND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </NativeSelect>
        </div>
        <div>
          <FieldLabel htmlFor="invitedBy">Quem convidou</FieldLabel>
          <Input id="invitedBy" value={form.invitedBy} onChange={(e) => set('invitedBy', e.target.value)} placeholder="Nome de quem trouxe" />
        </div>
      </Section>

      <Section title="Onde mora" description="Ajuda a indicar a célula mais próxima.">
        <div>
          <FieldLabel htmlFor="neighborhood">Bairro</FieldLabel>
          <Input id="neighborhood" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="address">Endereço</FieldLabel>
          <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
      </Section>

      <Section title="Acompanhamento">
        {!isEdit && (
          <div>
            <FieldLabel htmlFor="assigned">Quem vai acompanhar</FieldLabel>
            <NativeSelect id="assigned" value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)}>
              <option value="me">Eu mesmo(a)</option>
              <option value="">Sem responsável (gestor distribui)</option>
              {access === 'gestor' &&
                responsibles.filter((r) => r.id !== user?.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
            </NativeSelect>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="cell" hint="(se já souber)">Célula indicada</FieldLabel>
          <NativeSelect id="cell" value={form.cellId} onChange={(e) => set('cellId', e.target.value)}>
            <option value="">—</option>
            {cells.map((c) => <option key={c.id} value={c.id}>{c.name}{c.leaderName ? ` · ${c.leaderName}` : ''}</option>)}
          </NativeSelect>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="prayer">Pedido de oração</FieldLabel>
          <Textarea id="prayer" rows={3} value={form.prayerRequest} onChange={(e) => set('prayerRequest', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="notes">Observações</FieldLabel>
          <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Algo importante para quem for fazer o contato" />
        </div>
      </Section>

      {error && <ErrorBlock message={error} />}
      {duplicate && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Já existe um cadastro com este telefone: <strong>{duplicate.name}</strong>.</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to={`/consolidacao/pessoas/${duplicate.id}`}>Abrir cadastro</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => submit(true)}>Cadastrar mesmo assim</Button>
          </span>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl justify-end gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" size="lg" disabled={pending || isSuspended} className="flex-1 md:flex-none">
            {pending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PessoaForm;
