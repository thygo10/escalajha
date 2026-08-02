DO $$ BEGIN
  CREATE TYPE grupo_domingo_enum AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grupo_feriado_enum AS ENUM ('A', 'B');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grupo_folga_compensatoria_enum AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
