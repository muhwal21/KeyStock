import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'Endpoint API tidak ditemukan.' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

export { app };
