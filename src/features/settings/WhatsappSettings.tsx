import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Search, Save, Send, CheckCircle, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Copy, RefreshCw, Smartphone,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import {
  getWhatsappConfig,
  upsertWhatsappConfig,
  fetchWhatsappGroups,
  sendTestReminder,
  setupWhatsappInstance,
  getWhatsappStatus,
  WhatsappGroup,
} from './whatsappService';

const CRON_SQL = `-- 1. Ative as extensões no Dashboard > Database > Extensions:
--    pg_cron  e  pg_net

-- 2. Rode este SQL no SQL Editor (substitua os valores):
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '0 15 * * *',
  $$
    SELECT net.http_post(
      url := 'https://SEU-PROJECT-REF.supabase.co/functions/v1/send-whatsapp-reminder',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer SUA-ANON-KEY"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
-- Substitua SEU-PROJECT-REF e SUA-ANON-KEY
-- (encontre em Dashboard > Settings > API)`;

const CronInstructions: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CRON_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-amber-100 transition-colors"
      >
        <span className="font-semibold">⚙️ Configurar agendamento automático diário</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-200">
          <p className="pt-3 text-amber-800">
            Para enviar automaticamente todo dia ao meio-dia, siga os passos:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-amber-800">
            <li>No Supabase Dashboard, vá em <strong>Database → Extensions</strong></li>
            <li>Ative <strong>pg_cron</strong> e <strong>pg_net</strong></li>
            <li>Vá em <strong>SQL Editor</strong> e rode o código abaixo:</li>
          </ol>
          <div className="relative">
            <pre className="bg-amber-900/10 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono text-amber-900">
              {CRON_SQL}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs font-medium transition-colors"
            >
              <Copy size={12} />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-amber-700">
            Encontre o <strong>Project Ref</strong> e a <strong>anon key</strong> em Dashboard → Settings → API.
          </p>
        </div>
      )}
    </div>
  );
};

type Step = 'loading' | 'not_connected' | 'connecting' | 'qr_shown' | 'connected';

const QR_TIMEOUT_MS = 90_000;

