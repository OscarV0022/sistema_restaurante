const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'db',      
  user: process.env.DB_USER || 'root',    
  password: process.env.DB_PASS || 'password_seguro', 
  database: process.env.DB_NAME || 'restaurante',     
  connectionLimit: 5
});

module.exports = pool;