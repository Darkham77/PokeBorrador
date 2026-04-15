-- Security Triggers for Poké Vicio
-- This script adds basic sanity checks to the game_saves table.

-- Function to validate the integrity of save_data
CREATE OR REPLACE FUNCTION validate_game_save()
RETURNS TRIGGER AS $$
DECLARE
  v_money BIGINT;
  v_bc BIGINT;
  v_team JSONB;
  v_box JSONB;
  v_poke JSONB;
BEGIN
  -- 1. Check Money Limits
  v_money := (NEW.save_data->>'money')::BIGINT;
  IF v_money > 99999999 THEN
    RAISE EXCEPTION 'Monto de dinero inválido (máx 99,999,999).';
  END IF;

  -- 2. Check Battle Coins Limits
  v_bc := (NEW.save_data->>'battleCoins')::BIGINT;
  IF v_bc > 1000000 THEN
    RAISE EXCEPTION 'Monto de Battle Coins inválido (máx 1,000,000).';
  END IF;

  -- 3. Check Pokémon Levels (Team)
  v_team := NEW.save_data->'team';
  IF v_team IS NOT NULL AND jsonb_array_length(v_team) > 0 THEN
    FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team)
    LOOP
      IF (v_poke->>'level')::INT > 100 THEN
        RAISE EXCEPTION 'Nivel de Pokémon inválido en el equipo (máx 100).';
      END IF;
    END LOOP;
  END IF;

  -- 4. Check Pokémon Levels (Box)
  v_box := NEW.save_data->'box';
  IF v_box IS NOT NULL AND jsonb_array_length(v_box) > 0 THEN
    FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box)
    LOOP
      IF (v_poke->>'level')::INT > 100 THEN
        RAISE EXCEPTION 'Nivel de Pokémon inválido en la caja (máx 100).';
      END IF;
    END LOOP;
  END IF;

  -- Update timestamp automatically if not provided
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_game_save ON game_saves;
CREATE TRIGGER trg_validate_game_save
BEFORE INSERT OR UPDATE ON game_saves
FOR EACH ROW
EXECUTE FUNCTION validate_game_save();
