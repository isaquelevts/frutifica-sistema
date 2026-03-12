import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Save, Send, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import {
  getWhatsappConfig,
  upsertWhatsappConfig,
  fetchWhatsappGroups,
  sendTestReminder,
  WhatsappConfig,
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

const WhatsappSettings: React.FC = () => {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [groups, setGroups] = useState<WhatsappGroup[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState<WhatsappConfig>({
    organizationId: orgId,
    evolutionApiUrl: '',
    apiKey: '',
    instanceName: '',
    groupJid: '',
    groupName: '',
    active: false,
  });

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      setLoading(true);
      const config = await getWhatsappConfig(orgId);
      if (config) {
        setForm(config);
        // Se já tinha grupo salvo, adiciona na lista para aparecer no select
        if (config.groupJid && config.groupName) {
          setGroups([{ id: config.groupJid, subject: config.groupName }]);
        }
      }
      setLoading(false);
    };
    load();
  }, [orgId]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleFetchGroups = async () => {
    if (!form.evolutionApiUrl || !form.apiKey || !form.instanceName) {
      showFeedback('error', 'Preencha a URL da API, a API Key e o Nome da Instância antes de buscar grupos.');
      return;
    }
    setFetchingGroups(true);
    try {
      const result = await fetchWhatsappGroups(form.evolutionApiUrl, form.apiKey, form.instanceName);
      setGroups(result);
      if (result.length === 0) {
        showFeedback('error', 'Nenhum grupo encontrado. Verifique se a instância está conectada e tem grupos.');
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
    setForm(f => ({
      ...f,
      groupJid: selected?.id ?? '',
      groupName: selected?.subject ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.evolutionApiUrl || !form.apiKey || !form.instanceName) {
      showFeedback('error', 'URL da API, API Key e Nome da Instância são obrigatórios.');
      return;
    }
    if (form.active && !form.groupJid) {
      showFeedback('error', 'Selecione um grupo do WhatsApp antes de ativar o envio automático.');
      return;
    }
    setSaving(true);
    try {
      await upsertWhatsappConfig({ ...form, organizationId: orgId });
      showFeedback('success', 'Configuração salva com sucesso!');
    } catch (err: any) {
      showFeedback('error', `Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!form.groupJid) {
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

  if (loading) {
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Seção: Credenciais */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Credenciais da Evolution API</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                URL da Evolution API
              </label>
              <input
                type="url"
                placeholder="https://evolution.seudominio.com"
                value={form.evolutionApiUrl}
                onChange={e => setForm(f => ({ ...f, evolutionApiUrl: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Sua API Key da Evolution"
                  value={form.apiKey}
                  onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nome da Instância
              </label>
              <input
                type="text"
                placeholder="Ex: frutifica-principal"
                value={form.instanceName}
                onChange={e => setForm(f => ({ ...f, instanceName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">
                O nome da instância configurada no painel da Evolution API
              </p>
            </div>

            <button
              type="button"
              onClick={handleFetchGroups}
              disabled={fetchingGroups}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors disabled:opacity-60"
            >
              {fetchingGroups
                ? <Loader2 size={16} className="animate-spin" />
                : <Search size={16} />
              }
              {fetchingGroups ? 'Buscando...' : 'Buscar Grupos'}
            </button>
          </div>
        </div>

        {/* Seção: Grupo de destino */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Grupo de Destino</h2>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Grupo do WhatsApp
            </label>
            <select
              value={form.groupJid ?? ''}
              onChange={e => handleGroupSelect(e.target.value)}
              disabled={groups.length === 0}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
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
            {form.groupJid && form.groupName && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle size={12} /> Grupo selecionado: <strong>{form.groupName}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Seção: Ativação */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-700">Envio Automático Diário</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Envia lembretes todo dia ao meio-dia (horário de Brasília) para as células com relatório pendente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${form.active ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${form.active ? 'translate-x-6' : 'translate-x-1'}`}
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
            disabled={sendingTest || !form.groupJid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {sendingTest
              ? <Loader2 size={18} className="animate-spin" />
              : <Send size={18} />
            }
            {sendingTest ? 'Enviando...' : 'Enviar Teste Agora'}
          </button>
        </div>
      </div>

      {/* Info box sobre o cron */}
      <CronInstructions />
    </div>
  );
};

export default WhatsappSettings;
