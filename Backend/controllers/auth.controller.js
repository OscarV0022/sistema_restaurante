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

        conn = await pool.getConnection();
        
        await conn.query(
            'INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)',
            [username, passwordHasheado, nombre, rol]
        );

        return res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error("Error en registro:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.end();
    }
};

const login = async (req, res) => {
    let conn;
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
        }

        conn = await pool.getConnection();
        
        const rows = await conn.query('SELECT * FROM usuarios WHERE username = ?', [username]);

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
        if (conn) conn.end();
    }
};

const obtenerUsuarios = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT id, username, nombre, rol, fecha_registro FROM usuarios');
        return res.status(200).json(rows);
    } catch (err) {
        console.error("Error al obtener usuarios:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.end();
    }
};

const actualizarUsuario = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        const { username, nombre, rol, password } = req.body;

        conn = await pool.getConnection();

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const passwordHasheado = await bcrypt.hash(password, salt);
            await conn.query(
                'UPDATE usuarios SET username = ?, password = ?, nombre = ?, rol = ? WHERE id = ?',
                [username, passwordHasheado, nombre, rol, id]
            );
        } else {
            await conn.query(
                'UPDATE usuarios SET username = ?, nombre = ?, rol = ? WHERE id = ?',
                [username, nombre, rol, id]
            );
        }

        return res.status(200).json({ message: 'Usuario actualizado con éxito' });
    } catch (err) {
        console.error("Error al actualizar usuario:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.end();
    }
};

const eliminarUsuario = async (req, res) => {
    let conn;
    try {
        const { id } = req.params;
        conn = await pool.getConnection();
        await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Usuario eliminado con éxito' });
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        if (conn) conn.end();
    }
};

module.exports = { registrarUsuario, login, obtenerUsuarios, actualizarUsuario, eliminarUsuario };