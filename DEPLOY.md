# 🚀 Deploy Rápido - Easy Panel

## Passos Resumidos

### 1️⃣ Preparar Repositório GitHub

```bash
git add .
git commit -m "Deploy para Easy Panel"
git push origin main
```

### 2️⃣ Configurar no Easy Panel

1. **Criar Projeto:**
   - Framework: `Vite` ou `Static Site`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node Version: `18` ou `20`

2. **Adicionar Variáveis de Ambiente:**
   ```
   VITE_SUPABASE_URL=https://oohknmvhbgbqzhpyemvx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vaGtubXZoYmdicXpocHllbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjQzODYsImV4cCI6MjA4MzgwMDM4Nn0.9k0ywvwYb7_Tx-JQaGvnO_B20ItyGSi0gZ7DyMq3Ues
   ```

3. **Deploy:** Clique em "Deploy" e aguarde!

### 3️⃣ Configurar CORS no Supabase

Adicione o domínio do Easy Panel em:
- Supabase Dashboard → Settings → API → CORS Origins

---

📖 **Guia Completo:** Veja `.agent/workflows/deploy-easypanel.md`
