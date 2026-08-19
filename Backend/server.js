const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const port = 3000;

app.use(cors()); 
app.use(bodyParser.json());

const restauranteRoutes = require('./routes/restaurante.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api', restauranteRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('<h1>Sistema de Restaurante: ONLINE ✅</h1><p>Backend modular y WebSockets activos.</p>');
});

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('actualizar_mesas', (mesas) => {
    socket.broadcast.emit('sincronizar_mesas', mesas);
  });

  socket.on('nueva_orden', (orden) => {
    socket.broadcast.emit('nueva_orden', orden);
  });

  socket.on('actualizar_estado_cocina', (data) => {
    socket.broadcast.emit('estado_cocina_cambiado', data);
  });

  socket.on('limpiar_ticket', (nombreMesa) => {
    socket.broadcast.emit('remover_ticket', nombreMesa);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend listo y escuchando en 0.0.0.0:${port}`);
  console.log("Socket.io conectado con éxito 🚀");
});