# Auditoria EduLinguas AI — Plano de Execução por Fases

O escopo solicitado (17 áreas, ~80 funcionalidades) é equivalente a 4–6 semanas de trabalho de uma equipe. Não cabe em uma única iteração sem comprometer qualidade, segurança e estabilidade do que já existe. Proponho **fasear** a entrega para garantir que cada bloco saia funcional, testado e seguro, em vez de quebrar tudo de uma vez.

## Estado atual (auditoria rápida)

Já está pronto:
- Auth real (email/senha + Google via broker Lovable), `profiles`, `user_roles`, `app_role`, `has_role`, `is_member_of`, `is_staff_of`, `teaches_turma`
- Tabelas: `escolas`, `turmas`, `alunos`, `avaliacoes`, `gabaritos`, `lotes_ocr`, `cartoes_ocr`, `respostas`, `pareceres_ia`, `notificacoes`, `professor_turmas` — todas com RLS por escola/role (sem `USING (true)`)
- Bucket privado `cartoes-resposta`
- Server functions: OCR (`criarLoteOcr`, `getStatusLote`, processamento async com QR via `jsqr` + visão Gemini), IA (`gerarParecer` GPT-5.2, `perguntarIA`), escolas (`criarEscola`, `listarMinhasEscolas`, `ativarEscola`)
- Layout responsivo (mobile drawer + bottom nav + sidebar desktop)
- Telas funcionais: dashboard, alunos, avaliações, OCR, IA, configurações

Faltando / parcial:
- Convites de professor, audit logs, dashboard executivo agregado multi-escola
- CRUD completo de gabaritos com import/export Excel
- Geração de planilhas com QR (PDF/Excel) para impressão
- Buckets adicionais (`reports`, `school-assets`, `qr-templates`)
- Realtime nas notificações
- Exportações PDF/Excel institucionais
- Testes automatizados

## Fases propostas

### Fase 1 — Fundação de segurança e dados (1 iteração)
- Tabelas novas: `teacher_invites`, `invite_logs`, `audit_logs`, `user_escolas` (view sobre `user_roles`)
- Função SQL `can_access_school()`
- Trigger genérica de `updated_at` nas tabelas que faltam
- Índices de performance (`alunos.escola_id`, `cartoes_ocr.lote_id`, `respostas.cartao_id`, etc.)
- Buckets: `reports` (privado), `school-assets` (privado), `qr-templates` (privado) — com RLS por `escola_id` no path
- Revisão das policies existentes (já estão corretas, mas confirmar gaps de UPDATE/DELETE em `notificacoes` e `escolas`)

### Fase 2 — Convite de professores (1 iteração)
- Server fns: `convidarProfessor`, `aceitarConvite`, `reenviarConvite`, `cancelarConvite`, `listarConvites`
- Token JWT assinado + expiração 7 dias
- Email via Lovable Cloud Emails (requer setup de domínio — vou pedir confirmação)
- Tela `/configuracoes` → aba "Professores": listar/convidar/revogar
- Rota pública `/convite/$token` para aceitar
- Logs em `invite_logs`

### Fase 3 — Gabaritos + QR + Planilhas (1 iteração)
- CRUD `/gabaritos` (criar, editar, duplicar, excluir, importar Excel via SheetJS, exportar)
- Geração de QR por aluno (`qrcode` lib) contendo `{escolaId, avaliacaoId, alunoId, hash HMAC, v:1}`
- Validação HMAC no pipeline OCR (rejeita QR de outra escola)
- Geração de PDF de planilha de resposta (pdf-lib) com QR + cabeçalho institucional
- Export Excel da lista de alunos × avaliação

### Fase 4 — OCR avançado + IA com auditoria (1 iteração)
- Pipeline OCR: detecção de dupla marcação, questões em branco, score de confiança, motivo de erro padronizado
- Métricas em `audit_logs`: tempo de processamento por cartão, taxa de sucesso por lote
- IA: versionar prompts em `pareceres_ia.dados.prompt_version`, registrar modelo/tempo/tokens estimados
- Tratamento explícito 429/402 já existe — adicionar retry com backoff

### Fase 5 — Dashboard executivo + Notificações realtime + Exports (1 iteração)
- Dashboard `/relatorios` com KPIs agregados (média geral, por escola, por turma, descritores críticos, ranking), filtros período/escola/turma/avaliação
- Realtime em `notificacoes` (`ALTER PUBLICATION supabase_realtime ADD TABLE`)
- Triggers de notificação: OCR concluído/erro, parecer gerado, convite aceito
- Exportações PDF institucional (pdf-lib) + Excel + CSV com logo

### Fase 6 — Observabilidade + Testes + Polimento UX (1 iteração)
- Skeleton loaders, estados vazios e mensagens de erro padronizadas em todas as telas
- Captura de erros via error boundaries em todas as rotas com loader
- Testes Vitest: server fns (escola, ocr, ia, convite), validação Zod, RLS via SQL
- Relatório final de maturidade

## Diretrizes técnicas

- Tudo em `createServerFn` + `requireSupabaseAuth` (sem Edge Functions novas)
- Validação Zod em 100% das entradas
- Sem `USING (true)` em nenhuma policy nova
- Sem mocks, sem dados fictícios
- Code splits por rota, sem regressão no que já está funcional

## O que preciso confirmar para começar

1. **Por onde começar?** Sugiro Fase 1 + Fase 2 numa só rodada (são as fundações; sem isso, audit/convites não existem). As demais fases viriam em iterações seguintes a seu pedido.
2. **Email para convites**: usar domínio Lovable padrão (`@updates.lovable.dev`) ou configurar domínio próprio agora? O segundo exige DNS verificado.
3. **Posso seguir com Fase 1 + Fase 2 agora?**

Se aprovar este plano, começo já pelas migrations da Fase 1 e implemento o fluxo de convites na sequência.
