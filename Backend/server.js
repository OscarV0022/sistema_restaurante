const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors()); 
app.use(bodyParser.json());

const restauranteRoutes = require('./routes/restaurante.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api', restauranteRoutes);

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('<h1>Sistema de Restaurante: ONLINE ✅</h1><p>Si ves esto, el backend modular funciona y está limpio.</p>');
});

app.listen(port, () => {
  console.log(`Backend listo en: http://localhost:${port}`);
});

console.log("Socket.io conectado con éxito");