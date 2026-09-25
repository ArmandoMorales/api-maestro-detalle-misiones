require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({
    api: 'API Maestro-Detalle de Misiones',
    endpoints: {
      'POST /api/registro': 'Registra/actualiza estudiante y sus misiones',
      'GET /api/misiones': 'Catálogo de misiones',
      'GET /api/estudiantes': 'Estudiantes con sus misiones (?carnet= opcional)'
    }
  });
});

app.use('/api/registro', require('./routes/registro'));
app.use('/api/misiones', require('./routes/misiones'));
app.use('/api/estudiantes', require('./routes/estudiantes'));

app.use((req, res) => res.status(404).json({ ok: false, error: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada.' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'JSON_MAL_FORMADO', mensaje: 'El cuerpo no es un JSON válido.' });
  }
  // 547 = violación de FK; 2627/2601 = violación de PK/UNIQUE
  if (err.number === 547) {
    return res.status(422).json({ ok: false, error: 'REFERENCIA', mensaje: 'Error de referencia (FK).' });
  }
  if (err.number === 2627 || err.number === 2601) {
    return res.status(409).json({ ok: false, error: 'CONFLICTO', mensaje: 'Registro duplicado.' });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'SERVIDOR', mensaje: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
