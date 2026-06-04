/*const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'oscar',      
  password: '13112016',      
  database: 'restaurante_provisional',
  connectionLimit: 5
});

module.exports = pool;*/

const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'db',      // Ahora busca el servicio llamado 'db'
  user: process.env.DB_USER || 'root',    // Usa root (según tu docker-compose)
  password: process.env.DB_PASS || 'password_seguro', // Usa tu clave real
  database: process.env.DB_NAME || 'restaurante',     // Usa la BD 'restaurante'
  connectionLimit: 5
});

module.exports = pool;