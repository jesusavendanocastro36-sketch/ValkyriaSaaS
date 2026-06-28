import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const bloques = await pool.query(`SELECT b.id, b.nombre, b."periodizacionId", b."semanaInicio", b."semanaFin" FROM "BloqueEntrenamiento" b`);
console.log('Bloques:', JSON.stringify(bloques.rows, null, 2));

const sesiones = await pool.query(`SELECT s.id, s."numeroSemana", s."diaSemana", s."bloqueId" FROM "SesionEntrenamiento" s`);
console.log('Sesiones:', JSON.stringify(sesiones.rows, null, 2));

const ejercicios = await pool.query(`SELECT e.id, e."ejercicioNombre", e."tipoEjercicio", e."sesionId" FROM "EjercicioSesion" e`);
console.log('Ejercicios:', JSON.stringify(ejercicios.rows, null, 2));

await pool.end();
