CREATE TABLE IF NOT EXISTS public.generation_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id         uuid REFERENCES public.escalas(id) ON DELETE CASCADE,
  solver_run_id     uuid,              -- FK to solver_runs added later
  funcionario_id    uuid REFERENCES public.funcionarios(id) NOT NULL,
  dia               int NOT NULL,
  decisao           text NOT NULL,     -- 'T', 'F', 'FD', 'TD', 'TF', 'FE'
  motivo            text NOT NULL,
  constraint_code   text,              -- 'HC00', 'HC01', 'HC01b', etc.
  created_at        timestamptz DEFAULT now()
);
