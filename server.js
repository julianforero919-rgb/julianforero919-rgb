require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();

const PORT = Number(process.env.PORT || 3000);

const sessions = new Map();

const sslSetting = process.env.PGSSL ?? process.env.DB_SSL;

const postgresConfig = process.env.DATABASE_URL
    ? {
      connectionString: process.env.DATABASE_URL,
      ssl: String(sslSetting).toLowerCase() === 'true'
          ? { rejectUnauthorized: false }
          : false
    }
    : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'SIDOVI',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: String(sslSetting).toLowerCase() === 'true'
          ? { rejectUnauthorized: false }
          : false
    };

const db = new Pool(postgresConfig);


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(express.json({ limit: '5mb' }));

app.use(express.urlencoded({ extended: true }));


/* =========================================================
   SESIONES
========================================================= */

function getSession(req) {

  const authorization = req.get('authorization') || '';

  const bearerToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';

  const cookies = Object.fromEntries(
      (req.get('cookie') || '')
          .split(';')
          .filter(Boolean)
          .map((part) => {

            const index = part.indexOf('=');

            return [
              part.slice(0, index).trim(),
              decodeURIComponent(part.slice(index + 1).trim())
            ];

          })
  );

  return sessions.get(bearerToken || cookies.sid) || null;
}


function getSessionToken(req) {

  const authorization = req.get('authorization') || '';

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  const cookie = (req.get('cookie') || '')
      .split(';')
      .find((part) => part.trim().startsWith('sid='));

  return cookie
      ? decodeURIComponent(cookie.trim().slice(4))
      : '';
}


function requireRoles(...roles) {

  return (req, res, next) => {

    const session = getSession(req);

    if (!session) {
      return res.status(401).json({
        error: 'Sesión requerida.'
      });
    }

    if (roles.length && !roles.includes(session.rol)) {
      return res.status(403).json({
        error: 'No tienes permisos para este módulo.'
      });
    }

    req.session = session;

    next();
  };
}


/* =========================================================
   API PÚBLICA
========================================================= */

const publicApi = (req) => {

  return (
      req.path === '/auth/login' ||
      req.path === '/health' ||
      (req.path === '/vacantes' && req.method === 'GET') ||
      (req.path === '/sedes' && req.method === 'GET') ||
      (req.path === '/postulaciones' && req.method === 'POST')
  );

};


/* =========================================================
   PÁGINAS PROTEGIDAS
========================================================= */

const protectedPages = {

  '/RRHH.html': ['RRHH'],

  '/cargos.html': ['RRHH'],

  '/gerente.html': ['Gerente'],

  '/evaluar.html': ['Gerente'],

  '/contrato.html': ['Gerente'],

  '/trabajadores.html': ['RRHH', 'Gerente'],

  '/reporte.html': ['RRHH', 'Gerente'],

  '/aspirantes.html': ['RRHH', 'Gerente'],

  '/postulantes.html': ['RRHH', 'Gerente'],

  '/agenda.html': ['RRHH', 'Gerente'],

  '/hojasdevida.html': ['RRHH', 'Gerente']
};


app.use((req, res, next) => {

  const roles = protectedPages[req.path];

  if (!roles) {
    return next();
  }

  const session = getSession(req);

  if (!session) {
    return res.redirect('/login.html?acceso=sesion');
  }

  if (!roles.includes(session.rol)) {
    return res.status(403).send('Acceso denegado para este rol.');
  }

  next();
});


/* =========================================================
   PROTECCIÓN API
========================================================= */

app.use('/api', (req, res, next) => {

  if (publicApi(req)) {
    return next();
  }

  if (
      req.path === '/dashboard' ||
      req.path === '/cargos' ||
      req.path.startsWith('/vacantes')
  ) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/contratos')) {
    return requireRoles('Gerente')(req, res, next);
  }

  if (req.path.startsWith('/postulaciones')) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/aspirantes')) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/documentos')) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/entrevistas')) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/trabajadores')) {
    return requireRoles('RRHH', 'Gerente')(req, res, next);
  }

  if (req.path.startsWith('/evaluaciones')) {
    return requireRoles('Gerente')(req, res, next);
  }

  return next();
});


/* =========================================================
   ARCHIVOS ESTÁTICOS
========================================================= */

app.use(express.static(__dirname));


/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

const errorResponse = (res, error, fallback) => {

  console.error(error);

  let status = 500;

  if (error.status) {
    status = error.status;
  } else if (error.code === '23503') {
    status = 400;
  } else if (error.code === '23505') {
    status = 409;
  } else if (error.code === '23514') {
    status = 400;
  }

  res.status(status).json({
    error:
        error.code === '23505'
            ? 'El registro ya existe.'
            : error.message || fallback
  });

};


function normalizarEstadoPostulacion(value) {

  const estado = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/_/g, ' ');

  const estados = {

    'EN PROCESO': 'EN_REVISION',

    'EN REVISION': 'EN_REVISION',

    'EN_REVISIÓN': 'EN_REVISION',

    'EN_REVISION': 'EN_REVISION',

    'APROBADO RRHH': 'APROBADO_RRHH',

    'APROBADO_RRHH': 'APROBADO_RRHH',

    'RECHAZADO RRHH': 'RECHAZADO_RRHH',

    'RECHAZADO_RRHH': 'RECHAZADO_RRHH',

    'ENTREVISTA': 'ENTREVISTA',

    'APROBADO': 'APROBADO',

    'RECHAZADO': 'RECHAZADO',

    'CONTRATO': 'CONTRATADO',

    'CONTRATADO': 'CONTRATADO'
  };

  return estados[estado] || null;
}


/* =========================================================
   HEALTH
========================================================= */

app.get('/api/health', async (_req, res) => {

  try {

    await db.query('SELECT 1');

    res.json({
      ok: true,
      servicio: 'SIDOVI API',
      baseDatos: 'SIDOVI'
    });

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible conectar con PostgreSQL.'
    );

  }

});


/* =========================================================
   SEDES
========================================================= */

app.get('/api/sedes', async (_req, res) => {

  try {

    const result = await db.query(`
            SELECT
                id_sede,
                nombre_sede,
                activa
            FROM sede
            ORDER BY nombre_sede
        `);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar las sedes.'
    );

  }

});


/* =========================================================
   CARGOS
========================================================= */

app.get('/api/cargos', async (req, res) => {

  try {

    const values = [];

    let clause = 'WHERE c.activo = true';

    if (req.query.idSede) {

      values.push(req.query.idSede);

      clause += ` AND c.id_sede = $${values.length}`;
    }

    const result = await db.query(`
            SELECT
                c.*,
                s.nombre_sede
            FROM cargo c
            JOIN sede s
                ON s.id_sede = c.id_sede
            ${clause}
            ORDER BY c.nombre_cargo, s.nombre_sede
        `, values);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar los cargos.'
    );

  }

});


