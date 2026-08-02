CREATE TABLE IF NOT EXISTS public.setor_rules (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id                    uuid REFERENCES public.setores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  usa_turno                   boolean NOT NULL DEFAULT true,
  usa_grupo_domingo           boolean NOT NULL DEFAULT true,
  usa_grupo_feriado           boolean NOT NULL DEFAULT true,
  usa_grupo_compensatorio     boolean NOT NULL DEFAULT true,
  permite_folga_sabado        boolean NOT NULL DEFAULT true,
  dias_maximos_consecutivos   int NOT NULL DEFAULT 6,
  max_folgas_programaveis     int NOT NULL DEFAULT 5,
  min_folgas_programaveis     int NOT NULL DEFAULT 4,
  usa_historico               boolean NOT NULL DEFAULT true,
  created_at                  timestamptz DEFAULT now()
);
