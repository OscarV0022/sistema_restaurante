const express = require('express');
const router = express.Router();
const restauranteController = require('../controllers/restaurante.controller');

router.get('/menu', restauranteController.obtenerMenu);
router.post('/venta', restauranteController.guardarVenta);
router.post('/menu', restauranteController.agregarProducto);
router.get('/resumen-ventas', restauranteController.obtenerResumenVentas);
router.post('/encargos', restauranteController.procesarEncargo);
router.get('/encargos', restauranteController.obtenerEncargos);
router.put('/encargos/:id/pagar', restauranteController.pagarEncargo);
router.get('/encargos/:fecha', restauranteController.obtenerEncargosPorFecha);
router.put('/menu/:id', restauranteController.actualizarProductoMenu);
router.delete('/menu/:id', restauranteController.eliminarProductoMenu);

module.exports = router;