import { app, ensurePersistence, sessionStore } from './app.js';
import { config } from './config.js';
import { sequelize } from './models/index.js';

try {
  await ensurePersistence();
  const server = app.listen(config.port, () => {
    console.log(`KeyStock API listening on port ${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await sessionStore.close();
      await sequelize.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Application startup failed:', error.message);
  process.exitCode = 1;
}
