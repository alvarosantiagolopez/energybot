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
