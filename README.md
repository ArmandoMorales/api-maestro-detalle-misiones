# API Maestro-Detalle con Catálogo y Control de Estado

Reto de Desarrollo Web – UMG
**Estudiante:** Armando Cecilio Morales Sagastume · **Carnet:** 1890-23-16029

API REST (Node.js + Express + SQL Server) que recibe en un solo `POST` un JSON maestro-detalle:
el **maestro** es el estudiante y el **detalle** son sus misiones con estado `true/false`.
Incluye un frontend con un tablero del avance de cada estudiante.

- **Frontend:** https://armandomorales.github.io/api-maestro-detalle-misiones/
- **API:** https://api-maestro-detalle-misiones.vercel.app

El frontend se publica en GitHub Pages (workflow en `.github/workflows/pages.yml`) y el backend en Vercel
(`backend/vercel.json`); las credenciales de la BD están como variables de entorno en Vercel, no en el repositorio.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/registro` | Inserta o actualiza el estudiante y sus misiones |
| `GET` | `/api/misiones` | Catálogo de misiones |
| `GET` | `/api/estudiantes` | Estudiantes con sus misiones y resumen de avance (`?carnet=` opcional) |

### `POST /api/registro`

```json
{
  "maestro": {
    "carnet": "1890-23-16029",
    "nombre": "Armando Cecilio Morales Sagastume",
    "correo": "amoraless32@miumg.edu.gt"
  },
  "detalle": [
    { "misionId": 1, "estado": true },
    { "misionId": 2, "estado": false }
  ]
}
```

Lógica (todo dentro de una **transacción**; si algo falla se hace `ROLLBACK`):

1. Valida la estructura del JSON.
2. Valida que cada `misionId` exista en `Misiones`; si no, devuelve error de referencia.
3. Si el carnet no existe inserta el estudiante; si existe actualiza nombre y correo.
4. Por cada misión: si no está en `EstudianteMisiones` la inserta; si ya está actualiza `Estado`.

Respuestas:

| Código | Caso |
|---|---|
| `201` | Estudiante nuevo registrado |
| `200` | Estudiante existente actualizado |
| `400` | JSON mal formado o campos inválidos (`VALIDACION`, `JSON_MAL_FORMADO`) |
| `409` | El correo pertenece a otro carnet (`CONFLICTO`) |
| `422` | Misión inexistente en el catálogo (`REFERENCIA`) |

Ejemplo de error de referencia:

```json
{
  "ok": false,
  "error": "REFERENCIA",
  "mensaje": "Una o más misiones no existen en el catálogo.",
  "misionesInexistentes": [99]
}
```

## Ejecutar en local

```bash
cd backend
cp .env.example .env   # completar credenciales de la BD
npm install
npm start              # http://localhost:3000
```

El frontend es estático: abre `frontend/` con cualquier servidor (por ejemplo, Live Server en `http://localhost:5500`).
`frontend/config.js` usa `localhost:3000` en local y la URL de Vercel cuando está publicado.

## Estructura

```
backend/    API Express (server.js, db.js, routes/)
frontend/   Tablero HTML/CSS/JS (GitHub Pages)
sql/        Esquema de referencia de las tablas
```
