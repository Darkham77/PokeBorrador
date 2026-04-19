
const migrationSql = `-- Hardened execute_trade RPC
CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_trade RECORD;
BEGIN
  SELECT * INTO v_trade FROM trade_offers WHERE id = p_trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la oferta de intercambio.';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

INSERT INTO config (key, value) VALUES ('test', '1');
`;

const statements = migrationSql.split(';').filter(s => s.trim());

console.log(`Total statements: ${statements.length}`);
statements.forEach((s, i) => {
  console.log(`--- Stmt ${i+1} ---`);
  console.log(s.trim());
});
