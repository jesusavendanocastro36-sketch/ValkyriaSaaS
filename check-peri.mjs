import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT p.id, p.nombre, p.estado, p."coachId", p."athleteId",
         COUNT(b.id) as bloques_count
  FROM "Periodizacion" p
  LEFT JOIN "BloqueEntrenamiento" b ON b."periodizacionId" = p.id
  GROUP BY p.id, p.nombre, p.estado, p."coachId", p."athleteId"
`);
console.log('Periodizaciones:', JSON.stringify(result.rows, null, 2));

const coaches = await pool.query(`SELECT id, "userId" FROM "CoachProfile"`);
console.log('Coaches:', JSON.stringify(coaches.rows, null, 2));

const users = await pool.query(`SELECT id, email, rol FROM "User"`);
console.log('Users:', JSON.stringify(users.rows, null, 2));

await pool.end();
