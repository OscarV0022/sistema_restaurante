const pool = require('../database/db');

const obtenerMenu = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM menu");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al obtener el menú");
  } finally {
    if (conn) conn.end();
  }
};

const guardarVenta = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { total, detalles } = req.body; 
    
    const ventaResult = await conn.query(
      "INSERT INTO ventas (total) VALUES (?)", 
      [total]
    );
    const ventaId = Number(ventaResult.insertId); 

    for (const item of detalles) {
      await conn.query(
        "INSERT INTO detalle_ventas (id_venta, descripcion_producto, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)",
        [ventaId, item.descripcion, item.precio, item.cantidad, item.subtotal]
      );
    }
    res.json({ message: "Venta guardada", id: ventaId });
  } catch (err) {
    console.error(err); 
    res.status(500).send("Error al guardar venta");
  } finally {
    if (conn) conn.end();
  }
};

const agregarProducto = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const data = req.body;

    if (Array.isArray(data)) {
      const valores = data.map(item => [item.descripcion, item.precio, item.categoria]);
      const result = await conn.batch(
        "INSERT INTO menu (descripcion, precio, categoria) VALUES (?, ?, ?)", 
        valores
      );
      res.json({ message: `¡Carga masiva exitosa! ${result.affectedRows} productos agregados.` });
    } else {
      const { descripcion, precio, categoria } = data;
      const result = await conn.query(
        "INSERT INTO menu (descripcion, precio, categoria) VALUES (?, ?, ?)", 
        [descripcion, precio, categoria]
      );
      res.json({ message: "Producto agregado", id: Number(result.insertId) });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al agregar producto(s)");
  } finally {
    if (conn) conn.end();
  }
};

const obtenerResumenVentas = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const query = "SELECT COALESCE(SUM(total), 0) as total_dia FROM ventas WHERE DATE(fecha) = CURDATE()";
    const result = await conn.query(query);
    const totalDia = Number(result[0].total_dia);
    res.json({ total: totalDia });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al obtener resumen");
  } finally {
    if (conn) conn.end();
  }
};

const procesarEncargo = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { cliente, fecha_entrega, estado_pago, total, detalles } = req.body;

    const resEncargo = await conn.query(
      "INSERT INTO encargos (cliente, fecha_entrega, estado_pago, total) VALUES (?, ?, ?, ?)",
      [cliente, fecha_entrega, estado_pago, total]
    );
    const encargoId = Number(resEncargo.insertId);

    const itemsEncargo = detalles.map(item => [
      encargoId, item.descripcion, item.precio, item.cantidad, item.subtotal
    ]);
    
    await conn.batch(
      "INSERT INTO detalle_encargos (id_encargo, descripcion, precio, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)",
      itemsEncargo
    );

    if (estado_pago === 'PAGADO') {
        const resVenta = await conn.query("INSERT INTO ventas (total) VALUES (?)", [total]);
        const ventaId = Number(resVenta.insertId);

        const itemsVenta = detalles.map(item => [
            ventaId, item.descripcion, item.precio, item.cantidad, item.subtotal
        ]);

        await conn.batch(
            "INSERT INTO detalle_ventas (id_venta, descripcion, precio, cantidad, subtotal) VALUES (?, ?, ?, ?, ?)",
            itemsVenta
        );
        console.log(`Encargo #${encargoId} registrado también como Venta #${ventaId}`);
    }
    res.json({ message: "Encargo procesado exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al guardar encargo");
  } finally {
    if (conn) conn.end();
  }
};

const obtenerEncargos = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const encargos = await conn.query("SELECT * FROM encargos ORDER BY estado_pago DESC, fecha_entrega ASC");
    for (let encargo of encargos) {
        const detalles = await conn.query("SELECT * FROM detalle_encargos WHERE id_encargo = ?", [encargo.id]);
        encargo.detalles = detalles;
    }
    res.json(encargos);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.end();
  }
};

const pagarEncargo = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const idEncargo = req.params.id;

    const check = await conn.query("SELECT estado_pago, total FROM encargos WHERE id = ?", [idEncargo]);
    if (check[0].estado_pago === 'PAGADO') {
        return res.status(400).json({ message: "Este encargo ya fue pagado" });
    }
    const total = check[0].total;
    await conn.query("UPDATE encargos SET estado_pago = 'PAGADO' WHERE id = ?", [idEncargo]);

    const resVenta = await conn.query("INSERT INTO ventas (total) VALUES (?)", [total]);
    const idVenta = Number(resVenta.insertId);

    await conn.query(`
        INSERT INTO detalle_ventas (id_venta, descripcion_producto, precio_unitario, cantidad, subtotal)
        SELECT ?, descripcion, precio, cantidad, subtotal
        FROM detalle_encargos
        WHERE id_encargo = ?
    `, [idVenta, idEncargo]);

    res.json({ message: "Encargo cobrado y registrado en ventas" });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.end();
  }
};

module.exports = {
  obtenerMenu, guardarVenta, agregarProducto, obtenerResumenVentas,
  procesarEncargo, obtenerEncargos, pagarEncargo
};