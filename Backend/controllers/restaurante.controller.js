const pool = require('../database/db');

const obtenerMenu = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const { rows } = await conn.query("SELECT * FROM menu");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al obtener el menú");
  } finally {
    if (conn) conn.release();
  }
};

const guardarVenta = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const { total, detalles } = req.body; 
    
    // Cambio: Postgres usa RETURNING id para devolver el ID insertado
    const { rows } = await conn.query(
      "INSERT INTO ventas (total) VALUES ($1) RETURNING id", 
      [total]
    );
    const ventaId = rows[0].id; 

    for (const item of detalles) {
      await conn.query(
        "INSERT INTO detalle_ventas (id_venta, descripcion_producto, precio_unitario, cantidad, subtotal) VALUES ($1, $2, $3, $4, $5)",
        [ventaId, item.descripcion, item.precio, item.cantidad, item.subtotal]
      );
    }
    res.json({ message: "Venta guardada", id: ventaId });
  } catch (err) {
    console.error(err); 
    res.status(500).send("Error al guardar venta");
  } finally {
    if (conn) conn.release();
  }
};

const agregarProducto = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const data = req.body;

    if (Array.isArray(data)) {
      // Postgres no tiene conn.batch(), lo resolvemos con un iterador rápido
      for (const item of data) {
        await conn.query(
          "INSERT INTO menu (descripcion, precio, categoria) VALUES ($1, $2, $3)", 
          [item.descripcion, item.precio, item.categoria]
        );
      }
      res.json({ message: `¡Carga masiva exitosa! ${data.length} productos agregados.` });
    } else {
      const { descripcion, precio, categoria } = data;
      const { rows } = await conn.query(
        "INSERT INTO menu (descripcion, precio, categoria) VALUES ($1, $2, $3) RETURNING id", 
        [descripcion, precio, categoria]
      );
      res.json({ message: "Producto agregado", id: rows[0].id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al agregar producto(s)");
  } finally {
    if (conn) conn.release();
  }
};

const obtenerResumenVentas = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    // Cambio: CURDATE() es CURRENT_DATE en Postgres
    const query = "SELECT COALESCE(SUM(total), 0) as total_dia FROM ventas WHERE DATE(fecha) = CURRENT_DATE";
    const { rows } = await conn.query(query);
    const totalDia = Number(rows[0].total_dia);
    res.json({ total: totalDia });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al obtener resumen");
  } finally {
    if (conn) conn.release();
  }
};

const procesarEncargo = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const { cliente, fecha_entrega, estado_pago, total, detalles } = req.body;

    const resEncargo = await conn.query(
      "INSERT INTO encargos (cliente, fecha_entrega, estado_pago, total) VALUES ($1, $2, $3, $4) RETURNING id",
      [cliente, fecha_entrega, estado_pago, total]
    );
    const encargoId = resEncargo.rows[0].id;

    for (const item of detalles) {
      await conn.query(
        "INSERT INTO detalle_encargos (id_encargo, descripcion, precio, cantidad, subtotal) VALUES ($1, $2, $3, $4, $5)",
        [encargoId, item.descripcion, item.precio, item.cantidad, item.subtotal]
      );
    }

    if (estado_pago === 'PAGADO') {
        const resVenta = await conn.query("INSERT INTO ventas (total) VALUES ($1) RETURNING id", [total]);
        const ventaId = resVenta.rows[0].id;

        for (const item of detalles) {
          await conn.query(
              "INSERT INTO detalle_ventas (id_venta, descripcion_producto, precio_unitario, cantidad, subtotal) VALUES ($1, $2, $3, $4, $5)",
              [ventaId, item.descripcion, item.precio, item.cantidad, item.subtotal]
          );
        }
        console.log(`Encargo #${encargoId} registrado también como Venta #${ventaId}`);
    }
    res.json({ message: "Encargo procesado exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al guardar encargo");
  } finally {
    if (conn) conn.release();
  }
};

const obtenerEncargos = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const { rows: encargos } = await conn.query("SELECT * FROM encargos ORDER BY estado_pago DESC, fecha_entrega ASC");
    for (let encargo of encargos) {
        const { rows: detalles } = await conn.query("SELECT * FROM detalle_encargos WHERE id_encargo = $1", [encargo.id]);
        encargo.detalles = detalles;
    }
    res.json(encargos);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.release();
  }
};

const obtenerEncargosPorFecha = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const fecha = req.params.fecha; 
    const { rows: encargos } = await conn.query(
      "SELECT * FROM encargos WHERE DATE(fecha_entrega) = $1 ORDER BY fecha_entrega ASC", 
      [fecha]
    );
    for (let encargo of encargos) {
        const { rows: detalles } = await conn.query("SELECT * FROM detalle_encargos WHERE id_encargo = $1", [encargo.id]);
        encargo.detalles = detalles;
    }
    res.json(encargos);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.release();
  }
};

const pagarEncargo = async (req, res) => {
  let conn;
  try {
    conn = await pool.connect();
    const idEncargo = req.params.id;

    const { rows: check } = await conn.query("SELECT estado_pago, total FROM encargos WHERE id = $1", [idEncargo]);
    if (check[0].estado_pago === 'PAGADO') {
        return res.status(400).json({ message: "Este encargo ya fue pagado" });
    }
    const total = check[0].total;
    await conn.query("UPDATE encargos SET estado_pago = 'PAGADO' WHERE id = $1", [idEncargo]);

    const resVenta = await conn.query("INSERT INTO ventas (total) VALUES ($1) RETURNING id", [total]);
    const idVenta = resVenta.rows[0].id;

    await conn.query(`
        INSERT INTO detalle_ventas (id_venta, descripcion_producto, precio_unitario, cantidad, subtotal)
        SELECT $1, descripcion, precio, cantidad, subtotal
        FROM detalle_encargos
        WHERE id_encargo = $2
    `, [idVenta, idEncargo]);

    res.json({ message: "Encargo cobrado y registrado en ventas" });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  obtenerMenu, guardarVenta, agregarProducto, obtenerResumenVentas,
  procesarEncargo, obtenerEncargos, pagarEncargo, obtenerEncargosPorFecha
};