---
description: Deploy do Frutifica no Easy Panel (Hostinger VPS)
---

# Deploy do Sistema Frutifica no Easy Panel

Este guia detalha como fazer o deploy da aplicação React + Vite + Supabase no Easy Panel da Hostinger.

## Pré-requisitos

✅ Conta no GitHub com o repositório do projeto
✅ Acesso ao Easy Panel da Hostinger
✅ Credenciais do Supabase (URL e Anon Key)
✅ API Key do Gemini (se aplicável)

---

## Passo 1: Preparar o Repositório no GitHub

### 1.1 Verificar se o código está commitado

```bash
cd "c:\Users\User\Downloads\celulai---gestão-de-células (2)\Frutifica sistema"
git status
```

### 1.2 Se houver alterações não commitadas, fazer commit

```bash
git add .
git commit -m "Preparando para deploy no Easy Panel"
git push origin main
```

**Nota:** Certifique-se de que o arquivo `.env` está no `.gitignore` (não deve ser enviado ao GitHub).

---

## Passo 2: Configurar o Projeto no Easy Panel

### 2.1 Acessar o Easy Panel

1. Acesse o painel da Hostinger
2. Vá para **VPS** → **Easy Panel**
3. Faça login no Easy Panel

### 2.2 Criar um Novo Projeto

1. Clique em **"Create Project"** ou **"New Project"**
2. Selecione **"GitHub"** como fonte
3. Autorize o Easy Panel a acessar seu GitHub (se ainda não fez)
4. Selecione o repositório do projeto Frutifica

### 2.3 Configurar o Build

Configure as seguintes opções:

- **Framework/Preset:** `Vite` ou `Static Site`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node Version:** `18` ou `20` (recomendado)

---

## Passo 3: Configurar Variáveis de Ambiente

No Easy Panel, adicione as seguintes variáveis de ambiente:

### 3.1 Variáveis Obrigatórias

```
VITE_SUPABASE_URL=https://oohknmvhbgbqzhpyemvx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vaGtubXZoYmdicXpocHllbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjQzODYsImV4cCI6MjA4MzgwMDM4Nn0.9k0ywvwYb7_Tx-JQaGvnO_B20ItyGSi0gZ7DyMq3Ues
```

### 3.2 Variáveis Opcionais (se usar Gemini AI)

```
GEMINI_API_KEY=sua_chave_aqui
```

**Como adicionar:**
1. No painel do projeto, vá para **"Environment Variables"** ou **"Settings"**
2. Adicione cada variável com seu respectivo valor
3. Salve as configurações

---

## Passo 4: Configurar Domínio (Opcional)

### 4.1 Domínio Padrão

O Easy Panel fornecerá um domínio padrão como:
- `frutifica.easypanel.host`
- `seu-projeto.easypanel.app`

### 4.2 Domínio Customizado

Se você tiver um domínio próprio:

1. No Easy Panel, vá para **"Domains"**
2. Adicione seu domínio customizado
3. Configure os registros DNS no seu provedor de domínio:
   - **Tipo A:** Aponte para o IP da VPS
   - **Tipo CNAME:** Aponte para o domínio do Easy Panel

---

## Passo 5: Deploy Inicial

### 5.1 Iniciar o Deploy

1. Após configurar tudo, clique em **"Deploy"** ou **"Build & Deploy"**
2. Aguarde o processo de build (pode levar 2-5 minutos)
3. Monitore os logs para verificar se há erros

### 5.2 Verificar o Deploy

1. Acesse o domínio fornecido pelo Easy Panel
2. Teste o login e funcionalidades principais
3. Verifique se a conexão com o Supabase está funcionando

---

## Passo 6: Configurar Auto-Deploy (Recomendado)

### 6.1 Habilitar Deploy Automático

1. No Easy Panel, vá para **"Settings"** ou **"Deployment"**
2. Ative **"Auto Deploy"** ou **"Deploy on Push"**
3. Selecione a branch: `main` ou `master`

Agora, sempre que você fizer `git push`, o Easy Panel fará o deploy automaticamente!

---

## Passo 7: Configurar Supabase Edge Functions (Se Aplicável)

Se você usa Edge Functions do Supabase (como `create-leader-account`):

### 7.1 Deploy das Edge Functions

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Fazer deploy das functions
supabase functions deploy create-leader-account --project-ref oohknmvhbgbqzhpyemvx
```

### 7.2 Configurar CORS

Adicione o domínio do Easy Panel nas configurações de CORS do Supabase:

1. Acesse o dashboard do Supabase
2. Vá para **Settings** → **API**
3. Em **CORS Origins**, adicione:
   - `https://seu-dominio.easypanel.host`
   - `https://seu-dominio-customizado.com` (se aplicável)

---

## Passo 8: Monitoramento e Logs

### 8.1 Visualizar Logs

No Easy Panel:
1. Vá para **"Logs"** ou **"Deployments"**
2. Visualize os logs de build e runtime
3. Identifique possíveis erros

### 8.2 Reiniciar a Aplicação

Se necessário:
1. Vá para **"Actions"** ou **"Settings"**
2. Clique em **"Restart"** ou **"Redeploy"**

---

## Troubleshooting

### Problema: Build falha com erro de memória

**Solução:** Aumente o limite de memória do Node.js

Altere o **Build Command** para:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Problema: Variáveis de ambiente não são reconhecidas

**Solução:** 
- Certifique-se de que todas as variáveis começam com `VITE_`
- Reinicie o deploy após adicionar variáveis

### Problema: Página em branco após deploy

**Solução:**
1. Verifique os logs do navegador (F12 → Console)
2. Verifique se o `base` está correto no `vite.config.ts`
3. Verifique se as variáveis de ambiente estão corretas

### Problema: Erro de CORS

**Solução:**
- Adicione o domínio do Easy Panel nas configurações de CORS do Supabase
- Verifique se as URLs estão corretas (https vs http)

---

## Comandos Úteis

### Fazer deploy manual (local)

```bash
# Build local para testar
npm run build

# Preview do build
npm run preview
```

### Atualizar o código em produção

```bash
git add .
git commit -m "Descrição das alterações"
git push origin main
# O Easy Panel fará o deploy automaticamente (se auto-deploy estiver ativo)
```

---

## Checklist Final

- [ ] Código commitado e enviado ao GitHub
- [ ] Projeto criado no Easy Panel
- [ ] Variáveis de ambiente configuradas
- [ ] Build executado com sucesso
- [ ] Aplicação acessível via domínio
- [ ] Login funcionando corretamente
- [ ] Conexão com Supabase OK
- [ ] Auto-deploy configurado
- [ ] CORS configurado no Supabase
- [ ] Edge Functions deployadas (se aplicável)

---

## Recursos Adicionais

- **Documentação Easy Panel:** https://easypanel.io/docs
- **Documentação Vite:** https://vitejs.dev/guide/static-deploy.html
- **Documentação Supabase:** https://supabase.com/docs

---

**Parabéns! 🎉 Seu sistema Frutifica está no ar!**
