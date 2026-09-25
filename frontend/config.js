// URL base del backend. En local usa localhost; publicado usa la URL de Vercel.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:3000'
  : 'https://api-maestro-detalle-misiones.vercel.app';
