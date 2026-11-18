import { config } from './config.js';
import { app } from './app.js';
import { prisma } from './prisma.js';

const server = app.listen(config.port, () => {
  console.log(`✔ API démarrée sur http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
