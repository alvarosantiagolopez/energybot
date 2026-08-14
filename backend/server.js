import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import invoicesRoutes from './routes/invoices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const fastify = Fastify({ logger: true });

await fastify.register(cors);
await fastify.register(multipart);

fastify.get('/health', async () => {
  return { status: 'ok' };
});

await fastify.register(invoicesRoutes);

const port = process.env.PORT || 3000;

try {
  await fastify.listen({ port });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
