CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255),
  period VARCHAR(50),
  company VARCHAR(255),
  consumption_kwh DECIMAL,
  total_cost DECIMAL,
  cost_per_kwh DECIMAL,
  contract_type VARCHAR(100),
  anomalies TEXT,
  ai_analysis TEXT,
  recommendations TEXT,
  raw_extracted_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  last_invoice_id INTEGER REFERENCES invoices(id),
  last_consumption_kwh DECIMAL,
  last_sync_status VARCHAR(50) DEFAULT 'pending',
  anomaly_status VARCHAR(50) DEFAULT 'normal',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
