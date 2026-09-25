const router = require('express').Router();
const { sql, getPool } = require('../db');

// GET /api/estudiantes -> estudiantes con sus misiones y estado
// Query opcional: ?carnet=XXXX para filtrar un solo estudiante
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    let filtro = '';
    if (req.query.carnet) {
      request.input('Carnet', sql.VarChar(25), req.query.carnet);
      filtro = 'WHERE e.Carnet = @Carnet';
    }

    const [estudiantes, totalMisiones] = await Promise.all([
      request.query(`
        SELECT e.Carnet, e.Nombre, e.Correo,
               m.MisionID, m.Nombre AS Mision, em.Estado, em.FechaRegistro
        FROM Estudiantes e
        LEFT JOIN EstudianteMisiones em ON em.Carnet = e.Carnet
        LEFT JOIN Misiones m ON m.MisionID = em.MisionID
        ${filtro}
        ORDER BY e.Nombre, m.MisionID`),
      pool.request().query('SELECT COUNT(*) AS Total FROM Misiones')
    ]);

    const total = totalMisiones.recordset[0].Total;
    const mapa = new Map();
    for (const row of estudiantes.recordset) {
      if (!mapa.has(row.Carnet)) {
        mapa.set(row.Carnet, { carnet: row.Carnet, nombre: row.Nombre, correo: row.Correo, misiones: [] });
      }
      if (row.MisionID !== null) {
        mapa.get(row.Carnet).misiones.push({
          misionId: row.MisionID,
          nombre: row.Mision,
          estado: row.Estado,
          fechaRegistro: row.FechaRegistro
        });
      }
    }

    const data = [...mapa.values()].map(e => {
      const completadas = e.misiones.filter(m => m.estado).length;
      return {
        ...e,
        resumen: {
          totalMisiones: total,
          completadas,
          pendientes: total - completadas,
          porcentaje: total ? Math.round((completadas / total) * 100) : 0
        }
      };
    });

    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
