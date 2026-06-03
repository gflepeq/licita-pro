// Promueve un usuario a admin en la base (local o Turso).
// Uso:
//   node --env-file=.env.local scripts/make-admin.mjs correo@ejemplo.cl
// En producción, exporta antes las credenciales de Turso (o usa: vercel env pull .env.local):
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/make-admin.mjs correo@ejemplo.cl
import { createClient } from "@libsql/client";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL || "file:./data/licitapro.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

const res = await client.execute({
  sql: "UPDATE users SET role = 'admin' WHERE lower(email) = lower(?)",
  args: [email],
});

if (res.rowsAffected === 0) {
  console.log(
    `No existe un usuario con el email "${email}". Regístralo primero en /registro y vuelve a ejecutar.`
  );
} else {
  console.log(`✅ "${email}" ahora es administrador (rol=admin).`);
}
