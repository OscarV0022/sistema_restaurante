const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/registrar', authController.registrarUsuario);
router.post('/login', authController.login);
router.get('/usuarios', authController.obtenerUsuarios);
router.put('/usuarios/:id', authController.actualizarUsuario);
router.delete('/usuarios/:id', authController.eliminarUsuario);

module.exports = router;