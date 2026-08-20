require('dotenv').config(); // Para que lea tu URL de Supabase
const bcrypt = require('bcryptjs');
// Ojo con la ruta: asegúrate de que apunte donde realmente está tu db.js
const pool = require('./database/db'); 

const crearAdmin = async () => {
    let conn;
    try {
        console.log('🌱 Iniciando la creación del usuario Admin...');
        conn = await pool.connect();

        // 1. Configura los datos de tu administrador aquí
        const username = 'admin';
        const passwordPlana = '282228'; 
        const nombre = 'Administrador';
        const rol = 'admin';

        // 2. Verificamos si el usuario ya existe para no duplicarlo
        const { rows: usuariosExistentes } = await conn.query('SELECT id FROM usuarios WHERE username = $1', [username]);
        
        if (usuariosExistentes.length > 0) {
            console.log('⚠️ El usuario "admin" ya existe en la base de datos de Supabase. Abortando.');
            return;
        }

        // 3. Encriptamos la contraseña con bcryptjs
        console.log('🔒 Encriptando la contraseña...');
        const salt = await bcrypt.genSalt(10);
        const passwordHasheado = await bcrypt.hash(passwordPlana, salt);

        // 4. Insertamos en PostgreSQL
        console.log('☁️ Guardando en la nube...');
        await conn.query(
            'INSERT INTO usuarios (username, password, nombre, rol) VALUES ($1, $2, $3, $4)',
            [username, passwordHasheado, nombre, rol]
        );

        console.log('✅ ¡Usuario administrador creado con éxito y contraseña encriptada!');

    } catch (error) {
        console.error('❌ Error al crear el seed:', error.message);
    } finally {
        if (conn) conn.release();
        // Cerramos el proceso de Node para que la consola no se quede colgada
        process.exit(0); 
    }
};

// Ejecutamos la función
crearAdmin();