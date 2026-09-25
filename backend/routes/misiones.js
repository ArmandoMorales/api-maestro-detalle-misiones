const router = require('express').Router();
const { getPool } = require('../db');

// GET /api/misiones -> catálogo de misiones
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT MisionID, Nombre, Descripcion FROM Misiones ORDER BY MisionID');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

module.exports = router;
