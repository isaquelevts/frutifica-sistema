# 🎯 GUIA RÁPIDO: Deploy no Easy Panel

## ✅ Status Atual
- ✅ Git inicializado
- ✅ Primeiro commit realizado
- ✅ Arquivos de configuração criados
- ⏳ Aguardando conexão com GitHub

---

## 📋 PRÓXIMOS PASSOS

### **PASSO 1: Criar Repositório no GitHub** 🐙

1. Acesse: https://github.com/new
2. Nome do repositório: `frutifica-sistema` (ou o nome que preferir)
3. **NÃO** marque "Initialize with README"
4. Clique em **"Create repository"**

### **PASSO 2: Conectar o Repositório Local ao GitHub** 🔗

Copie e execute estes comandos no terminal:

```bash
cd "c:\Users\User\Downloads\celulai---gestão-de-células (2)\Frutifica sistema"

# Substitua SEU_USUARIO pelo seu usuário do GitHub
git remote add origin https://github.com/SEU_USUARIO/frutifica-sistema.git

git branch -M main

git push -u origin main
```

**Exemplo:**
Se seu usuário for `joaosilva`, o comando seria:
```bash
git remote add origin https://github.com/joaosilva/frutifica-sistema.git
```

---

### **PASSO 3: Configurar no Easy Panel** ⚙️

#### 3.1 Acessar Easy Panel
1. Acesse o painel da **Hostinger**
2. Vá em **VPS** → **Easy Panel**
3. Faça login

#### 3.2 Criar Novo Projeto
1. Clique em **"+ Create"** ou **"New Project"**
2. Selecione **"App"** → **"GitHub"**
3. Autorize o Easy Panel (se necessário)
4. Selecione o repositório: `frutifica-sistema`

#### 3.3 Configurações do Build

Preencha exatamente assim:

| Campo | Valor |
|-------|-------|
| **Name** | `frutifica` |
| **Source** | GitHub |
| **Repository** | `seu-usuario/frutifica-sistema` |
| **Branch** | `main` |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |
| **Output Directory** | `dist` |
| **Framework** | Vite (ou Static Site) |
| **Node Version** | 20 |

#### 3.4 Adicionar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```env
VITE_SUPABASE_URL=https://oohknmvhbgbqzhpyemvx.supabase.co
```

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vaGtubXZoYmdicXpocHllbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjQzODYsImV4cCI6MjA4MzgwMDM4Nn0.9k0ywvwYb7_Tx-JQaGvnO_B20ItyGSi0gZ7DyMq3Ues
```

**⚠️ IMPORTANTE:** Copie cada variável em um campo separado!

#### 3.5 Deploy! 🚀

1. Clique em **"Deploy"** ou **"Create & Deploy"**
2. Aguarde 2-5 minutos
3. Monitore os logs

---

### **PASSO 4: Configurar CORS no Supabase** 🔐

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: `oohknmvhbgbqzhpyemvx`
3. Vá em **Settings** → **API**
4. Role até **CORS Origins**
5. Adicione o domínio do Easy Panel (exemplo: `https://frutifica.easypanel.host`)
6. Salve

---

### **PASSO 5: Testar o Sistema** ✅

1. Acesse o domínio fornecido pelo Easy Panel
2. Teste o login
3. Verifique as funcionalidades principais

---

## 🔄 Atualizações Futuras

Sempre que fizer alterações no código:

```bash
git add .
git commit -m "Descrição da alteração"
git push origin main
```

O Easy Panel fará o deploy automaticamente! 🎉

---

## 🆘 Problemas Comuns

### ❌ Build falha com erro de memória
**Solução:** No Easy Panel, altere o Build Command para:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### ❌ Página em branco
**Solução:** 
1. Verifique o Console do navegador (F12)
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique se o CORS está configurado

### ❌ Erro de autenticação
**Solução:**
1. Verifique se as credenciais do Supabase estão corretas
2. Confirme que o CORS está configurado com o domínio correto

---

## 📞 Suporte

- **Documentação Easy Panel:** https://easypanel.io/docs
- **Documentação Supabase:** https://supabase.com/docs
- **Guia Completo:** `.agent/workflows/deploy-easypanel.md`

---

**🎊 Boa sorte com o deploy!**
