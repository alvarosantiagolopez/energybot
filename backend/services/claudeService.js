import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    companyName: { type: 'string', description: 'Name of the energy company issuing the invoice' },
    billingPeriod: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Billing period start date, ISO 8601 (YYYY-MM-DD)' },
        end: { type: 'string', description: 'Billing period end date, ISO 8601 (YYYY-MM-DD)' },
      },
      required: ['start', 'end'],
      additionalProperties: false,
    },
    consumptionKwh: { type: 'number', description: 'Total energy consumption in kWh for the billing period' },
    totalCost: { type: 'number', description: 'Total invoice amount in the invoice currency' },
    currency: { type: 'string', description: 'Currency code of the total cost, e.g. EUR, USD' },
    costPerKwh: { type: 'number', description: 'Cost per kWh, derived or explicitly stated on the invoice' },
    contractType: { type: 'string', description: 'Type of contract, e.g. fixed, variable, indexed' },
  },
  required: [
    'companyName',
    'billingPeriod',
    'consumptionKwh',
    'totalCost',
    'currency',
    'costPerKwh',
    'contractType',
  ],
  additionalProperties: false,
};

const EXTRACTION_PROMPT = `You are an assistant that extracts structured data from energy invoices (electricity or gas bills).

Read the attached invoice image or document and extract the following fields:
- Company name (the energy provider issuing the invoice)
- Billing period (start and end dates)
- Total energy consumption in kWh
- Total cost of the invoice
- Currency of the total cost
- Cost per kWh (use the stated value if present, otherwise compute totalCost / consumptionKwh)
- Contract type (e.g. fixed, variable, indexed, time-of-use) if stated or inferable; otherwise use "unknown"

If a field is genuinely not present anywhere in the document and cannot be derived, use null for that field instead of guessing.`;

/**
 * Extracts structured data from an energy invoice using the Claude API.
 * @param {string} fileBase64 - Base64-encoded file content (no data URL prefix, no newlines).
 * @param {string} mediaType - MIME type of the file ('application/pdf', 'image/jpeg', or 'image/png').
 * @returns {Promise<object>} Parsed invoice data matching EXTRACTION_SCHEMA.
 */
export async function extractInvoiceData(fileBase64, mediaType = 'application/pdf') {
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    throw new Error('extractInvoiceData: fileBase64 must be a non-empty string');
  }

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!ALLOWED_TYPES.includes(mediaType)) {
    throw new Error(`extractInvoiceData: mediaType must be one of ${ALLOWED_TYPES.join(', ')}`);
  }

  // Remove any newlines that may have been included in the base64 string
  const cleanBase64 = fileBase64.replace(/\n/g, '');

  let response;
  try {
    const claudeClient = getClient();

    const contentBlocks = [];
    if (mediaType === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: cleanBase64,
        },
      });
    } else {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: cleanBase64,
        },
      });
    }
    contentBlocks.push({ type: 'text', text: EXTRACTION_PROMPT });

    response = await claudeClient.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: {
        format: {
          type: 'json_schema',
          schema: EXTRACTION_SCHEMA,
        },
      },
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Claude API error (${err.status}): ${err.message}`);
    }
    throw new Error(`Claude API request failed: ${err.message}`);
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to process this invoice');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Claude response did not contain the expected extracted data');
  }

  let data;
  try {
    data = JSON.parse(textBlock.text);
  } catch {
    throw new Error('Failed to parse extracted invoice data as JSON');
  }

  const missingRequired = EXTRACTION_SCHEMA.required.filter((field) => !(field in data));
  if (missingRequired.length > 0) {
    throw new Error(`Extracted data is missing required fields: ${missingRequired.join(', ')}`);
  }

  return data;
}
