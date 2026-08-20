const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../database/db'); 
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_pos_2026';

const registrarUsuario = async (req, res) => {
    let conn;
    try {
        const { username, password, nombre, rol } = req.body;

        if (!username || !password || !nombre || !rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHasheado = await bcrypt.hash(password, salt);

        conn = await pool.connect(); // Cambio: connect() en pg
        
        await conn.query(
            'INSERT INTO usuarios (username, password, nombre, rol) VALUES ($1, $2, $3, $4)', // Cambio: $1, $2...
            [username, passwordHasheado, nombre, rol]
        );

        return res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error("Error en registro:", err);
        // Cambio: El código de error para duplicados en Postgres es '23505'
        if (err.code === '23505') { 
            return res.status(400).json({ message: 'El usuario ya existe' });
        }
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release(); // Cambio: release() en lugar de end()
    }
};

const login = async (req, res) => {
    let conn;
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
        }

        conn = await pool.connect();
        
        // Cambio: Extraemos 'rows' directamente y usamos $1
        const { rows } = await conn.query('SELECT * FROM usuarios WHERE username = $1', [username]);

        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const usuario = rows[0];

        const passwordCorrecto = await bcrypt.compare(password, usuario.password);
        
        if (!passwordCorrecto) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { 
                id: usuario.id, 
                username: usuario.username, 
                rol: usuario.rol, 
                nombre: usuario.nombre 
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            token,
            usuario: {
                username: usuario.username,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (err) {
        console.error("Error en login:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const obtenerUsuarios = async (req, res) => {
    let conn;
    try {
        conn = await pool.connect();
        const { rows } = await conn.query('SELECT id, username, nombre, rol, fecha_registro FROM usuarios');
        return res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener usuarios:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const actualizarUsuario = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const { username, nombre, rol, password } = req.body;

        conn = await pool.connect();

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const passwordHasheado = await bcrypt.hash(password, salt);
            await conn.query(
                'UPDATE usuarios SET username = $1, password = $2, nombre = $3, rol = $4 WHERE id = $5',
                [username, passwordHasheado, nombre, rol, id]
            );
        } else {
            await conn.query(
                'UPDATE usuarios SET username = $1, nombre = $2, rol = $3 WHERE id = $4',
                [username, nombre, rol, id]
            );
        }

        return res.status(200).json({ message: 'Usuario actualizado con éxito' });
    } catch (err) {
        console.error("Error al actualizar usuario:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

const eliminarUsuario = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        conn = await pool.connect();
        await conn.query('DELETE FROM usuarios WHERE id = $1', [id]);
        return res.status(200).json({ message: 'Usuario eliminado con éxito' });
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { registrarUsuario, login, obtenerUsuarios, actualizarUsuario, eliminarUsuario };