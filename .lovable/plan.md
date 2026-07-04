# Auditoria & Estabilização — EduLinguas AI

Escopo grande demais para uma única rodada sem quebrar o que já funciona. Proposta de execução em **6 fases sequenciais**, cada uma entregue, testada e validada antes da próxima. Você aprova o plano e eu começo pela Fase 1 imediatamente.

## Fase 1 — Auditoria + Autenticação & Perfil dinâmico
- Varredura completa: listar todos os mocks, nomes hardcoded, `localStorage` indevido, imports quebrados, rotas órfãs, dados fictícios em `data/students.json`, etc.
- Auth: validar fluxos de login email/senha, signup, Google (broker Lovable), reset password, persistência de sessão, listener único em `__root.tsx`.
- Perfil: salvar nome/avatar em `profiles`, refletir em Sidebar / Header / Dashboard / Configurações via `useAuth()`. Fallback "Usuário".
- Escola ativa: garantir persistência em `profiles.escola_ativa_id` e troca instantânea.
- Remover qualquer leitura de JSON local de alunos/turmas.

## Fase 2 — Banco, RLS e integridade
- Auditoria de FKs, índices, constraints, RLS em todas as 17 tabelas.
- Migration corretiva: faltantes de `ON DELETE`, índices em colunas de filtro (`alunos.turma_id`, `respostas.cartao_id`, etc.), policies inconsistentes.
- Linter Supabase → resolver findings críticos.
- Isolamento por escola validado em cada policy via `can_access_school`.

## Fase 3 — CRUDs (Alunos, Turmas, Cursos, Professores, Avaliações)
- Revisar cada server fn: validação Zod, tratamento de erro, mensagens em PT-BR, toasts consistentes.
- Eliminar duplicidades (matrícula), validar relacionamentos, prevenir órfãos via FK `ON DELETE`.
- React Query: invalidations corretas em todas as mutations.

## Fase 4 — Gabaritos + Avaliações (módulo completo)
- CRUD de gabaritos, import/export Excel (xlsx), associação com avaliação.
- Geração de cartões-resposta com QR assinado (HMAC já existe em `qr.server.ts`).
- PDF de cartões (jsPDF) — gerar lote por turma/avaliação.
- Validação: ordem de questões, alternativas A–E, descritor opcional.

## Fase 5 — OCR & Correção automática
- Revisar pipeline em `ocr.functions.ts` + `ocr.server.ts`.
- Realtime status do lote (Supabase Realtime no `lotes_ocr`).
- Tratamento de QR inválido, dupla marcação, aluno não encontrado.
- Cálculo de notas → persistir em `respostas` + agregado.

## Fase 6 — Relatórios, UX e polish final
- Relatórios reais (turma, aluno, avaliação, descritor) com exportação CSV e PDF.
- Loading states, empty states, toasts, responsividade mobile (485px atual).
- Remoção final de mocks remanescentes.
- Checklist de testes manual + relatório final com itens 1–7 que você pediu.

## Observações técnicas
- Sem mexer em `src/integrations/supabase/*` auto-gerados.
- Toda mudança de schema via `supabase--migration` (com GRANTs).
- `SUPABASE_SERVICE_ROLE_KEY` não é acessível no Lovable Cloud — `qr.server.ts` usa essa chave para HMAC; vou trocar para um segredo dedicado `QR_HMAC_SECRET` na Fase 4 para não quebrar caso a chave rotacione.

## Pergunta antes de começar
Posso começar pela **Fase 1** agora? Ou prefere reordenar (ex.: priorizar Gabaritos/OCR antes de CRUDs)?