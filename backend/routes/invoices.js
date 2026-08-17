import { extractInvoiceData } from '../services/claudeService.js';
import { analyzeInvoice, saveInvoice } from '../services/analysisService.js';
import { syncInvoiceToCRM } from '../services/crmService.js';
import pool from '../db/connection.js';

export default async function invoicesRoutes(fastify) {
  fastify.post('/api/invoices/extract', async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ error: 'No file was uploaded' });
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return reply.code(400).send({ error: 'Uploaded file must be a PDF, JPEG, or PNG image' });
    }

    const buffer = await file.toBuffer();
    const fileBase64 = buffer.toString('base64').replace(/\n/g, '');

    try {
      const extractedData = await extractInvoiceData(fileBase64, file.mimetype);
      extractedData.filename = file.filename;

      const analysisResult = await analyzeInvoice(extractedData);
      const savedInvoice = await saveInvoice(extractedData, analysisResult);
      const crmSync = await syncInvoiceToCRM(extractedData, analysisResult, savedInvoice.id);

      return reply.send({
        invoice: savedInvoice,
        extracted: extractedData,
        comparison: analysisResult.comparison,
        anomalies: analysisResult.anomalies,
        analysis: analysisResult.analysis,
        recommendations: analysisResult.recommendations,
        crmSync: crmSync ? {
          id: crmSync.id,
          company_name: crmSync.company_name,
          contact_email: crmSync.contact_email,
          last_invoice_id: crmSync.last_invoice_id,
          last_consumption_kwh: crmSync.last_consumption_kwh ? parseFloat(crmSync.last_consumption_kwh) : null,
          last_sync_status: crmSync.last_sync_status,
          anomaly_status: crmSync.anomaly_status,
          last_synced_at: crmSync.last_synced_at ? crmSync.last_synced_at.toISOString() : null,
          created_at: crmSync.created_at ? crmSync.created_at.toISOString() : null,
        } : null,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: err.message || 'Failed to extract invoice data' });
    }
  });

  fastify.get('/api/invoices', async (request, reply) => {
    try {
      const { rows } = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
      return reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch invoices' });
    }
  });
}
