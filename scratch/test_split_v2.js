
function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let inString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    if (!inDollarQuote && !inString) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = true;
        current += '$$';
        i++;
        continue;
      }
      if (char === "'") {
        inString = true;
        current += "'";
        continue;
      }
      if (char === ';') {
        statements.push(current.trim());
        current = '';
        continue;
      }
    } else if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        current += '$$';
        i++;
        continue;
      }
    } else if (inString) {
      if (char === "'" && sql[i-1] !== '\\') {
        inString = false;
        current += "'";
        continue;
      }
    }
    current += char;
  }
  
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 0);
}

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

const statements = splitSQLStatements(migrationSql);

console.log(`Total statements: ${statements.length}`);
statements.forEach((s, i) => {
  console.log(`--- Stmt ${i+1} ---`);
  console.log(s.trim());
});
