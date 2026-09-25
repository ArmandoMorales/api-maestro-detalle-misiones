const router = require('express').Router();
const { sql, getPool } = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(body) {
  const errores = [];
  const { maestro, detalle } = body || {};

  if (!maestro || typeof maestro !== 'object') {
    errores.push('El campo "maestro" es obligatorio.');
  } else {
    if (typeof maestro.carnet !== 'string' || !maestro.carnet.trim() || maestro.carnet.trim().length > 25)
      errores.push('"maestro.carnet" es obligatorio (máx. 25 caracteres).');
    if (typeof maestro.nombre !== 'string' || !maestro.nombre.trim() || maestro.nombre.trim().length > 150)
      errores.push('"maestro.nombre" es obligatorio (máx. 150 caracteres).');
    if (typeof maestro.correo !== 'string' || !EMAIL_RE.test(maestro.correo.trim()) || maestro.correo.trim().length > 150)
      errores.push('"maestro.correo" debe ser un correo válido (máx. 150 caracteres).');
  }

  if (!Array.isArray(detalle) || detalle.length === 0) {
    errores.push('El campo "detalle" debe ser un arreglo con al menos una misión.');
  } else {
    const vistos = new Set();
    detalle.forEach((d, i) => {
      if (!Number.isInteger(d?.misionId) || d.misionId <= 0)
        errores.push(`detalle[${i}].misionId debe ser un entero positivo.`);
      else if (vistos.has(d.misionId))
        errores.push(`detalle[${i}].misionId ${d.misionId} está repetido.`);
      else vistos.add(d.misionId);
      if (typeof d?.estado !== 'boolean')
        errores.push(`detalle[${i}].estado debe ser true o false.`);
    });
  }
  return errores;
}

// POST /api/registro -> upsert del maestro (Estudiantes) + detalle (EstudianteMisiones)
router.post('/', async (req, res, next) => {
  const errores = validar(req.body);
  if (errores.length) {
    return res.status(400).json({ ok: false, error: 'VALIDACION', mensaje: 'JSON inválido.', detalles: errores });
  }

  const carnet = req.body.maestro.carnet.trim();
  const nombre = req.body.maestro.nombre.trim();
  const correo = req.body.maestro.correo.trim();
  const detalle = req.body.detalle;

  let transaction;
  try {
    const pool = await getPool();

    // 1. Validar que todas las misiones existan en el catálogo
    const catalogo = await pool.request().query('SELECT MisionID FROM Misiones');
    const idsValidos = new Set(catalogo.recordset.map(r => r.MisionID));
    const inexistentes = detalle.map(d => d.misionId).filter(id => !idsValidos.has(id));
    if (inexistentes.length) {
      return res.status(422).json({
        ok: false,
        error: 'REFERENCIA',
        mensaje: 'Una o más misiones no existen en el catálogo.',
        misionesInexistentes: inexistentes
      });
    }

    // 2. El correo es UNIQUE: no puede pertenecer a otro carnet
    const correoUsado = await pool.request()
      .input('Correo', sql.NVarChar(150), correo)
      .input('Carnet', sql.VarChar(25), carnet)
      .query('SELECT Carnet FROM Estudiantes WHERE Correo = @Correo AND Carnet <> @Carnet');
    if (correoUsado.recordset.length) {
      return res.status(409).json({
        ok: false,
        error: 'CONFLICTO',
        mensaje: 'El correo ya está registrado con otro carnet.'
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 3. Upsert del maestro
    const existe = await new sql.Request(transaction)
      .input('Carnet', sql.VarChar(25), carnet)
      .query('SELECT 1 FROM Estudiantes WITH (UPDLOCK, HOLDLOCK) WHERE Carnet = @Carnet');

    const reqMaestro = new sql.Request(transaction)
      .input('Carnet', sql.VarChar(25), carnet)
      .input('Nombre', sql.NVarChar(150), nombre)
      .input('Correo', sql.NVarChar(150), correo);

    let accionMaestro;
    if (existe.recordset.length) {
      await reqMaestro.query('UPDATE Estudiantes SET Nombre = @Nombre, Correo = @Correo WHERE Carnet = @Carnet');
      accionMaestro = 'actualizado';
    } else {
      await reqMaestro.query('INSERT INTO Estudiantes (Carnet, Nombre, Correo) VALUES (@Carnet, @Nombre, @Correo)');
      accionMaestro = 'insertado';
    }

    // 4. Upsert del detalle: si existe actualiza el estado, si no, inserta
    const resultadoDetalle = [];
    for (const d of detalle) {
      const r = await new sql.Request(transaction)
        .input('Carnet', sql.VarChar(25), carnet)
        .input('MisionID', sql.Int, d.misionId)
        .input('Estado', sql.Bit, d.estado)
        .query(`
          UPDATE EstudianteMisiones WITH (UPDLOCK, HOLDLOCK)
             SET Estado = @Estado
           WHERE Carnet = @Carnet AND MisionID = @MisionID;
          IF @@ROWCOUNT = 0
          BEGIN
            INSERT INTO EstudianteMisiones (Carnet, MisionID, Estado) VALUES (@Carnet, @MisionID, @Estado);
            SELECT 'insertado' AS Accion;
          END
          ELSE
            SELECT 'actualizado' AS Accion;`);
      resultadoDetalle.push({ misionId: d.misionId, estado: d.estado, accion: r.recordset[0].Accion });
    }

    await transaction.commit();

    res.status(accionMaestro === 'insertado' ? 201 : 200).json({
      ok: true,
      mensaje: 'Registro procesado correctamente.',
      maestro: { carnet, nombre, correo, accion: accionMaestro },
      detalle: resultadoDetalle,
      resumen: {
        insertadas: resultadoDetalle.filter(x => x.accion === 'insertado').length,
        actualizadas: resultadoDetalle.filter(x => x.accion === 'actualizado').length
      }
    });
  } catch (err) {
    if (transaction) { try { await transaction.rollback(); } catch (_) { /* ya revertida */ } }
    next(err);
  }
});

module.exports = router;
