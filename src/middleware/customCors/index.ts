import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',

];

const customCors = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps/curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    callback(new Error(msg), false);
  },
  credentials: true, // Allow cookies/HTTP-only headers
  optionsSuccessStatus: 204 // Some legacy browsers need this
});

export default customCors