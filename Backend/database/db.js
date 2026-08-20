require('dotenv').config(); 
const { Pool } = require('pg');

console.log("Intentando conectar a:", process.env.DATABASE_URL ? "URL encontrada" : "URL UNDEFINED ❌");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log('✅ Base de datos conectada a Supabase en la nube'))
  .catch(err => console.error('❌ Error conectando a Supabase:', err.message));

module.exports = pool;