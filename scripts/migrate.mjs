import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __dir = dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.sistemafrutifica.com/api/migrate';
const SECRET = 'frutifica2026';

function load(file) {
  try {
    const raw = JSON.parse(readFileSync(join(__dir, 'data', file), 'utf8'));
    // Supabase json_agg wrapper: [{json_agg: [...]}]
    if (Array.isArray(raw) && raw[0]?.json_agg) return raw[0].json_agg ?? [];
    if (Array.isArray(raw)) return raw;
    return [];
  } catch {
    console.warn(`  ⚠️  ${file} não encontrado, pulando.`);
    return [];
  }
}

const DEFAULT_HASH = '$2b$10$N/ZFgjQg0AO2XTtBULgdKOibJL.mXMR3q9kYcyQ4w2C4WDkPt0T4K'; // bcrypt de '123456'

const payload = {
  secret: SECRET,
  organizations: load('organizations.json'),
  profiles:      load('profiles.json').map(p => ({ ...p, password_hash: p.password_hash ?? DEFAULT_HASH })),
  cells:         load('cells.json'),
  generations:   load('generations.json'),
  members:       load('members.json'),
  reports:       load('reports.json'),
};

console.log('\n📦 Dados prontos para migrar:');
for (const [k, v] of Object.entries(payload)) {
  if (Array.isArray(v)) console.log(`   ${k}: ${v.length} registros`);
}

const body = JSON.stringify(payload);
const url = new URL(API_URL);

console.log('\n🚀 Enviando para a API...\n');

const req = https.request({
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.ok) {
      console.log('✅ Migração concluída!');
      console.log('   Importado:', result.imported);
    } else {
      console.error('❌ Erro:', result.message);
    }
  });
});

req.on('error', e => console.error('❌ Erro de conexão:', e.message));
req.write(body);
req.end();
