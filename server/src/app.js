import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config, isProduction } from './config.js';
import { sequelize } from './models/index.js';
import apiRoutes from './routes/apiRoutes.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
let persistenceReady;

function ensurePersistence() {
  if (!persistenceReady) {
    persistenceReady = sequelize.authenticate().catch((error) => {
      persistenceReady = undefined;
      throw error;
    });
  }
  return persistenceReady;
}

app.use(async (req, res, next) => {
  try {
    await ensurePersistence();
    next();
  } catch (error) {
    next(error);
  }
});

if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  // Content Security Policy: scripts may only come from this origin, so an injected
  // <script> or inline event handler would not run even if markup slipped through.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', csrfProtection, apiRoutes);

if (isProduction) {
  const currentFile = fileURLToPath(import.meta.url);
  const clientDist = path.resolve(path.dirname(currentFile), '../../client/dist');
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export { app, ensurePersistence };
