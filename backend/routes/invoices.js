import { extractInvoiceData } from '../services/claudeService.js';

export default async function invoicesRoutes(fastify) {
  fastify.post('/api/invoices/extract', async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ error: 'No PDF file was uploaded' });
    }

    if (file.mimetype !== 'application/pdf') {
      return reply.code(400).send({ error: 'Uploaded file must be a PDF' });
    }

    const buffer = await file.toBuffer();
    const pdfBase64 = buffer.toString('base64');

    try {
      const data = await extractInvoiceData(pdfBase64);
      return reply.send(data);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: err.message || 'Failed to extract invoice data' });
    }
  });
}
