# 📊 Informações do Projeto Frutifica

## 🔑 Credenciais Supabase

**Project URL:** https://oohknmvhbgbqzhpyemvx.supabase.co
**Project ID:** oohknmvhbgbqzhpyemvx
**Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vaGtubXZoYmdicXpocHllbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjQzODYsImV4cCI6MjA4MzgwMDM4Nn0.9k0ywvwYb7_Tx-JQaGvnO_B20ItyGSi0gZ7DyMq3Ues

---

## 🌐 Links Importantes

- **Dashboard Supabase:** https://supabase.com/dashboard/project/oohknmvhbgbqzhpyemvx
- **Configurações de API:** https://supabase.com/dashboard/project/oohknmvhbgbqzhpyemvx/settings/api
- **Database:** https://supabase.com/dashboard/project/oohknmvhbgbqzhpyemvx/editor
- **Edge Functions:** https://supabase.com/dashboard/project/oohknmvhbgbqzhpyemvx/functions

---

## 🔧 Edge Functions Disponíveis

### create-leader-account
**Função:** Criar conta de líder com senha personalizada
**Endpoint:** https://oohknmvhbgbqzhpyemvx.supabase.co/functions/v1/create-leader-account

**Deploy:**
```bash
supabase functions deploy create-leader-account --project-ref oohknmvhbgbqzhpyemvx
```

---

## 🎨 Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript + Vite
- **Roteamento:** React Router DOM v7
- **Formulários:** React Hook Form + Zod
- **Dados:** TanStack Query (React Query)
- **Backend:** Supabase (Auth + Database + Edge Functions)
- **IA:** Google Gemini AI
- **Gráficos:** Recharts
- **Mapas:** Leaflet
- **Ícones:** Lucide React
- **CSV:** PapaParse

---

## 📁 Estrutura do Projeto

```
Frutifica sistema/
├── src/
│   ├── core/           # Componentes e lógica central
│   ├── features/       # Funcionalidades (generations, import, etc)
│   ├── routes/         # Configuração de rotas
│   └── ...
├── supabase/
│   └── functions/      # Edge Functions
├── .agent/
│   └── workflows/      # Workflows de automação
├── .env                # Variáveis de ambiente (NÃO COMMITAR)
├── .env.example        # Exemplo de variáveis
├── DEPLOY.md           # Guia de deploy
└── deploy.ps1          # Script de deploy
```

---

## 🚀 Comandos Úteis

### Desenvolvimento Local
```bash
npm run dev          # Iniciar servidor de desenvolvimento (porta 3000)
npm run build        # Build para produção
npm run preview      # Preview do build
```

### Git & Deploy
```bash
git status           # Ver status das alterações
git add .            # Adicionar todos os arquivos
git commit -m "msg"  # Fazer commit
git push origin main # Enviar para GitHub (trigger deploy)
```

### Supabase CLI
```bash
supabase login                                              # Login
supabase functions deploy create-leader-account --project-ref oohknmvhbgbqzhpyemvx
```

---

## 📝 Notas Importantes

1. **Nunca commite o arquivo `.env`** - Ele contém informações sensíveis
2. **Use `.env.example`** como referência para variáveis necessárias
3. **Configure CORS** no Supabase sempre que mudar de domínio
4. **Auto-deploy** está configurado - push no `main` = deploy automático
5. **Senha padrão** para novos líderes: `ibnc@2026` (pode ser customizada)

---

## 🔐 Segurança

- ✅ Variáveis de ambiente protegidas (.gitignore)
- ✅ RLS (Row Level Security) ativo no Supabase
- ✅ Autenticação via Supabase Auth
- ✅ Edge Functions para operações sensíveis
- ✅ CORS configurado

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte `DEPLOY.md` para guia de deploy
2. Consulte `.agent/workflows/deploy-easypanel.md` para detalhes técnicos
3. Verifique a documentação do Supabase: https://supabase.com/docs
4. Verifique a documentação do Easy Panel: https://easypanel.io/docs

---

**Última atualização:** 14/02/2026
