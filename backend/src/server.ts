import { app } from './app.js';
import { env } from './config/env.js';
import { db } from './config/db.js';
await db.$connect();
const server = app.listen(env.PORT, '0.0.0.0', () =>
  console.log(`Pharmacy API: http://localhost:${env.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
