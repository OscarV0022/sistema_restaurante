const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'oscar',      
  password: '13112016',      
  database: 'restaurante_provisional',
  connectionLimit: 5
});

module.exports = pool;