app.post('/api/cargos', async (req, res) => {

  const {
    nombreCargo,
    nombre_cargo,
    descripcionCargo = '',
    descripcion_cargo = '',
    turnos = '',
    idSede,
    id_sede,
    idRrhh,
    id_rrhh
  } = req.body;

  const nombre = nombreCargo || nombre_cargo;

  const sedeId = Number(idSede || id_sede);

  const rrhhId = idRrhh || id_rrhh || null;

  if (!nombre || !sedeId) {

    return res.status(400).json({
      error: 'El nombre del cargo y la sede son obligatorios.'
    });

  }

  try {

    const result = await db.query(`
            INSERT INTO cargo
                (
                    nombre_cargo,
                    descripcion_cargo,
                    turnos,
                    id_sede,
                    id_rrhh
                )
            VALUES
                ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
      nombre.trim(),
      descripcionCargo || descripcion_cargo,
      turnos,
      sedeId,
      rrhhId
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible crear el cargo.'
    );

  }

});


app.patch('/api/cargos/:id', async (req, res) => {

  const {
    nombreCargo,
    nombre_cargo,
    descripcionCargo,
    descripcion_cargo,
    turnos,
    idSede,
    id_sede,
    idRrhh,
    id_rrhh,
    activo
  } = req.body;

  try {

    const result = await db.query(`
            UPDATE cargo
            SET
                nombre_cargo =
                    COALESCE($1, nombre_cargo),

                descripcion_cargo =
                    COALESCE($2, descripcion_cargo),

                turnos =
                    COALESCE($3, turnos),

                id_sede =
                    COALESCE($4, id_sede),

                id_rrhh =
                    COALESCE($5, id_rrhh),

                activo =
                    COALESCE($6, activo)

            WHERE id_cargo = $7

            RETURNING *
        `, [
      nombreCargo || nombre_cargo || null,
      descripcionCargo ?? descripcion_cargo ?? null,
      turnos ?? null,
      idSede || id_sede || null,
      idRrhh || id_rrhh || null,
      activo ?? null,
      req.params.id
    ]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Cargo no encontrado.'
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar el cargo.'
    );

  }

});


app.delete('/api/cargos/:id', async (req, res) => {

  try {

    const result = await db.query(`
            UPDATE cargo
            SET activo = false
            WHERE id_cargo = $1
            RETURNING id_cargo
        `, [req.params.id]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Cargo no encontrado.'
      });

    }

    res.status(204).end();

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible desactivar el cargo.'
    );

  }

});


/* =========================================================
   VACANTES
========================================================= */

app.get('/api/vacantes', async (req, res) => {

  try {

    const values = [];

    let clause = '';

    if (req.query.idSede) {

      values.push(req.query.idSede);

      clause = `WHERE v.id_sede = $${values.length}`;
    }

    const result = await db.query(`
            SELECT
                v.id_vacante,
                v.id_sede,
                v.id_cargo,
                v.id_usuario,
                v.nombre_cargo,
                v.descripcion,
                v.fecha_publicacion,
                v.fecha_cierre,
                v.estado,
                v.creado_en,

                s.nombre_sede,

                c.nombre_cargo AS cargo_catalogo,

                u.nombre_completo AS responsable,

                COUNT(p.id_postulacion)::int
                    AS total_postulaciones

            FROM vacante v

            LEFT JOIN sede s
                ON s.id_sede = v.id_sede

            LEFT JOIN cargo c
                ON c.id_cargo = v.id_cargo

            LEFT JOIN usuario u
                ON u.id_usuario = v.id_usuario

            LEFT JOIN postulacion p
                ON p.id_vacante = v.id_vacante

            ${clause}

            GROUP BY
                v.id_vacante,
                s.nombre_sede,
                c.nombre_cargo,
                u.nombre_completo

            ORDER BY v.id_vacante DESC
        `, values);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar las vacantes.'
    );

  }

});


app.get('/api/vacantes/:id', async (req, res) => {

  try {

    const result = await db.query(`
            SELECT
                v.*,
                s.nombre_sede,
                c.nombre_cargo AS cargo_catalogo,
                u.nombre_completo AS responsable
            FROM vacante v
            LEFT JOIN sede s
                ON s.id_sede = v.id_sede
            LEFT JOIN cargo c
                ON c.id_cargo = v.id_cargo
            LEFT JOIN usuario u
                ON u.id_usuario = v.id_usuario
            WHERE v.id_vacante = $1
        `, [req.params.id]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Vacante no encontrada.'
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar la vacante.'
    );

  }

});


app.post('/api/vacantes', async (req, res) => {

  const {
    titulo,
    nombre_cargo,
    descripcion,
    fechaPublicacion,
    fechaCierre,
    estado = 'ABIERTA',
    idSede,
    id_sede,
    idCargo,
    id_cargo,
    idUsuario,
    id_usuario
  } = req.body;

  const nombreVacante =
      nombre_cargo ||
      titulo;

  const sedeId =
      Number(idSede || id_sede);

  const cargoId =
      Number(idCargo || id_cargo);

  const usuarioId =
      Number(
          idUsuario ||
          id_usuario ||
          req.session?.id_usuario
      );

  if (!nombreVacante || !descripcion) {

    return res.status(400).json({
      error: 'El nombre del cargo y la descripción son obligatorios.'
    });

  }

  if (!sedeId || !cargoId || !usuarioId) {

    return res.status(400).json({
      error: 'La sede, el cargo y el usuario responsable son obligatorios.'
    });

  }

  try {

    const result = await db.query(`
            INSERT INTO vacante
                (
                    id_sede,
                    id_cargo,
                    id_usuario,
                    nombre_cargo,
                    descripcion,
                    fecha_publicacion,
                    fecha_cierre,
                    estado
                )
            VALUES
                ($1,$2,$3,$4,$5,
                 COALESCE($6, CURRENT_DATE),
                 $7,
                 $8)
            RETURNING *
        `, [
      sedeId,
      cargoId,
      usuarioId,
      nombreVacante,
      descripcion,
      fechaPublicacion || null,
      fechaCierre || null,
      estado
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible crear la vacante.'
    );

  }

});


app.patch('/api/vacantes/:id', async (req, res) => {

  const {
    titulo,
    nombre_cargo,
    descripcion,
    fechaPublicacion,
    fechaCierre,
    estado,
    idUsuario,
    id_usuario,
    idSede,
    id_sede,
    idCargo,
    id_cargo
  } = req.body;

  try {

    const result = await db.query(`
            UPDATE vacante
            SET
                nombre_cargo =
                    COALESCE($1, nombre_cargo),

                descripcion =
                    COALESCE($2, descripcion),

                fecha_publicacion =
                    COALESCE($3, fecha_publicacion),

                fecha_cierre =
                    COALESCE($4, fecha_cierre),

                estado =
                    COALESCE($5, estado),

                id_usuario =
                    COALESCE($6, id_usuario),

                id_sede =
                    COALESCE($7, id_sede),

                id_cargo =
                    COALESCE($8, id_cargo)

            WHERE id_vacante = $9

            RETURNING *
        `, [
      nombre_cargo || titulo || null,
      descripcion ?? null,
      fechaPublicacion || null,
      fechaCierre || null,
      estado || null,
      idUsuario || id_usuario || null,
      idSede || id_sede || null,
      idCargo || id_cargo || null,
      req.params.id
    ]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Vacante no encontrada.'
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar la vacante.'
    );

  }

});


app.delete('/api/vacantes/:id', async (req, res) => {

  try {

    const result = await db.query(`
            DELETE FROM vacante
            WHERE id_vacante = $1
            RETURNING id_vacante
        `, [req.params.id]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Vacante no encontrada.'
      });

    }

    res.status(204).end();

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible eliminar la vacante.'
    );

  }

});


/* =========================================================
   ASPIRANTES
========================================================= */

app.get('/api/aspirantes', async (_req, res) => {

  try {

    const result = await db.query(`
            SELECT *
            FROM aspirante
            ORDER BY id_aspirante DESC
        `);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar aspirantes.'
    );

  }

});


app.get('/api/aspirantes/:id', async (req, res) => {

  try {

    const result = await db.query(`
            SELECT *
            FROM aspirante
            WHERE id_aspirante = $1
        `, [req.params.id]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Aspirante no encontrado.'
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar el aspirante.'
    );

  }

});


app.post('/api/aspirantes', async (req, res) => {

  const {
    tipoDocumento = 'CC',
    tipo_documento = 'CC',
    nombreCompleto,
    nombre,
    apellido,
    documento,
    numeroDocumento,
    correo,
    email,
    telefono,
    direccion,
    fechaRegistro,
    fecha_registro
  } = req.body;

  const nombreFinal =
      nombreCompleto ||
      `${nombre || ''} ${apellido || ''}`.trim();

  const documentoFinal =
      numeroDocumento ||
      documento;

  const correoFinal =
      correo ||
      email;

  if (
      !nombreFinal ||
      !documentoFinal ||
      !correoFinal ||
      !telefono ||
      !direccion
  ) {

    return res.status(400).json({
      error: 'Nombre, documento, correo, teléfono y dirección son obligatorios.'
    });

  }

  try {

    const result = await db.query(`
            INSERT INTO aspirante
                (
                    tipo_documento,
                    numero_documento,
                    nombre_completo,
                    correo,
                    telefono,
                    direccion,
                    fecha_registro,
                    activo
                )
            VALUES
                ($1,$2,$3,$4,$5,$6,
                 COALESCE($7,CURRENT_DATE),
                 true)
            RETURNING *
        `, [
      tipoDocumento || tipo_documento,
      documentoFinal,
      nombreFinal,
      correoFinal,
      telefono,
      direccion,
      fechaRegistro || fecha_registro || null
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible crear el aspirante.'
    );

  }

});


app.patch('/api/aspirantes/:id', async (req, res) => {

  const {
    nombreCompleto,
    nombre,
    apellido,
    documento,
    numeroDocumento,
    correo,
    email,
    telefono,
    direccion,
    activo
  } = req.body;

  let nombreFinal = null;

  if (nombreCompleto) {

    nombreFinal = nombreCompleto;

  } else if (nombre || apellido) {

    nombreFinal =
        `${nombre || ''} ${apellido || ''}`.trim();

  }

  try {

    const result = await db.query(`
            UPDATE aspirante
            SET
                nombre_completo =
                    COALESCE($1, nombre_completo),

                numero_documento =
                    COALESCE($2, numero_documento),

                correo =
                    COALESCE($3, correo),

                telefono =
                    COALESCE($4, telefono),

                direccion =
                    COALESCE($5, direccion),

                activo =
                    COALESCE($6, activo)

            WHERE id_aspirante = $7

            RETURNING *
        `, [
      nombreFinal,
      numeroDocumento || documento || null,
      correo || email || null,
      telefono || null,
      direccion || null,
      activo ?? null,
      req.params.id
    ]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Aspirante no encontrado.'
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar el aspirante.'
    );

  }

});


app.delete('/api/aspirantes/:id', async (req, res) => {

  const client = await db.connect();

  try {

    await client.query('BEGIN');

    await client.query(`
            DELETE FROM documento
            WHERE id_aspirante = $1
        `, [req.params.id]);

    const result = await client.query(`
            DELETE FROM aspirante
            WHERE id_aspirante = $1
            RETURNING id_aspirante
        `, [req.params.id]);

    if (!result.rowCount) {

      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Aspirante no encontrado.'
      });

    }

    await client.query('COMMIT');

    res.status(204).end();

  } catch (error) {

    await client.query('ROLLBACK');

    errorResponse(
        res,
        error,
        'No fue posible eliminar el aspirante.'
    );

  } finally {

    client.release();

  }

});


/* =========================================================
   CONSULTA CENTRAL DE POSTULACIONES
========================================================= */

const postulacionQuery = `
    SELECT
        p.id_postulacion,
        p.id_aspirante,
        p.id_vacante,
        p.fecha_postulacion,
        p.estado,
        p.id_rrhh,

        a.tipo_documento,
        a.numero_documento,
        a.nombre_completo,
        a.correo,
        a.telefono,
        a.direccion,
        a.fecha_registro,
        a.activo AS aspirante_activo,

        v.nombre_cargo AS cargo,
        v.descripcion AS descripcion_vacante,
        v.fecha_publicacion,
        v.fecha_cierre,
        v.estado AS estado_vacante,
        v.id_sede,
        v.id_cargo,

        s.nombre_sede,

        c.nombre_cargo AS cargo_catalogo,

        COALESCE(
            (
                SELECT COUNT(*)::int
                FROM documento d
                WHERE d.id_aspirante = p.id_aspirante
            ),
            0
        ) AS documentos_count

    FROM postulacion p

    JOIN aspirante a
        ON a.id_aspirante = p.id_aspirante

    JOIN vacante v
        ON v.id_vacante = p.id_vacante

    LEFT JOIN sede s
        ON s.id_sede = v.id_sede

    LEFT JOIN cargo c
        ON c.id_cargo = v.id_cargo
`;


/* =========================================================
   DASHBOARD
========================================================= */

app.get('/api/dashboard', async (req, res) => {

  try {

    const values = [];

    let clause = '';

    if (req.query.idSede) {

      values.push(req.query.idSede);

      clause = `WHERE v.id_sede = $${values.length}`;
    }

    const result = await db.query(`
            SELECT

                COUNT(*)::int AS total,

                COUNT(*)
                    FILTER (
                        WHERE p.estado IN (
                            'EN_REVISION',
                            'APROBADO_RRHH'
                        )
                    )::int AS en_revision,

                COUNT(*)
                    FILTER (
                        WHERE p.estado = 'ENTREVISTA'
                    )::int AS entrevistas,

                COUNT(*)
                    FILTER (
                        WHERE p.estado IN (
                            'APROBADO',
                            'CONTRATADO'
                        )
                    )::int AS aprobados

            FROM postulacion p

            JOIN vacante v
                ON v.id_vacante = p.id_vacante

            ${clause}
        `, values);

    res.json(
        result.rows[0] || {
          total: 0,
          en_revision: 0,
          entrevistas: 0,
          aprobados: 0
        }
    );

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar los indicadores.'
    );

  }

});


/* =========================================================
   POSTULACIONES - LISTAR
========================================================= */

app.get('/api/postulaciones', async (req, res) => {

  try {

    const values = [];

    const where = [];

    if (req.query.estado) {

      const estadoSolicitado = String(req.query.estado)
          .trim()
          .toUpperCase();

      /*
       * Cuando Agenda solicita "Aprobado",
       * debe mostrar tanto los candidatos con estado:
       *
       * APROBADO
       * APROBADO_RRHH
       *
       * Ambos están autorizados para pasar a entrevista.
       */

      if (estadoSolicitado === 'APROBADO') {

        where.push(`
      p.estado IN (
        'APROBADO',
        'APROBADO_RRHH'
      )
    `);

      } else {

        values.push(req.query.estado);

        where.push(
            `LOWER(p.estado) = LOWER($${values.length})`
        );

      }

    }

    if (req.query.buscar) {

      values.push(`%${req.query.buscar}%`);

      where.push(`
                (
                    a.nombre_completo ILIKE $${values.length}
                    OR a.numero_documento ILIKE $${values.length}
                    OR a.correo ILIKE $${values.length}
                    OR v.nombre_cargo ILIKE $${values.length}
                )
            `);

    }

    if (req.query.idAspirante) {

      values.push(req.query.idAspirante);

      where.push(
          `p.id_aspirante = $${values.length}`
      );

    }

    if (req.query.idPostulante) {

      values.push(req.query.idPostulante);

      where.push(
          `p.id_aspirante = $${values.length}`
      );

    }

    if (req.query.idSede) {

      values.push(req.query.idSede);

      where.push(
          `v.id_sede = $${values.length}`
      );

    }

    const result = await db.query(`
            ${postulacionQuery}

            ${where.length
        ? 'WHERE ' + where.join(' AND ')
        : ''
    }

            ORDER BY
                p.fecha_postulacion DESC,
                p.id_postulacion DESC
        `, values);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar postulaciones.'
    );

  }

});


/* =========================================================
   POSTULACIÓN - DETALLE
========================================================= */

app.get('/api/postulaciones/:id', async (req, res) => {

  try {

    const result = await db.query(`
            ${postulacionQuery}

            WHERE p.id_postulacion = $1
        `, [req.params.id]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Postulación no encontrada.'
      });

    }

    const row = result.rows[0];

    const docs = await db.query(`
            SELECT
                id_documento,
                nombre_archivo,
                tipo_archivo,
                fecha_subida,
                fecha_revision,
                estado,
                observacion,
                archivo
            FROM documento
            WHERE id_aspirante = $1
            ORDER BY id_documento
        `, [row.id_aspirante]);

    const entrevista = await db.query(`
            SELECT
                e.id_entrevista,
                e.fecha_entrevista,
                e.modalidad,
                e.estado,
                e.observacion,
                e.id_seleccionado,
                e.id_gerente

            FROM entrevista e

            JOIN aspirantes_seleccionados s
                ON s.id_seleccionado = e.id_seleccionado

            WHERE s.id_postulacion = $1

            ORDER BY e.id_entrevista DESC

            LIMIT 1
        `, [req.params.id]);

    res.json({
      ...row,
      documentos: docs.rows,
      entrevista: entrevista.rows[0] || null
    });

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar la postulación.'
    );

  }

});



/* =========================================================
   CREAR POSTULACIÓN
========================================================= */

app.post('/api/postulaciones', async (req, res) => {

  const body = req.body || {};

  /*
   * Aceptamos los nombres que puede enviar el frontend.
   * Esto evita errores si el formulario usa cedula/email
   * mientras el servidor espera documento/correo.
   */

  const idAspirante = Number(
      body.idAspirante ||
      body.id_aspirante ||
      body.idPostulante ||
      body.id_postulante ||
      0
  );

  const nombreFinal = String(
      body.nombreCompleto ||
      body.nombre ||
      `${body.nombres || ''} ${body.apellido || ''}`.trim() ||
      ''
  ).trim();

  const documentoFinal = String(
      body.documento ||
      body.cedula ||
      body.numeroDocumento ||
      body.numero_documento ||
      ''
  ).trim();

  const correoFinal = String(
      body.correo ||
      body.email ||
      ''
  ).trim();

  const telefonoFinal = String(
      body.telefono ||
      body.celular ||
      ''
  ).trim();

  /*
   * Aceptamos varias formas de dirección.
   * "ciudad" queda como respaldo para evitar que un
   * formulario antiguo bloquee la postulación.
   */

  const direccionFinal = String(
      body.direccion ||
      body.direccionResidencia ||
      body.direccion_residencia ||
      body.ciudad ||
      ''
  ).trim();

  const cargoFinal = String(
      body.cargo ||
      body.nombreCargo ||
      body.nombre_cargo ||
      ''
  ).trim();

  const vacancyId = Number(
      body.idVacante ||
      body.id_vacante ||
      0
  );

  const documentos = Array.isArray(body.documentos)
      ? body.documentos
      : [];

  /*
   * Validación
   */

  if (!nombreFinal) {
    return res.status(400).json({
      error: 'El nombre completo es obligatorio.'
    });
  }

  if (!documentoFinal) {
    return res.status(400).json({
      error: 'El documento es obligatorio.'
    });
  }

  if (!correoFinal) {
    return res.status(400).json({
      error: 'El correo electrónico es obligatorio.'
    });
  }

  if (!telefonoFinal) {
    return res.status(400).json({
      error: 'El teléfono es obligatorio.'
    });
  }

  if (!direccionFinal) {
    return res.status(400).json({
      error: 'La dirección o ciudad de residencia es obligatoria.'
    });
  }

  const client = await db.connect();

  try {

    await client.query('BEGIN');

    let aspiranteId = idAspirante;


    /* =====================================================
       BUSCAR O CREAR ASPIRANTE
    ===================================================== */

    if (!aspiranteId) {

      const existing = await client.query(`
        SELECT id_aspirante
        FROM aspirante
        WHERE
          numero_documento = $1
          OR LOWER(correo) = LOWER($2)
        LIMIT 1
      `, [
        documentoFinal,
        correoFinal
      ]);

      if (existing.rowCount) {

        aspiranteId =
            existing.rows[0].id_aspirante;

        /*
         * Actualizamos los datos por si el aspirante
         * ya existía pero tenía información antigua.
         */

        await client.query(`
          UPDATE aspirante
          SET
            nombre_completo = $1,
            numero_documento = $2,
            correo = $3,
            telefono = $4,
            direccion = $5,
            activo = true
          WHERE id_aspirante = $6
        `, [
          nombreFinal,
          documentoFinal,
          correoFinal,
          telefonoFinal,
          direccionFinal,
          aspiranteId
        ]);

      } else {

        const created = await client.query(`
          INSERT INTO aspirante
          (
            tipo_documento,
            numero_documento,
            nombre_completo,
            correo,
            telefono,
            direccion,
            fecha_registro,
            activo
          )
          VALUES
          (
            'CC',
            $1,
            $2,
            $3,
            $4,
            $5,
            CURRENT_DATE,
            true
          )
          RETURNING id_aspirante
        `, [
          documentoFinal,
          nombreFinal,
          correoFinal,
          telefonoFinal,
          direccionFinal
        ]);

        aspiranteId =
            created.rows[0].id_aspirante;
      }
    }


    /* =====================================================
       VERIFICAR ASPIRANTE EXISTENTE
       Si vino directamente un idAspirante
    ===================================================== */

    if (aspiranteId) {

      const checkAspirante = await client.query(`
        SELECT id_aspirante
        FROM aspirante
        WHERE id_aspirante = $1
      `, [aspiranteId]);

      if (!checkAspirante.rowCount) {

        throw Object.assign(
            new Error('El aspirante indicado no existe.'),
            { status: 400 }
        );

      }

    }


    /* =====================================================
       BUSCAR VACANTE
    ===================================================== */

    let finalVacancyId = vacancyId;


    /*
     * Si el frontend mandó directamente idVacante,
     * verificamos que exista.
     */

    if (finalVacancyId) {

      const vacancy = await client.query(`
        SELECT
          id_vacante,
          estado
        FROM vacante
        WHERE id_vacante = $1
      `, [finalVacancyId]);

      if (!vacancy.rowCount) {

        throw Object.assign(
            new Error('La vacante seleccionada no existe.'),
            { status: 400 }
        );

      }

      if (vacancy.rows[0].estado !== 'ABIERTA') {

        throw Object.assign(
            new Error('La vacante seleccionada ya no está abierta.'),
            { status: 400 }
        );

      }

    }


    /*
     * Si no llegó idVacante, buscamos por nombre del cargo.
     */

    if (!finalVacancyId && cargoFinal) {

      const found = await client.query(`
        SELECT id_vacante
        FROM vacante
        WHERE
          LOWER(TRIM(nombre_cargo)) =
          LOWER(TRIM($1))
          AND estado = 'ABIERTA'
        ORDER BY id_vacante DESC
        LIMIT 1
      `, [cargoFinal]);

      if (!found.rowCount) {

        throw Object.assign(
            new Error(
                'No hay una vacante abierta para el cargo seleccionado.'
            ),
            { status: 400 }
        );

      }

      finalVacancyId =
          found.rows[0].id_vacante;
    }


    if (!finalVacancyId) {

      throw Object.assign(
          new Error(
              'Debes seleccionar una vacante o un cargo disponible.'
          ),
          { status: 400 }
      );

    }


    /* =====================================================
       EVITAR POSTULACIÓN DUPLICADA
    ===================================================== */

    const duplicate = await client.query(`
      SELECT id_postulacion
      FROM postulacion
      WHERE
        id_aspirante = $1
        AND id_vacante = $2
      LIMIT 1
    `, [
      aspiranteId,
      finalVacancyId
    ]);

    if (duplicate.rowCount) {

      throw Object.assign(
          new Error(
              'Este aspirante ya está postulado a esta vacante.'
          ),
          { status: 409 }
      );

    }


    /* =====================================================
       CREAR POSTULACIÓN
    ===================================================== */

    const post = await client.query(`
      INSERT INTO postulacion
      (
        fecha_postulacion,
        estado,
        id_aspirante,
        id_vacante
      )
      VALUES
      (
        CURRENT_DATE,
        'EN_REVISION',
        $1,
        $2
      )
      RETURNING *
    `, [
      aspiranteId,
      finalVacancyId
    ]);


    /* =====================================================
       GUARDAR DOCUMENTOS
    ===================================================== */

    for (const doc of documentos) {

      if (!doc || typeof doc !== 'object') {
        continue;
      }

      const nombreArchivo = String(
          doc.nombreArchivo ||
          doc.nombreDocumento ||
          doc.nombre_archivo ||
          'Documento'
      ).trim();

      const tipoArchivo = String(
          doc.tipoArchivo ||
          doc.tipoDocumento ||
          doc.tipo_archivo ||
          'PDF'
      ).trim();

      const archivo = String(
          doc.archivo ||
          doc.rutaArchivo ||
          doc.ruta_archivo ||
          ''
      ).trim();

      /*
       * La columna archivo es NOT NULL.
       * Si no llegó contenido, no insertamos ese documento.
       */

      if (!archivo) {
        continue;
      }

      await client.query(`
        INSERT INTO documento
        (
          nombre_archivo,
          tipo_archivo,
          fecha_subida,
          estado,
          archivo,
          id_aspirante
        )
        VALUES
        (
          $1,
          $2,
          CURRENT_TIMESTAMP,
          'PENDIENTE',
          $3,
          $4
        )
      `, [
        nombreArchivo,
        tipoArchivo,
        archivo,
        aspiranteId
      ]);

    }


    await client.query('COMMIT');


    /* =====================================================
       RESPUESTA
    ===================================================== */

    res.status(201).json({

      ok: true,

      mensaje:
          'Postulación registrada correctamente.',

      idPostulacion:
      post.rows[0].id_postulacion,

      id_aspirante:
      aspiranteId,

      id_vacante:
      finalVacancyId,

      estado:
      post.rows[0].estado,

      postulacion:
          post.rows[0]

    });


  } catch (error) {

    await client.query('ROLLBACK');

    console.error(
        'ERROR AL CREAR POSTULACIÓN:',
        error
    );

    errorResponse(
        res,
        error,
        'No fue posible registrar la postulación.'
    );

  } finally {

    client.release();

  }

});

/* =========================================================
   ACTUALIZAR ESTADO DE POSTULACIÓN
========================================================= */

app.patch('/api/postulaciones/:id', async (req, res) => {

  const { estado } = req.body;

  // Normalizar el estado recibido desde el frontend
  const estadoNormalizado =
      normalizarEstadoPostulacion(estado);

  if (!estadoNormalizado) {

    return res.status(400).json({
      error: 'El estado de postulación no es válido.'
    });

  }

  try {

    const result = await db.query(`
      UPDATE postulacion
      SET estado = $1
      WHERE id_postulacion = $2
      RETURNING *
    `, [
      estadoNormalizado,
      req.params.id
    ]);

    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Postulación no encontrada.'
      });

    }

    res.json({
      ok: true,
      mensaje: 'Estado actualizado correctamente.',
      postulacion: result.rows[0]
    });

  } catch (error) {

    console.error(
        'ERROR AL ACTUALIZAR ESTADO:',
        error
    );

    errorResponse(
        res,
        error,
        'No fue posible actualizar el estado de la postulación.'
    );

  }

});

/* =========================================================
   ACTUALIZAR DATOS DE POSTULACIÓN
========================================================= */

app.patch('/api/postulaciones/:id/datos', async (req, res) => {

  const {
    nombre,
    nombreCompleto,
    apellido,
    correo,
    email,
    telefono,
    direccion,
    documento,
    cedula,
    activo
  } = req.body;

  try {

    const post = await db.query(`
            SELECT id_aspirante
            FROM postulacion
            WHERE id_postulacion = $1
        `, [req.params.id]);

    if (!post.rowCount) {

      return res.status(404).json({
        error: 'Postulación no encontrada.'
      });

    }

    const id =
        post.rows[0].id_aspirante;

    const nombreFinal =
        nombreCompleto ||
        `${nombre || ''} ${apellido || ''}`.trim() ||
        null;

    await db.query(`
            UPDATE aspirante

            SET
                nombre_completo =
                    COALESCE($1, nombre_completo),

                numero_documento =
                    COALESCE($2, numero_documento),

                correo =
                    COALESCE($3, correo),

                telefono =
                    COALESCE($4, telefono),

                direccion =
                    COALESCE($5, direccion),

                activo =
                    COALESCE($6, activo)

            WHERE id_aspirante = $7
        `, [
      nombreFinal,
      documento || cedula || null,
      correo || email || null,
      telefono || null,
      direccion || null,
      activo ?? null,
      id
    ]);


    const result = await db.query(`
            ${postulacionQuery}

            WHERE p.id_postulacion = $1
        `, [req.params.id]);


    res.json(result.rows[0]);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar el candidato.'
    );

  }

});


/* =========================================================
   ELIMINAR POSTULACIÓN
========================================================= */

app.delete('/api/postulaciones/:id', async (req, res) => {

  const client = await db.connect();

  try {

    await client.query('BEGIN');


    const p = await client.query(`
            SELECT
                id_aspirante
            FROM postulacion
            WHERE id_postulacion = $1
        `, [req.params.id]);


    if (!p.rowCount) {

      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Postulación no encontrada.'
      });

    }


    const aspiranteId =
        p.rows[0].id_aspirante;


    /*
     * Primero eliminamos entrevistas.
     * La tabla aspirantes_seleccionados
     * está relacionada con la postulación.
     */

    await client.query(`
            DELETE FROM entrevista
            WHERE id_seleccionado IN (
                SELECT id_seleccionado
                FROM aspirantes_seleccionados
                WHERE id_postulacion = $1
            )
        `, [req.params.id]);


    await client.query(`
            DELETE FROM aspirantes_seleccionados
            WHERE id_postulacion = $1
        `, [req.params.id]);


    await client.query(`
            DELETE FROM documento
            WHERE id_aspirante = $1
        `, [aspiranteId]);


    await client.query(`
            DELETE FROM postulacion
            WHERE id_postulacion = $1
        `, [req.params.id]);


    /*
     * Solo eliminamos el aspirante si ya no
     * tiene ninguna otra postulación.
     */

    const otherPosts = await client.query(`
            SELECT 1
            FROM postulacion
            WHERE id_aspirante = $1
            LIMIT 1
        `, [aspiranteId]);


    if (!otherPosts.rowCount) {

      await client.query(`
                DELETE FROM aspirante
                WHERE id_aspirante = $1
            `, [aspiranteId]);

    }


    await client.query('COMMIT');

    res.status(204).end();


  } catch (error) {

    await client.query('ROLLBACK');

    errorResponse(
        res,
        error,
        'No fue posible eliminar la postulación.'
    );

  } finally {

    client.release();

  }

});


/* =========================================================
   ASPIRANTES SELECCIONADOS
========================================================= */

app.get('/api/seleccionados', async (_req, res) => {

  try {

    const result = await db.query(`
            SELECT

                s.id_seleccionado,

                s.id_postulacion,

                s.fecha_seleccion,

                s.estado,

                s.id_rrhh,

                p.id_aspirante,

                p.id_vacante,

                a.nombre_completo,

                a.numero_documento,

                a.correo,

                a.telefono,

                v.nombre_cargo,

                v.descripcion

            FROM aspirantes_seleccionados s

            JOIN postulacion p
                ON p.id_postulacion = s.id_postulacion

            JOIN aspirante a
                ON a.id_aspirante = p.id_aspirante

            JOIN vacante v
                ON v.id_vacante = p.id_vacante

            ORDER BY s.id_seleccionado DESC
        `);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar seleccionados.'
    );

  }

});


/* =========================================================
   ENTREVISTAS
========================================================= */

app.get('/api/entrevistas', async (_req, res) => {

  try {

    const result = await db.query(`
            SELECT

                e.id_entrevista,

                e.fecha_entrevista,

                e.modalidad,

                e.estado,

                e.observacion,

                e.id_seleccionado,

                e.id_gerente,

                s.id_postulacion,

                p.id_aspirante,

                a.nombre_completo AS candidato,

                a.numero_documento,

                a.correo,

                a.telefono,

                v.nombre_cargo AS cargo,

                s.estado AS estado_seleccionado,

                u.nombre_completo AS gerente

            FROM entrevista e

            JOIN aspirantes_seleccionados s
                ON s.id_seleccionado = e.id_seleccionado

            JOIN postulacion p
                ON p.id_postulacion = s.id_postulacion

            JOIN aspirante a
                ON a.id_aspirante = p.id_aspirante

            JOIN vacante v
                ON v.id_vacante = p.id_vacante

            LEFT JOIN gerente g
                ON g.id_gerente = e.id_gerente

            LEFT JOIN usuario u
                ON u.id_usuario = g.id_gerente

            ORDER BY e.fecha_entrevista DESC
        `);

    res.json(result.rows);

  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar entrevistas.'
    );

  }

});


app.post('/api/entrevistas', async (req, res) => {

  const {
    idPostulacion,
    fecha,
    fechaEntrevista,
    hora = '09:00',
    modalidad = 'Presencial',
    indicaciones = '',
    observaciones = '',
    idGerente
  } = req.body;

  try {

    const approved = await db.query(`
            SELECT id_postulacion
            FROM postulacion
            WHERE
                id_postulacion = $1
                AND estado IN (
                    'APROBADO',
                    'APROBADO_RRHH'
                )
        `, [idPostulacion]);


    if (!approved.rowCount) {

      return res.status(400).json({
        error:
            'La postulación debe estar aprobada antes de agendar la entrevista.'
      });

    }


    /*
     * Buscamos un usuario RRHH para relacionarlo
     * con aspirantes_seleccionados.
     */

    let rrhhId = null;

    const rrhh = await db.query(`
            SELECT id_rrhh
            FROM recursos_humanos
            ORDER BY id_rrhh
            LIMIT 1
        `);

    if (rrhh.rowCount) {

      rrhhId =
          rrhh.rows[0].id_rrhh;

    }


    if (!rrhhId) {

      return res.status(400).json({
        error:
            'No existe un usuario de Recursos Humanos configurado.'
      });

    }


    /*
     * Crear/actualizar seleccionado
     */

    const selected = await db.query(`
            INSERT INTO aspirantes_seleccionados
                (
                    id_postulacion,
                    fecha_seleccion,
                    estado,
                    id_rrhh
                )
            VALUES
                (
                    $1,
                    CURRENT_DATE,
                    'SELECCIONADO_EN_PROCESO',
                    $2
                )

            ON CONFLICT (id_postulacion)

            DO UPDATE SET
                estado = 'SELECCIONADO_EN_PROCESO',
                id_rrhh = EXCLUDED.id_rrhh

            RETURNING id_seleccionado
        `, [
      idPostulacion,
      rrhhId
    ]);


    const modalidadDB =
        String(modalidad)
            .toLowerCase()
            .includes('virtual')
            ? 'Virtual'
            : 'Presencial';


    /*
     * Buscar gerente.
     * Si viene desde el frontend lo usamos.
     * Si no, buscamos el primero disponible.
     */

    let gerenteId =
        Number(idGerente || 0);

    if (!gerenteId) {

      const gerente = await db.query(`
                SELECT id_gerente
                FROM gerente
                ORDER BY id_gerente
                LIMIT 1
            `);

      if (gerente.rowCount) {

        gerenteId =
            gerente.rows[0].id_gerente;

      }

    }


    if (!gerenteId) {

      return res.status(400).json({
        error:
            'No existe un gerente configurado para crear la entrevista.'
      });

    }


    /*
     * Combinar fecha + hora si llegan separados.
     */

    let fechaFinal =
        fecha ||
        fechaEntrevista;

    if (
        fechaFinal &&
        hora &&
        String(fechaFinal).length <= 10
    ) {

      fechaFinal =
          `${fechaFinal} ${hora}`;
    }


    const result = await db.query(`
            INSERT INTO entrevista
                (
                    fecha_entrevista,
                    modalidad,
                    estado,
                    observacion,
                    id_seleccionado,
                    id_gerente
                )
            VALUES
                (
                    $1,
                    $2,
                    'PROGRAMADA',
                    $3,
                    $4,
                    $5
                )
            RETURNING *
        `, [
      fechaFinal,
      modalidadDB,
      indicaciones || observaciones,
      selected.rows[0].id_seleccionado,
      gerenteId
    ]);


    await db.query(`
            UPDATE postulacion
            SET estado = 'ENTREVISTA'
            WHERE id_postulacion = $1
        `, [idPostulacion]);


    res.status(201).json({

      ...result.rows[0],

      id_entrevista:
      result.rows[0].id_entrevista,

      hora_entrevista:
      hora,

      observaciones:
      result.rows[0].observacion,

      resultado:
      result.rows[0].estado
    });


  } catch (error) {

    console.error(
        'Error al guardar entrevista:',
        error
    );

    errorResponse(
        res,
        error,
        'No fue posible guardar la entrevista.'
    );

  }

});


app.patch('/api/entrevistas/:id', async (req, res) => {

  const {
    fecha,
    fechaEntrevista,
    hora,
    modalidad,
    observaciones = '',
    resultado,
    estado
  } = req.body;


  const estadoRecibido =
      String(
          estado ||
          resultado ||
          'PROGRAMADA'
      )
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');


  const estados = {

    PENDIENTE: 'PROGRAMADA',

    PROGRAMADA: 'PROGRAMADA',

    REALIZADA: 'REALIZADA',

    CANCELADA: 'CANCELADA'
  };


  const estadoDB =
      estados[estadoRecibido] ||
      'PROGRAMADA';


  const modalidadDB =
      modalidad
          ? (
              String(modalidad)
                  .toLowerCase()
                  .includes('virtual')
                  ? 'Virtual'
                  : 'Presencial'
          )
          : null;


  let fechaFinal =
      fecha ||
      fechaEntrevista ||
      null;


  if (
      fechaFinal &&
      hora &&
      String(fechaFinal).length <= 10
  ) {

    fechaFinal =
        `${fechaFinal} ${hora}`;

  }


  try {

    const result = await db.query(`
            UPDATE entrevista

            SET
                fecha_entrevista =
                    COALESCE(
                        $1,
                        fecha_entrevista
                    ),

                modalidad =
                    COALESCE(
                        $2,
                        modalidad
                    ),

                observacion =
                    $3,

                estado =
                    $4

            WHERE id_entrevista = $5

            RETURNING *
        `, [
      fechaFinal,
      modalidadDB,
      observaciones,
      estadoDB,
      req.params.id
    ]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Entrevista no encontrada.'
      });

    }


    res.json({

      ...result.rows[0],

      id_entrevista:
      result.rows[0].id_entrevista,

      observaciones:
      result.rows[0].observacion,

      resultado:
      result.rows[0].estado
    });


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar la entrevista.'
    );

  }

});


app.delete('/api/entrevistas/:id', async (req, res) => {

  try {

    const result = await db.query(`
            DELETE FROM entrevista

            WHERE id_entrevista = $1

            RETURNING id_entrevista
        `, [req.params.id]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Entrevista no encontrada.'
      });

    }


    res.status(204).end();


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible eliminar la entrevista.'
    );

  }

});


/* =========================================================
   DOCUMENTOS
========================================================= */

app.get('/api/documentos', async (req, res) => {

  try {

    const values = [];

    let clause = '';

    const idAspirante =
        req.query.idAspirante ||
        req.query.idPostulante;

    if (idAspirante) {

      values.push(idAspirante);

      clause =
          `WHERE d.id_aspirante = $${values.length}`;
    }


    const result = await db.query(`
            SELECT

                d.*,

                a.nombre_completo AS aspirante,

                a.numero_documento

            FROM documento d

            JOIN aspirante a
                ON a.id_aspirante = d.id_aspirante

            ${clause}

            ORDER BY d.id_documento DESC
        `, values);


    res.json(result.rows);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar documentos.'
    );

  }

});


app.post('/api/documentos', async (req, res) => {

  const {
    nombreDocumento,
    nombreArchivo = 'Documento',
    tipoDocumento,
    tipoArchivo = 'PDF',
    archivo = 'pendiente',
    rutaArchivo,
    idPostulante,
    idAspirante
  } = req.body;


  const aspiranteId =
      idAspirante ||
      idPostulante;


  if (!aspiranteId) {

    return res.status(400).json({
      error: 'El aspirante es obligatorio.'
    });

  }


  try {

    const result = await db.query(`
            INSERT INTO documento
                (
                    nombre_archivo,
                    tipo_archivo,
                    estado,
                    archivo,
                    id_aspirante
                )
            VALUES
                (
                    $1,
                    $2,
                    'PENDIENTE',
                    $3,
                    $4
                )
            RETURNING *
        `, [
      nombreDocumento ||
      nombreArchivo,

      tipoDocumento ||
      tipoArchivo,

      rutaArchivo ||
      archivo,

      aspiranteId
    ]);


    res.status(201).json(
        result.rows[0]
    );


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible crear documento.'
    );

  }

});


app.patch('/api/documentos/:id', async (req, res) => {

  const {
    nombreDocumento,
    nombreArchivo,
    tipoDocumento,
    tipoArchivo,
    archivo,
    rutaArchivo,
    estado,
    observacion
  } = req.body;


  try {

    const result = await db.query(`
            UPDATE documento

            SET
                nombre_archivo =
                    COALESCE(
                        $1,
                        nombre_archivo
                    ),

                tipo_archivo =
                    COALESCE(
                        $2,
                        tipo_archivo
                    ),

                archivo =
                    COALESCE(
                        $3,
                        archivo
                    ),

                estado =
                    COALESCE(
                        $4,
                        estado
                    ),

                observacion =
                    COALESCE(
                        $5,
                        observacion
                    ),

                fecha_revision =
                    CASE
                        WHEN $4 IS NOT NULL
                        THEN CURRENT_TIMESTAMP
                        ELSE fecha_revision
                    END

            WHERE id_documento = $6

            RETURNING *
        `, [
      nombreDocumento ||
      nombreArchivo ||
      null,

      tipoDocumento ||
      tipoArchivo ||
      null,

      rutaArchivo ||
      archivo ||
      null,

      estado ||
      null,

      observacion ??
      null,

      req.params.id
    ]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Documento no encontrado.'
      });

    }


    res.json(result.rows[0]);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar documento.'
    );

  }

});


app.delete('/api/documentos/:id', async (req, res) => {

  try {

    const result = await db.query(`
            DELETE FROM documento

            WHERE id_documento = $1

            RETURNING id_documento
        `, [req.params.id]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Documento no encontrado.'
      });

    }


    res.status(204).end();


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible eliminar documento.'
    );

  }

});


/* =========================================================
   EVALUACIONES
========================================================= */

/*
 * IMPORTANTE:
 *
 * Tu base de datos SIDOVI NO tiene una tabla "evaluacion".
 *
 * Por eso no hacemos SELECT/INSERT sobre una tabla inexistente.
 *
 * Dejamos las rutas funcionando y devolvemos un mensaje
 * claro para que el frontend no provoque un error SQL.
 */

app.get('/api/evaluaciones', async (_req, res) => {

  res.json([]);

});


app.post('/api/evaluaciones', async (_req, res) => {

  res.status(501).json({
    error:
        'La funcionalidad de evaluaciones requiere una tabla de evaluación en la base de datos SIDOVI.'
  });

});


/* =========================================================
   CONTRATOS
========================================================= */

app.get('/api/contratos', async (req, res) => {

  try {

    const values = [];

    let clause = '';

    if (req.query.idPostulacion) {

      values.push(
          req.query.idPostulacion
      );

      clause =
          `WHERE c.id_postulacion = $1`;
    }


    const result = await db.query(`
            SELECT

                c.*,

                p.id_aspirante,

                p.id_vacante,

                a.nombre_completo AS trabajador,

                a.numero_documento,

                a.correo,

                a.telefono,

                v.nombre_cargo AS cargo,

                v.descripcion AS descripcion_vacante

            FROM contrato c

            JOIN postulacion p
                ON p.id_postulacion =
                   c.id_postulacion

            JOIN aspirante a
                ON a.id_aspirante =
                   p.id_aspirante

            JOIN vacante v
                ON v.id_vacante =
                   p.id_vacante

            ${clause}

            ORDER BY c.id_contrato DESC
        `, values);


    res.json(result.rows);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar contratos.'
    );

  }

});


app.get('/api/contratos/:id', async (req, res) => {

  try {

    const result = await db.query(`
            SELECT
                c.*,

                p.id_aspirante,

                p.id_vacante,

                a.nombre_completo AS trabajador,

                a.numero_documento,

                a.correo,

                a.telefono,

                v.nombre_cargo AS cargo

            FROM contrato c

            JOIN postulacion p
                ON p.id_postulacion =
                   c.id_postulacion

            JOIN aspirante a
                ON a.id_aspirante =
                   p.id_aspirante

            JOIN vacante v
                ON v.id_vacante =
                   p.id_vacante

            WHERE c.id_contrato = $1
        `, [req.params.id]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Contrato no encontrado.'
      });

    }


    res.json(result.rows[0]);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar el contrato.'
    );

  }

});


app.post('/api/contratos', async (req, res) => {

  const {
    idPostulacion,
    fechaInicio,
    fechaFin = null,
    tipoContrato = 'Término Fijo',
    salario = 0,
    estado = 'Borrador',
    observaciones = ''
  } = req.body;


  if (!idPostulacion || !fechaInicio) {

    return res.status(400).json({
      error:
          'La postulación y la fecha de inicio son obligatorias.'
    });

  }


  try {

    const result = await db.query(`
            INSERT INTO contrato
                (
                    id_postulacion,
                    fecha_inicio,
                    fecha_fin,
                    tipo_contrato,
                    salario,
                    estado,
                    observaciones
                )
            VALUES
                ($1,$2,$3,$4,$5,$6,$7)

            RETURNING *
        `, [
      idPostulacion,
      fechaInicio,
      fechaFin,
      tipoContrato,
      salario,
      estado,
      observaciones
    ]);


    /*
     * Si el contrato queda activo/creado,
     * actualizamos la postulación.
     */

    if (
        estado === 'Activo' ||
        estado === 'Finalizado'
    ) {

      await db.query(`
                UPDATE postulacion
                SET estado = 'CONTRATADO'
                WHERE id_postulacion = $1
            `, [idPostulacion]);

    }


    res.status(201).json(
        result.rows[0]
    );


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible crear el contrato.'
    );

  }

});


app.patch('/api/contratos/:id', async (req, res) => {

  const {
    fechaInicio,
    fechaFin,
    tipoContrato,
    salario,
    estado,
    observaciones
  } = req.body;


  try {

    const result = await db.query(`
            UPDATE contrato

            SET

                fecha_inicio =
                    COALESCE(
                        $1,
                        fecha_inicio
                    ),

                fecha_fin =
                    COALESCE(
                        $2,
                        fecha_fin
                    ),

                tipo_contrato =
                    COALESCE(
                        $3,
                        tipo_contrato
                    ),

                salario =
                    COALESCE(
                        $4,
                        salario
                    ),

                estado =
                    COALESCE(
                        $5,
                        estado
                    ),

                observaciones =
                    COALESCE(
                        $6,
                        observaciones
                    )

            WHERE id_contrato = $7

            RETURNING *
        `, [
      fechaInicio || null,
      fechaFin || null,
      tipoContrato || null,
      salario ?? null,
      estado || null,
      observaciones ?? null,
      req.params.id
    ]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Contrato no encontrado.'
      });

    }


    res.json(result.rows[0]);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible actualizar el contrato.'
    );

  }

});


app.delete('/api/contratos/:id', async (req, res) => {

  try {

    const result = await db.query(`
            DELETE FROM contrato

            WHERE id_contrato = $1

            RETURNING id_contrato
        `, [req.params.id]);


    if (!result.rowCount) {

      return res.status(404).json({
        error: 'Contrato no encontrado.'
      });

    }


    res.status(204).end();


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible eliminar el contrato.'
    );

  }

});


/* =========================================================
   TRABAJADORES
========================================================= */

app.get('/api/trabajadores', async (_req, res) => {

  try {

    const result = await db.query(`
            SELECT

                c.id_contrato,

                c.id_postulacion,

                c.fecha_inicio,

                c.fecha_fin,

                c.tipo_contrato,

                c.salario,

                c.estado,

                a.id_aspirante,

                a.nombre_completo AS trabajador,

                a.numero_documento,

                a.correo,

                a.telefono,

                v.nombre_cargo AS cargo,

                v.id_sede

            FROM contrato c

            JOIN postulacion p
                ON p.id_postulacion =
                   c.id_postulacion

            JOIN aspirante a
                ON a.id_aspirante =
                   p.id_aspirante

            JOIN vacante v
                ON v.id_vacante =
                   p.id_vacante

            ORDER BY
                c.fecha_inicio DESC
        `);


    res.json(result.rows);


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible consultar trabajadores.'
    );

  }

});


/* =========================================================
   REPORTES
========================================================= */

app.get('/api/reportes', async (_req, res) => {

  try {

    const [historial, estadisticas] =
        await Promise.all([

          db.query(`
                    SELECT *
                    FROM vista_historial_aspirante
                    ORDER BY
                        ultima_postulacion
                        DESC NULLS LAST
                `),

          db.query(`
                    SELECT *
                    FROM vista_estadistica_postulaciones
                    ORDER BY
                        periodo_inicio
                        DESC
                `)

        ]);


    res.json({
      historial: historial.rows,
      estadisticas: estadisticas.rows
    });


  } catch (viewError) {

    console.warn(
        'Las vistas de reportes no pudieron consultarse:',
        viewError.message
    );


    try {

      const [historial, estadisticas] =
          await Promise.all([

            db.query(`
                        SELECT

                            a.id_aspirante,

                            a.tipo_documento,

                            a.numero_documento,

                            a.nombre_completo,

                            COUNT(
                                p.id_postulacion
                            )::int
                            AS total_postulaciones,

                            MAX(
                                p.fecha_postulacion
                            )
                            AS ultima_postulacion

                        FROM aspirante a

                        JOIN postulacion p
                            ON p.id_aspirante =
                               a.id_aspirante

                        GROUP BY

                            a.id_aspirante,

                            a.tipo_documento,

                            a.numero_documento,

                            a.nombre_completo

                        ORDER BY
                            ultima_postulacion
                            DESC NULLS LAST
                    `),

            db.query(`
                        SELECT

                            ROW_NUMBER()
                            OVER (
                                ORDER BY
                                DATE_TRUNC(
                                    'month',
                                    p.fecha_postulacion
                                ) DESC
                            )::int
                            AS periodo_id,

                            'MES'::varchar
                            AS tipo_periodo,

                            DATE_TRUNC(
                                'month',
                                p.fecha_postulacion
                            )::date
                            AS periodo_inicio,

                            (
                                DATE_TRUNC(
                                    'month',
                                    p.fecha_postulacion
                                )
                                +
                                INTERVAL
                                '1 month - 1 day'
                            )::date
                            AS periodo_fin,

                            COUNT(*)::int
                            AS total_postulaciones

                        FROM postulacion p

                        GROUP BY
                            DATE_TRUNC(
                                'month',
                                p.fecha_postulacion
                            )

                        ORDER BY
                            periodo_inicio DESC
                    `)

          ]);


      res.json({
        historial: historial.rows,
        estadisticas: estadisticas.rows
      });


    } catch (error) {

      errorResponse(
          res,
          error,
          'No fue posible cargar reportes y estadísticas.'
      );

    }

  }

});


/* =========================================================
   LOGIN
========================================================= */

app.post('/api/auth/login', async (req, res) => {

  const {
    correo,
    contrasena,
    rolSolicitado
  } = req.body;


  try {

    const identificador =
        String(correo || '').trim();


    const result = await db.query(`
            SELECT *
            FROM usuario

            WHERE
                (
                    LOWER(correo) =
                    LOWER($1)

                    OR

                    LOWER(nombre_completo) =
                    LOWER($1)
                )

                AND activo = true

            ORDER BY id_usuario DESC

            LIMIT 1
        `, [identificador]);


    if (!result.rowCount) {

      return res.status(401).json({
        error:
            'Credenciales incorrectas.'
      });

    }


    const usuario =
        result.rows[0];


    let passwordValida = false;


    /*
     * Permite contraseña directa para los datos
     * de prueba existentes y también bcrypt.
     */

    if (
        usuario.contrasena_hash ===
        String(contrasena)
    ) {

      passwordValida = true;

    } else {

      passwordValida =
          await bcrypt
              .compare(
                  String(contrasena),
                  String(
                      usuario.contrasena_hash || ''
                  )
              )
              .catch(() => false);

    }


    if (!passwordValida) {

      return res.status(401).json({
        error:
            'Credenciales incorrectas.'
      });

    }


    const rolTexto =
        String(usuario.rol || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                ''
            );


    let rolNormalizado;


    if (
        [
          'rrhh',
          'rh',
          'recursos humanos',
          'recursos_humanos',
          'recursos-humanos',
          'administrador',
          'admin'
        ].includes(rolTexto)
    ) {

      rolNormalizado =
          'RRHH';

    } else if (
        rolTexto === 'gerente' ||
        rolTexto === 'gerencia'
    ) {

      rolNormalizado =
          'Gerente';

    } else {

      rolNormalizado =
          usuario.rol;

    }


    if (
        !['RRHH', 'Gerente']
            .includes(rolNormalizado)
    ) {

      return res.status(403).json({
        error:
            'Este usuario no tiene acceso al área interna.'
      });

    }


    if (
        rolSolicitado &&
        String(rolSolicitado)
            .toLowerCase() !==
        String(rolNormalizado)
            .toLowerCase()
    ) {

      return res.status(403).json({
        error:
            'El usuario no pertenece al rol seleccionado.'
      });

    }


    usuario.rol =
        rolNormalizado;


    const token =
        crypto
            .randomBytes(32)
            .toString('hex');


    sessions.set(
        token,
        {
          id_usuario:
          usuario.id_usuario,

          rol:
          rolNormalizado
        }
    );


    res.setHeader(
        'Set-Cookie',
        `sid=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`
    );


    res.json({
      token,
      usuario
    });


  } catch (error) {

    errorResponse(
        res,
        error,
        'No fue posible iniciar sesión.'
    );

  }

});


/* =========================================================
   LOGOUT
========================================================= */

app.post(
    '/api/auth/logout',
    requireRoles('RRHH', 'Gerente'),
    (req, res) => {

      sessions.delete(
          getSessionToken(req)
      );

      res.setHeader(
          'Set-Cookie',
          'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
      );

      res.status(204).end();

    }
);


/* =========================================================
   MANEJO DE ERRORES
========================================================= */

app.use(
    (error, _req, res, _next) => {

      errorResponse(
          res,
          error,
          'Error interno del servidor.'
      );

    }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

if (require.main === module) {

  app.listen(
      PORT,
      () => {

        console.log(
            `SIDOVI funcionando en http://localhost:${PORT}`
        );

      }
  );

}


module.exports = app;