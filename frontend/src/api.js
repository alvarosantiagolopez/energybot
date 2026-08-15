const API_BASE_URL = 'http://localhost:3000';

/**
 * Uploads an invoice file to be extracted and analyzed.
 * @param {File} file
 * @returns {Promise<object>} { invoice, extracted, comparison, anomalies, analysis, recommendations }
 */
export async function extractInvoice(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/invoices/extract`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to process invoice');
  }
  return data;
}

/**
 * Fetches all previously analyzed invoices, newest first.
 * @returns {Promise<object[]>}
 */
export async function fetchInvoices() {
  const response = await fetch(`${API_BASE_URL}/api/invoices`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch invoices');
  }
  return data;
}
