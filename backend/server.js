import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import invoicesRoutes from './routes/invoices.js';
import pool from './db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const fastify = Fastify({ logger: true });

await fastify.register(cors);
await fastify.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

await fastify.register(invoicesRoutes);

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../frontend/dist');

  await fastify.register(fastifyStatic, {
    root: frontendDist,
  });

  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}

const port = process.env.PORT || 3000;

const gracefulShutdown = async () => {
  await fastify.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`✅ Server listening on port ${port}`);
} catch (err) {
  console.error('❌ Server startup failed:', err.message);
  fastify.log.error(err);
  await pool.end();
  process.exit(1);
}