const WhatsappSettings: React.FC = () => {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const [groups, setGroups] = useState<WhatsappGroup[]>([]);
  const [groupJid, setGroupJid] = useState('');
  const [groupName, setGroupName] = useState('');
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    loadConfig();
    return () => {
      clearPolling();
      if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
    };
  }, [orgId]);

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const loadConfig = async () => {
    const config = await getWhatsappConfig(orgId);
    if (config?.connected) {
      setStep('connected');
      setGroupJid(config.groupJid ?? '');
      setGroupName(config.groupName ?? '');
      setActive(config.active);
      if (config.groupJid && config.groupName) {
        setGroups([{ id: config.groupJid, subject: config.groupName }]);
      }
    } else {
      setStep('not_connected');
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleConnect = async () => {
    setStep('connecting');
    setQrExpired(false);
    setQrCode(null);
    try {
      const result = await setupWhatsappInstance();
      if (result.connected) {
        setStep('connected');
        loadConfig();
      } else if (result.qrCode) {
        const qrSrc = result.qrCode.startsWith('data:')
          ? result.qrCode
          : `data:image/png;base64,${result.qrCode}`;
        setQrCode(qrSrc);
        setStep('qr_shown');
        startPolling();
        startQrTimer();
      } else {
        showFeedback('error', result.error ?? 'Erro ao gerar QR code');
        setStep('not_connected');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
      setStep('not_connected');
    }
  };

  const startPolling = () => {
    clearPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const status = await getWhatsappStatus();
        if (status.connected) {
          clearPolling();
          if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
          setStep('connected');
          setQrCode(null);
          loadConfig();
        }
      } catch {
        // ignora erros de polling silenciosamente
      }
    }, 4000);
  };

  const startQrTimer = () => {
    if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
    qrTimerRef.current = setTimeout(() => {
      setQrExpired(true);
      clearPolling();
    }, QR_TIMEOUT_MS);
  };

  const handleFetchGroups = async () => {
    setFetchingGroups(true);
    try {
      const result = await fetchWhatsappGroups();
      setGroups(result);
      if (result.length === 0) {
        showFeedback('error', 'Nenhum grupo encontrado. Verifique se você tem grupos no WhatsApp conectado.');
      } else {
        showFeedback('success', `${result.length} grupo(s) encontrado(s).`);
      }
    } catch (err: any) {
      showFeedback('error', `Erro ao buscar grupos: ${err.message}`);
    } finally {
      setFetchingGroups(false);
    }
  };

  const handleGroupSelect = (jid: string) => {
    const selected = groups.find(g => g.id === jid);
    setGroupJid(selected?.id ?? '');
    setGroupName(selected?.subject ?? '');
  };

  const handleSave = async () => {
    if (active && !groupJid) {
      showFeedback('error', 'Selecione um grupo antes de ativar o envio automático.');
      return;
    }
    setSaving(true);
    try {
      await upsertWhatsappConfig({ organizationId: orgId, groupJid, groupName, active });
      showFeedback('success', 'Configuração salva com sucesso!');
    } catch (err: any) {
      showFeedback('error', `Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!groupJid) {
      showFeedback('error', 'Salve a configuração com um grupo selecionado antes de enviar o teste.');
      return;
    }
    setSendingTest(true);
    try {
      await sendTestReminder(orgId);
      showFeedback('success', 'Mensagem de teste enviada! Verifique o grupo do WhatsApp.');
    } catch (err: any) {
      showFeedback('error', `Erro ao enviar teste: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <MessageCircle className="text-green-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Integração WhatsApp</h1>
          <p className="text-slate-500 text-sm">
            Envio automático de lembretes para líderes via WhatsApp
          </p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl mb-6 text-sm font-medium
            ${feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
            }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle size={18} className="shrink-0" />
            : <AlertCircle size={18} className="shrink-0" />
          }
          {feedback.message}
        </div>
      )}

      {/* Step: not_connected */}
      {step === 'not_connected' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="text-green-600" size={32} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Conecte seu WhatsApp</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Escaneie o QR code com o celular que receberá os lembretes das células.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            <MessageCircle size={18} />
            Conectar WhatsApp
          </button>
        </div>
      )}

      {/* Step: connecting (loading QR) */}
      {step === 'connecting' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 className="animate-spin text-green-600 mx-auto mb-4" size={40} />
          <p className="text-slate-600 font-medium">Gerando QR code...</p>
        </div>
      )}

      {/* Step: qr_shown */}
      {step === 'qr_shown' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 text-center border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 mb-1">Escaneie o QR code</h2>
            <p className="text-slate-500 text-sm">
              Abra o WhatsApp → Dispositivos vinculados → Vincular um dispositivo
            </p>
          </div>

          <div className="p-6 flex flex-col items-center gap-4">
            {qrExpired ? (
              <div className="w-64 h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-500">
                <AlertCircle size={32} className="text-slate-400" />
                <p className="text-sm font-medium">QR code expirado</p>
                <p className="text-xs text-center px-4">Clique em "Gerar novo QR" para tentar novamente</p>
              </div>
            ) : (
              qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 rounded-xl border border-slate-200"
                />
              )
            )}

            {!qrExpired && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                Aguardando conexão...
              </div>
            )}

            <button
              type="button"
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Gerar novo QR code
            </button>
          </div>
        </div>
      )}

      {/* Step: connected */}
      {step === 'connected' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Status badge */}
          <div className="p-4 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm font-semibold text-green-800">WhatsApp conectado</span>
          </div>

          {/* Grupo de destino */}
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">Grupo de Destino</h2>
            <div className="flex gap-2">
              <select
                value={groupJid}
                onChange={e => handleGroupSelect(e.target.value)}
                disabled={groups.length === 0}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {groups.length === 0
                    ? 'Clique em "Buscar Grupos" primeiro'
                    : 'Selecione o grupo'
                  }
                </option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.subject}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleFetchGroups}
                disabled={fetchingGroups}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors disabled:opacity-60 shrink-0"
              >
                {fetchingGroups
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Search size={14} />
                }
                {fetchingGroups ? 'Buscando...' : 'Buscar Grupos'}
              </button>
            </div>
            {groupJid && groupName && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <CheckCircle size={12} /> Grupo selecionado: <strong>{groupName}</strong>
              </p>
            )}
          </div>

          {/* Ativação */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-700">Envio Automático Diário</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Envia lembretes todo dia ao meio-dia (horário de Brasília) para células com relatório pendente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(a => !a)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${active ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                    ${active ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="p-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {saving
                ? <Loader2 size={18} className="animate-spin" />
                : <Save size={18} />
              }
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest || !groupJid}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {sendingTest
                ? <Loader2 size={18} className="animate-spin" />
                : <Send size={18} />
              }
              {sendingTest ? 'Enviando...' : 'Enviar Teste Agora'}
            </button>
          </div>

          {/* Reconectar */}
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={handleConnect}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              Reconectar WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Info box sobre o cron (só quando conectado) */}
      {step === 'connected' && <CronInstructions />}
    </div>
  );
};

export default WhatsappSettings;
