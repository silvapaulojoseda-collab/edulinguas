import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs'; const students = JSON.parse(fs.readFileSync('/dev-server/src/data/students.json','utf8'));

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const escolaId = '00000000-0000-0000-0000-00000000e001';

// Clear existing demo alunos
await supa.from('alunos').delete().is('escola_id', null);
await supa.from('alunos').delete().eq('escola_id', escolaId);

// Create turmas
const turmaNomes = [...new Set(students.map(s => s.turma))];
const turmasPayload = turmaNomes.map(nome => {
  const [serie, ...curso] = nome.split(' ');
  return { escola_id: escolaId, nome, serie, curso: curso.join(' '), ano_letivo: 2026 };
});
const { data: turmas, error: tErr } = await supa.from('turmas').upsert(turmasPayload, { onConflict: 'escola_id,nome', ignoreDuplicates: false }).select();
if (tErr) { console.error('turmas err', tErr); process.exit(1); }
const turmaMap = Object.fromEntries(turmas.map(t => [t.nome, t.id]));

const rows = students.map(s => ({
  matricula: String(s.matricula),
  nome: s.nome,
  turma: s.turma,
  media_geral: s.nota,
  progresso_spaece: Math.round(220 + s.nota * 1.4),
  escola_id: escolaId,
  turma_id: turmaMap[s.turma] ?? null,
}));

// insert in chunks of 200
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const { error } = await supa.from('alunos').insert(chunk);
  if (error) { console.error('insert err', error); process.exit(1); }
}
console.log('Seeded', rows.length, 'alunos and', turmas.length, 'turmas');
