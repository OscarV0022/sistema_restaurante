const express = require('express');
const http = require('http');
const https = require('https');
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

app.get('/api/tts', (req, res) => {
  const texto = req.query.text || 'Nuevo pedido';
  const urlTTS = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=${encodeURIComponent(texto)}`;

  https.get(urlTTS, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (externalRes) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    externalRes.pipe(res);
  }).on('error', (err) => {
    console.error("Error en TTS:", err);
    res.status(500).send("Error generando voz");
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Sistema de Restaurante: ONLINE ✅</h1><p>Backend modular y WebSockets activos.</p>');
});

let ticketsCocina = [];

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.emit('tickets_iniciales', ticketsCocina);

  socket.on('actualizar_mesas', (mesas) => {
    socket.broadcast.emit('sincronizar_mesas', mesas);
  });

  socket.on('nueva_orden', (orden) => {
    const index = ticketsCocina.findIndex(t => t.mesa === orden.mesa);
    if (index !== -1) {
      ticketsCocina[index] = { ...orden, estado: 'pendientes', minimizado: false };
    } else {
      ticketsCocina.unshift({ ...orden, estado: 'pendientes', minimizado: false });
    }
    socket.broadcast.emit('nueva_orden', orden);
  });

  socket.on('actualizar_estado_cocina', (data) => {
    const index = ticketsCocina.findIndex(t => t.mesa === data.mesa);
    if (index !== -1) {
      ticketsCocina[index].estado = data.estado;
      if (data.estado === 'completo') {
        ticketsCocina[index].minimizado = true;
      }
    }
    socket.broadcast.emit('estado_cocina_cambiado', data);
  });

  socket.on('limpiar_ticket', (nombreMesa) => {
    ticketsCocina = ticketsCocina.filter(t => t.mesa !== nombreMesa);
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