import pool from '../db/connection.js';

/**
 * Simulates a CRM sync (in place of a real HubSpot/Salesforce API call — see
 * docs/decisions/006-simulated-crm-integration.md). Finds the contact by
 * company name or creates one, then updates it with the latest invoice data.
 * @param {object} extractedData - Structured invoice data from claudeService.extractInvoiceData()
 * @param {object} analysisResult - Result of analysisService.analyzeInvoice()
 * @param {number} invoiceId - id of the invoice row just saved
 * @returns {Promise<object>} The synced crm_contacts row.
 */
export async function syncInvoiceToCRM(extractedData, analysisResult, invoiceId) {
  const companyName = extractedData.companyName || 'Unknown';
  const anomalyStatus = analysisResult.anomalies ? 'alert' : 'normal';

  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM crm_contacts WHERE company_name = $1',
      [companyName]
    );

    if (existing.length > 0) {
      const { rows } = await pool.query(
        `UPDATE crm_contacts
           SET last_invoice_id = $1,
               last_consumption_kwh = $2,
               anomaly_status = $3,
               last_sync_status = 'synced',
               last_synced_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [invoiceId, extractedData.consumptionKwh, anomalyStatus, existing[0].id]
      );
      return rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO crm_contacts
           (company_name, last_invoice_id, last_consumption_kwh, anomaly_status, last_sync_status, last_synced_at)
         VALUES ($1, $2, $3, $4, 'synced', NOW())
         RETURNING *`,
        [companyName, invoiceId, extractedData.consumptionKwh, anomalyStatus]
      );
      return rows[0];
    }
  } catch (err) {
    throw new Error(`CRM sync failed for company "${companyName}": ${err.message}`);
  }
}

/**
 * @returns {Promise<object[]>} All CRM contacts with their sync status, newest sync first.
 */
export async function getAllContacts() {
  const { rows } = await pool.query('SELECT * FROM crm_contacts ORDER BY last_synced_at DESC NULLS LAST');
  return rows.map(row => ({
    ...row,
    last_consumption_kwh: row.last_consumption_kwh ? parseFloat(row.last_consumption_kwh) : null,
    last_synced_at: row.last_synced_at ? row.last_synced_at.toISOString() : null,
    created_at: row.created_at ? row.created_at.toISOString() : null,
  }));
}
