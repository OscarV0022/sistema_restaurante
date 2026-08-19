const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_pos_2026';

module.exports = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: "No autorizado" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded; // Aquí guardamos el { id, username, nombre, rol }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token inválido" });
    }
};