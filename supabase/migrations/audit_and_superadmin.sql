-- ============================================================
-- FRUTIFICA — AUDITORIA DE SEGURANÇA + SUPERADMIN
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SEÇÃO 0: LEITURA PÚBLICA DE ORGANIZAÇÕES
-- Necessário para a página de cadastro de líderes (/cadastro-lider/:orgId)
-- que é pública (sem autenticação) e precisa buscar o nome da organização.
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations' AND policyname = 'anon_read_organizations'
  ) THEN
    CREATE POLICY "anon_read_organizations" ON organizations
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 1: VERIFICAÇÃO DE RLS
-- Execute as queries abaixo para verificar o estado atual
-- ============================================================

-- 1.1 Verificar todas as policies existentes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 1.2 Verificar quais tabelas têm RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- SEÇÃO 2: FUNÇÃO AUXILIAR get_my_org_id (verificar/criar)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SEÇÃO 3: FUNÇÃO AUXILIAR is_superadmin
-- ============================================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND 'superadmin' = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SEÇÃO 4: POLICIES DO SUPERADMIN
-- Execute APENAS as que não existirem ainda
-- ============================================================

-- 4.1 organizations — superadmin vê tudo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations'
    AND policyname = 'superadmin_full_access_organizations'
  ) THEN
    CREATE POLICY "superadmin_full_access_organizations" ON organizations
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.2 profiles — superadmin vê todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'superadmin_full_access_profiles'
  ) THEN
    CREATE POLICY "superadmin_full_access_profiles" ON profiles
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.3 cells — superadmin vê todas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cells'
    AND policyname = 'superadmin_full_access_cells'
  ) THEN
    CREATE POLICY "superadmin_full_access_cells" ON cells
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.4 members — superadmin vê todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'members'
    AND policyname = 'superadmin_full_access_members'
  ) THEN
    CREATE POLICY "superadmin_full_access_members" ON members
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.5 reports — superadmin vê todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reports'
    AND policyname = 'superadmin_full_access_reports'
  ) THEN
    CREATE POLICY "superadmin_full_access_reports" ON reports
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.6 generations — superadmin vê todas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generations'
    AND policyname = 'superadmin_full_access_generations'
  ) THEN
    CREATE POLICY "superadmin_full_access_generations" ON generations
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.7 cultos — superadmin vê todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cultos'
    AND policyname = 'superadmin_full_access_cultos'
  ) THEN
    CREATE POLICY "superadmin_full_access_cultos" ON cultos
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.8 visitantes — superadmin vê todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'visitantes'
    AND policyname = 'superadmin_full_access_visitantes'
  ) THEN
    CREATE POLICY "superadmin_full_access_visitantes" ON visitantes
      FOR ALL
      USING (is_superadmin());
  END IF;
END $$;

-- 4.9 cell_leaders — superadmin vê todos (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cell_leaders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'cell_leaders'
      AND policyname = 'superadmin_full_access_cell_leaders'
    ) THEN
      EXECUTE 'CREATE POLICY "superadmin_full_access_cell_leaders" ON cell_leaders
        FOR ALL
        USING (is_superadmin())';
    END IF;
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 5: FUNÇÃO PARA DELETAR ORGANIZAÇÃO EM CASCATA
-- ============================================================

CREATE OR REPLACE FUNCTION delete_organization_cascade(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verificar que quem chamou é superadmin
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Apenas superadmin pode deletar organizações';
  END IF;

  -- Deletar em ordem (respeitando FKs)
  DELETE FROM visitantes WHERE organization_id = org_id;
  DELETE FROM cultos WHERE organization_id = org_id;
  DELETE FROM reports WHERE organization_id = org_id;

  -- cell_leaders (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cell_leaders') THEN
    DELETE FROM cell_leaders WHERE cell_id IN (
      SELECT id FROM cells WHERE organization_id = org_id
    );
  END IF;

  DELETE FROM members WHERE organization_id = org_id;
  DELETE FROM cells WHERE organization_id = org_id;
  DELETE FROM generations WHERE organization_id = org_id;

  -- Deletar profiles (os auth.users são deletados via Edge Function separada)
  DELETE FROM profiles WHERE organization_id = org_id;

  -- Deletar a organização
  DELETE FROM organizations WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEÇÃO 6: DEFINIR SEU USUÁRIO COMO SUPERADMIN
-- SUBSTITUA o email abaixo pelo seu email real
-- ============================================================

-- UPDATE profiles
-- SET roles = array_append(roles, 'superadmin')
-- WHERE email = 'seu-email@exemplo.com';

-- ============================================================
-- SEÇÃO 7: VERIFICAÇÃO FINAL
-- Rode após executar tudo para confirmar o estado
-- ============================================================

-- Verificar se is_superadmin() foi criada
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('is_superadmin', 'get_my_org_id', 'delete_organization_cascade');

-- Verificar policies do superadmin
SELECT tablename, policyname FROM pg_policies
WHERE policyname LIKE 'superadmin_%'
ORDER BY tablename;
