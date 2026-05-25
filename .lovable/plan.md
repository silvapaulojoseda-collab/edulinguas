## Plano de implementação — EduLinguas AI (backend real)

Vamos transformar o protótipo atual (mock + localStorage) numa plataforma real com autenticação Supabase, RBAC multi-escola, OCR assíncrono e IA pedagógica via Lovable AI Gateway. Tudo com RLS estrito.

### 1. Autenticação real (substitui o mock em `src/lib/auth.tsx`)
- Habilitar Email/Password + Google (via `lovable.auth.signInWithOAuth`).
- Tabela `profiles` (nome, email, avatar) ligada a `auth.users` via trigger `on_auth_user_created`.
- Tabela `escolas` (id, nome, inep, cidade, uf).
- Enum `app_role`: `gestor | coordenador | professor`.
- Tabela `user_roles` (user_id, escola_id, role) — **nunca** no profile (anti-escalada).
- Função `SECURITY DEFINER public.has_role(_user_id, _escola_id, _role)` + `public.is_member_of(_user_id, _escola_id)`.
- Tabela `user_escolas` para usuários que atuam em múltiplas escolas; escola "ativa" guardada em `profiles.escola_ativa_id`.
- Tela `/login` reescrita com Supabase Auth + Google; nova `/signup`; `/reset-password` (rota pública obrigatória).
- Layout `_authenticated` com `beforeLoad` redirecionando para `/login`; gate adicional aguardando `supabase.auth.getUser()` antes de loaders protegidos.
- `onAuthStateChange` no `__root` invalidando router + react-query.

### 2. Modelo de dados multi-escola (com RLS)
Todas as tabelas ganham `escola_id` e políticas baseadas em `is_member_of(auth.uid(), escola_id)`:
- `alunos` (migrar a tabela atual: adicionar `escola_id`, FK, índices).
- `turmas` (id, escola_id, nome, serie, curso).
- `avaliacoes` (id, escola_id, titulo, tipo, disciplina, descritores[], data).
- `gabaritos` (avaliacao_id, ordem, alternativa_correta, descritor).
- `lotes_ocr` (id, escola_id, avaliacao_id, turma_id, status: `pending|processing|done|error`, total, processados, erros, criado_por).
- `cartoes_ocr` (lote_id, aluno_id nullable, file_path, qr_lido, marcacoes jsonb, status, motivo_erro, acertos, total).
- `respostas` (cartao_id, questao_ordem, marcada, correta, descritor).
- `pareceres_ia` (já existe — adicionar `escola_id`, `avaliacao_id`, `turma_id`, `gerado_por`, modelo usado).
- `notificacoes` — adicionar `user_id`, `escola_id`.

RLS:
- SELECT/INSERT/UPDATE/DELETE restritos a membros da escola.
- Gestor/coordenador podem ver tudo da escola; professor vê só turmas atribuídas (`professor_turmas`).
- Substituir as políticas atuais `USING (true)` (inseguras) por políticas baseadas em role.

### 3. Storage para cartões
- Bucket `cartoes-resposta` (privado).
- Policies: upload e leitura apenas para membros da escola dono do lote (path = `{escola_id}/{lote_id}/{arquivo}`).

### 4. Pipeline OCR + QR assíncrono (server functions, sem Edge Functions)
- `src/lib/ocr.functions.ts`:
  - `criarLoteOcr({ avaliacaoId, turmaId, arquivos[] })` — cria lote `pending`, faz upload via `supabaseAdmin` para o bucket, dispara processamento.
  - `processarLote({ loteId })` — server fn que roda em background (fire-and-forget via `setTimeout` na worker, marca `processing` → `done`).
  - Para cada cartão:
    1. Lê imagem do storage.
    2. Detecta QR com `jsqr` (puro JS, compatível com Workers) → identifica `aluno_id`.
    3. Envia imagem ao **Lovable AI Gateway** (`google/gemini-2.5-flash`, multimodal) com prompt estruturado pedindo JSON `{ marcacoes: [{questao, alternativa, dupla}] }`.
    4. Compara com `gabaritos` → grava `respostas`, `acertos`.
    5. Atualiza contadores do lote; cria `notificacoes` ao finalizar.
- `getStatusLote({ loteId })` — polling no front (React Query refetchInterval) até `done`.
- Tela `/ocr` reescrita: upload real (dropzone → supabase storage via server fn), barra de progresso por lote, tabela em tempo real (Realtime na tabela `cartoes_ocr`).

### 5. IA Pedagógica real (Lovable AI Gateway)
- `src/lib/ia.functions.ts`:
  - `gerarParecer({ avaliacaoId, turmaId })` — agrega desempenho por descritor, monta prompt e chama `openai/gpt-5.2` via gateway, salva em `pareceres_ia` (texto + JSON estruturado com `pontos_fortes`, `gargalos`, `plano_intervencao`, `descritores_criticos`, `previsao_spaece`).
  - `perguntarIA({ turmaId, pergunta, historico })` — chat contextualizado com dados da turma (RAG simples por SQL agregando respostas).
- Tela `/ia` consome dados reais; chat com streaming opcional.
- Tratamento de erros 429/402 do gateway com fallback amigável.

### 6. Segurança — corrigir tudo
- Remover políticas demo `USING (true)` em `alunos`, `gabaritos_ocr`, `notificacoes`, `pareceres_ia` (eram públicas — qualquer um lia tudo).
- Habilitar **Leaked Password Protection** (HIBP) via `configure_auth`.
- Validação Zod em todas as server fns (tamanhos máximos, regex).
- Storage privado com path enforcement.
- `requireSupabaseAuth` em todas as server fns; `attachSupabaseAuth` em `src/start.ts`.
- Rodar `supabase--linter` ao final e corrigir warnings.
- Atualizar `security--update_memory` com modelo de acesso.

### 7. UX
- Banner "modo demo" removido; tela `/login` com Google + email/senha + link "esqueci a senha".
- Seletor de escola no header (para usuários multi-escola).
- Toasts (`sonner`) para criação de lote, conclusão de OCR, geração de parecer.
- Loading states reais via Suspense/React Query.

### Detalhes técnicos
```text
src/
  routes/
    login.tsx               # email+senha + Google
    signup.tsx              # novo
    reset-password.tsx      # novo (público)
    _authenticated.tsx      # layout gate
    _authenticated/
      index.tsx             # dashboard
      alunos.tsx
      professores.tsx
      avaliacoes.tsx
      ocr.tsx               # real-time
      ia.tsx                # parecer + chat
      relatorios.tsx
      configuracoes.tsx
  lib/
    auth.tsx                # wrapper supabase + roles
    ocr.functions.ts        # createServerFn
    ocr.server.ts           # helpers (jsqr, parsing)
    ia.functions.ts         # gateway calls
    ia.server.ts            # prompts + agregações
    escola.functions.ts     # escolha de escola ativa
  integrations/supabase/    # gerados, intocados
```

Dependências novas: `jsqr` (QR puro JS, Worker-safe).
Modelos: `google/gemini-2.5-flash` (visão para OCR), `openai/gpt-5.2` (parecer).
Secrets: `LOVABLE_API_KEY` já existe — nada a pedir.

### Migração de dados
Os 415 alunos atuais (em `src/data/students.json`) são seedados numa escola padrão "EEEP Profa. Maria Dolores" via migration de seed após o usuário criar a primeira conta gestora.

### O que NÃO entra neste passo
- App mobile nativo (continua responsivo).
- Importação automática de novas planilhas (mantemos seed).
- Geração de PDF de relatórios (botões existem, geração real fica para próximo ciclo).

Posso seguir?
