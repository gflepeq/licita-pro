// Promueve un usuario a admin en la base (Postgres/Supabase).
// Uso:
//   node --env-file=.env.local scripts/make-admin.mjs correo@ejemplo.cl
// o exportando la URL:
//   DATABASE_URL=postgres://... node scripts/make-admin.mjs correo@ejemplo.cl
import postgres from "postgres";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (connection string de Supabase/Postgres).");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: "require" });

const res = await sql`UPDATE users SET role = 'admin' WHERE lower(email) = lower(${email})`;

if (res.count === 0) {
  console.log(
    `No existe un usuario con el email "${email}". Regístralo primero en /registro y vuelve a ejecutar.`
  );
} else {
  console.log(`✅ "${email}" ahora es administrador (rol=admin).`);
}
await sql.end();
