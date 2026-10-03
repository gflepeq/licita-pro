// Copia todos los datos de una base Postgres a otra (p. ej. Supabase → Elestio).
// Las tablas destino deben existir: la app las crea sola al arrancar con el
// nuevo DATABASE_URL. Vacía las tablas destino antes de copiar.
// Uso:
//   SOURCE_DATABASE_URL=postgres://... TARGET_DATABASE_URL=postgres://... \
//     node scripts/migrate-db.mjs
import postgres from "postgres";

const src = process.env.SOURCE_DATABASE_URL;
const dst = process.env.TARGET_DATABASE_URL;
if (!src || !dst) {
  console.error("Faltan SOURCE_DATABASE_URL y/o TARGET_DATABASE_URL.");
  process.exit(1);
}

const connect = (url) =>
  postgres(url, {
    prepare: false,
    ssl: /[?&]sslmode=disable\b/.test(url) ? false : "require",
    max: 1,
  });
const a = connect(src);
const b = connect(dst);

// Orden respetando las claves foráneas (users primero).
const ORDER = ["users", "plans", "app_config", "settings", "payments", "saved"];

const tablesOf = async (sql) =>
  (
    await sql`SELECT table_name FROM information_schema.tables
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  ).map((r) => r.table_name);

const srcTables = await tablesOf(a);
const dstTables = new Set(await tablesOf(b));
const tables = [
  ...ORDER.filter((t) => srcTables.includes(t)),
  ...srcTables.filter((t) => !ORDER.includes(t)),
];

const faltan = tables.filter((t) => !dstTables.has(t));
if (faltan.length) {
  console.error(
    `En el destino faltan las tablas: ${faltan.join(", ")}.\n` +
      "Arranca la app con el nuevo DATABASE_URL para que las cree y vuelve a ejecutar."
  );
  process.exit(1);
}

await b.unsafe(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);

for (const t of tables) {
  const rows = await a.unsafe(`SELECT * FROM "${t}"`);
  for (let i = 0; i < rows.length; i += 500) {
    await b`INSERT INTO ${b(t)} ${b(rows.slice(i, i + 500))}`;
  }
  // Ajusta la secuencia SERIAL (si la tabla tiene columna id con secuencia).
  const [{ seq }] = await b`SELECT (SELECT pg_get_serial_sequence(${t}, 'id')
    WHERE EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = ${t} AND column_name = 'id')) AS seq`;
  if (seq) {
    await b.unsafe(
      `SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`
    );
  }
  console.log(`✅ ${t}: ${rows.length} filas`);
}

await a.end();
await b.end();
console.log("Migración completa.");
