CREATE TABLE IF NOT EXISTS public.turnos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id                  uuid REFERENCES public.setores(id) ON DELETE CASCADE NOT NULL,
  codigo                    text NOT NULL,
  nome                      text NOT NULL,
  semana_inicio             time NOT NULL,
  semana_fim                time NOT NULL,
  semana_intervalo_inicio   time NOT NULL,
  semana_intervalo_fim      time NOT NULL,
  domingo_inicio            time,
  domingo_fim               time,
  domingo_intervalo_inicio  time,
  domingo_intervalo_fim    time,
  ativo                     boolean NOT NULL DEFAULT true,
  created_at                timestamptz DEFAULT now(),
  CONSTRAINT unique_setor_codigo UNIQUE (setor_id, codigo)
);
