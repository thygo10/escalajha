CREATE TABLE IF NOT EXISTS public.cobertura_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id        uuid REFERENCES public.setores(id) ON DELETE CASCADE NOT NULL,
  dia_tipo        text NOT NULL CHECK (dia_tipo IN ('semana','domingo','feriado')),
  slot_inicio     time NOT NULL,
  slot_fim        time NOT NULL,
  minimo_pessoas  int NOT NULL,
  CONSTRAINT unique_setor_dia_slot UNIQUE (setor_id, dia_tipo, slot_inicio)
);
