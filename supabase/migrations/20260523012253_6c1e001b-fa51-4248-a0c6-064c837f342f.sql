
create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  matricula text,
  nome text not null,
  turma text not null,
  media_geral numeric(5,2) default 0,
  progresso_spaece numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

create table public.gabaritos_ocr (
  id uuid primary key default gen_random_uuid(),
  data timestamptz not null default now(),
  turma text not null,
  status text not null check (status in ('sucesso','erro','alerta')),
  total_cartoes integer not null default 0
);

create table public.pareceres_ia (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  disciplina text not null,
  texto_parecer text not null,
  data_criacao timestamptz not null default now()
);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('alerta','info','erro','sucesso')),
  mensagem text not null,
  lida boolean not null default false,
  criada_em timestamptz not null default now()
);

alter table public.alunos enable row level security;
alter table public.gabaritos_ocr enable row level security;
alter table public.pareceres_ia enable row level security;
alter table public.notificacoes enable row level security;

create policy "demo read alunos" on public.alunos for select using (true);
create policy "demo write alunos" on public.alunos for insert with check (true);

create policy "demo read ocr" on public.gabaritos_ocr for select using (true);
create policy "demo write ocr" on public.gabaritos_ocr for insert with check (true);

create policy "demo read pareceres" on public.pareceres_ia for select using (true);
create policy "demo write pareceres" on public.pareceres_ia for insert with check (true);

create policy "demo read notif" on public.notificacoes for select using (true);
create policy "demo write notif" on public.notificacoes for insert with check (true);
create policy "demo update notif" on public.notificacoes for update using (true);

create index on public.alunos (turma);
create index on public.alunos (nome);
create index on public.notificacoes (criada_em desc);
create index on public.gabaritos_ocr (data desc);
