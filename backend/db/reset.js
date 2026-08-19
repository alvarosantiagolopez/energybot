import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pool from './connection.js';
import { syncInvoiceToCRM } from '../services/crmService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SEED_DATA = [
  {
    filename: 'endesa_ene2025.pdf',
    period: '2025-01-01 - 2025-01-31',
    company: 'Endesa Energía S.A.',
    consumption_kwh: 65.3,
    total_cost: 47.28,
    cost_per_kwh: 0.724,
    contract_type: 'Residential',
    ai_analysis: 'El consumo de este mes ha sido moderado, en línea con la media esperada para invierno. La temperatura fue más cálida que en diciembre, lo que se refleja en un ligero descenso del consumo. El coste total es razonable. Se recomienda mantener los hábitos actuales de uso.',
    recommendations: JSON.stringify([
      'Considera instalar un termostato programable para optimizar la calefacción nocturna',
      'Desconecta electrodomésticos en modo standby para ahorrar un 5-10% en consumo',
      'Revisa el aislamiento de puertas y ventanas para evitar pérdidas de calor'
    ]),
    raw_extracted_data: {
      companyName: 'Endesa Energía S.A.',
      billingPeriod: { start: '2025-01-01', end: '2025-01-31' },
      consumptionKwh: 65.3,
      totalCost: 47.28,
      costPerKwh: 0.724,
      currency: 'EUR',
      contractType: 'Residential',
      invoiceNumber: 'END-2025-001234',
      dueDate: '2025-02-10',
    },
  },
  {
    filename: 'endesa_eneUNI2025.pdf',
    period: '2025-01-01 - 2025-01-31',
    company: 'Endesa Energía, S.A. Unipersonal',
    consumption_kwh: 165.3,
    total_cost: 90.28,
    cost_per_kwh: 0.546,
    contract_type: 'Residential',
    ai_analysis: 'El consumo de este mes ha sido moderado, en línea con la media esperada para invierno. La temperatura fue más cálida que en diciembre, lo que se refleja en un ligero descenso del consumo. El coste total es razonable. Se recomienda mantener los hábitos actuales de uso.',
    recommendations: JSON.stringify([
      'Considera instalar un termostato programable para optimizar la calefacción nocturna',
      'Desconecta electrodomésticos en modo standby para ahorrar un 5-10% en consumo',
      'Revisa el aislamiento de puertas y ventanas para evitar pérdidas de calor'
    ]),
    raw_extracted_data: {
      companyName: 'Endesa Energía, S.A. Unipersonal',
      billingPeriod: { start: '2025-01-01', end: '2025-01-31' },
      consumptionKwh: 165.3,
      totalCost: 90.28,
      costPerKwh: 0.546,
      currency: 'EUR',
      contractType: 'Residential',
      invoiceNumber: 'END-2025-001234',
      dueDate: '2025-02-10',
    },
  },
  {
    filename: 'endesa_feb2025.pdf',
    period: '2025-02-01 - 2025-02-28',
    company: 'Endesa Energía, S.A.',
    consumption_kwh: 72.1,
    total_cost: 52.15,
    cost_per_kwh: 0.723,
    contract_type: 'Residential',
    ai_analysis: 'El consumo en febrero ha aumentado un 10% respecto a enero debido a las temperaturas más bajas. Este incremento es normal y previsible. El coste por kWh se mantiene estable. Se aconseja mantener el seguimiento del consumo durante los próximos meses.',
    recommendations: JSON.stringify([
      'Utiliza la calefacción solo en las horas necesarias (8h-22h)',
      'Reduce la temperatura interior 1-2°C durante la noche',
      'Asegúrate de que las ventanas cierren completamente'
    ]),
    raw_extracted_data: {
      companyName: 'Endesa Energía, S.A.',
      billingPeriod: { start: '2025-02-01', end: '2025-02-28' },
      consumptionKwh: 72.1,
      totalCost: 52.15,
      costPerKwh: 0.723,
      currency: 'EUR',
      contractType: 'Residential',
      invoiceNumber: 'END-2025-001235',
      dueDate: '2025-03-10',
    },
  },
  {
    filename: 'endesa_mar2025.pdf',
    period: '2025-03-01 - 2025-03-31',
    company: 'Endesa Energía, S.A',
    consumption_kwh: 58.7,
    total_cost: 42.48,
    cost_per_kwh: 0.724,
    contract_type: 'Residential',
    ai_analysis: 'La tendencia es muy positiva. El consumo ha disminuido un 18.5% respecto a febrero, reflejo de la mejora en las condiciones climáticas de primavera. El coste total también ha bajado proporcionalmente. Se recomienda continuar con las prácticas actuales de eficiencia.',
    recommendations: JSON.stringify([
      'Aumenta gradualmente el uso de calefacción según las temperaturas',
      'Aprovecha las horas de luz natural para reducir el uso de iluminación artificial',
      'Considera cambiar a una tarifa con discriminación horaria si la tienes disponible'
    ]),
    raw_extracted_data: {
      companyName: 'Endesa Energía, S.A.',
      billingPeriod: { start: '2025-03-01', end: '2025-03-31' },
      consumptionKwh: 58.7,
      totalCost: 42.48,
      costPerKwh: 0.724,
      currency: 'EUR',
      contractType: 'Residential',
      invoiceNumber: 'END-2025-001236',
      dueDate: '2025-04-10',
    },
  },
  {
    filename: 'iberdrola_feb2025.pdf',
    period: '2025-02-01 - 2025-02-28',
    company: 'Iberdrola Clientes S.A.',
    consumption_kwh: 124.5,
    total_cost: 89.67,
    cost_per_kwh: 0.72,
    contract_type: 'Small Business',
    anomalies: '⚠ Anomalía detectada: El consumo actual (124.5 kWh) es un 89.2% superior a la media histórica (65.8 kWh). El coste total actual (89.67 EUR) es un 78.4% superior a la media (50.32 EUR).',
    ai_analysis: 'Se ha detectado una anomalía significativa en el consumo de este período. El consumo es casi un 90% superior a lo esperado, lo que sugiere un problema operacional o un cambio importante en el uso de la instalación. Se recomienda investigar inmediatamente la causa de este incremento anómalo.',
    recommendations: JSON.stringify([
      'Revisa el funcionamiento de todos los equipos de climatización',
      'Busca fugas de aire comprimido o refrigeración',
      'Revisa si hay equipos nuevos o consumidores adicionales funcionando'
    ]),
    raw_extracted_data: {
      companyName: 'Iberdrola Clientes S.A.',
      billingPeriod: { start: '2025-02-01', end: '2025-02-28' },
      consumptionKwh: 124.5,
      totalCost: 89.67,
      costPerKwh: 0.72,
      currency: 'EUR',
      contractType: 'Small Business',
      invoiceNumber: 'IBD-2025-005678',
      dueDate: '2025-03-15',
    },
  },
  {
    filename: 'iberdrola_apr2025.pdf',
    period: '2025-04-01 - 2025-04-30',
    company: 'Iberdrola Clientes S.A.',
    consumption_kwh: 68.2,
    total_cost: 49.1,
    cost_per_kwh: 0.72,
    contract_type: 'Small Business',
    ai_analysis: 'El consumo ha normalizado considerablemente respecto al mes anterior, volviendo a niveles esperados. Esto sugiere que la anomalía de febrero fue puntual y ha sido resuelta. El coste se mantiene en línea con los patrones históricos. Continúa monitoreando para asegurar estabilidad.',
    recommendations: JSON.stringify([
      'Mantén el seguimiento regular del consumo para detectar cambios rápidamente',
      'Implementa un sistema de monitorización energética en tiempo real',
      'Revisa la tarifa contratada para optimizar el coste'
    ]),
    raw_extracted_data: {
      companyName: 'Iberdrola Clientes S.A.',
      billingPeriod: { start: '2025-04-01', end: '2025-04-30' },
      consumptionKwh: 68.2,
      totalCost: 49.1,
      costPerKwh: 0.72,
      currency: 'EUR',
      contractType: 'Small Business',
      invoiceNumber: 'IBD-2025-005679',
      dueDate: '2025-05-15',
    },
  },
  {
    filename: 'naturgy_mar2025.pdf',
    period: '2025-03-01 - 2025-03-31',
    company: 'Naturgy Iberia S.A.',
    consumption_kwh: 45.2,
    total_cost: 35.64,
    cost_per_kwh: 0.788,
    contract_type: 'Residential',
    ai_analysis: 'Consumo bajo y eficiente. Esta instalación mantiene un perfil de consumo muy optimizado, con tasas por debajo de la media del sector. El coste por kWh es ligeramente superior, posiblemente debido a las características del contrato. Se recomienda mantener estas prácticas.',
    recommendations: JSON.stringify([
      'Mantén los hábitos actuales que evidentemente son muy eficientes',
      'Considera revisar si existe una tarifa más competitiva disponible',
      'Continúa monitoreando el consumo regularmente'
    ]),
    raw_extracted_data: {
      companyName: 'Naturgy Iberia S.A.',
      billingPeriod: { start: '2025-03-01', end: '2025-03-31' },
      consumptionKwh: 45.2,
      totalCost: 35.64,
      costPerKwh: 0.788,
      currency: 'EUR',
      contractType: 'Residential',
      invoiceNumber: 'NAT-2025-009876',
      dueDate: '2025-04-10',
    },
  },
];

async function resetDatabase() {
  try {
    console.log('🧹 Truncating invoices and crm_contacts...');
    await pool.query('TRUNCATE TABLE invoices, crm_contacts RESTART IDENTITY CASCADE');
    console.log('✓ Tables cleared\n');

    console.log('📥 Seeding database with realistic demo data...\n');

    for (const invoiceData of SEED_DATA) {
      const { rows } = await pool.query(
        `INSERT INTO invoices
          (filename, period, company, consumption_kwh, total_cost, cost_per_kwh, contract_type, anomalies, ai_analysis, recommendations, raw_extracted_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, company, period`,
        [
          invoiceData.filename,
          invoiceData.period,
          invoiceData.company,
          invoiceData.consumption_kwh,
          invoiceData.total_cost,
          invoiceData.cost_per_kwh,
          invoiceData.contract_type,
          invoiceData.anomalies || null,
          invoiceData.ai_analysis,
          invoiceData.recommendations,
          JSON.stringify(invoiceData.raw_extracted_data),
        ]
      );

      const invoice = rows[0];
      console.log(`✓ Inserted invoice: ${invoice.company} (${invoice.period})`);

      const extractedData = invoiceData.raw_extracted_data;
      const analysisResult = {
        anomalies: invoiceData.anomalies || null,
      };

      try {
        await syncInvoiceToCRM(extractedData, analysisResult, invoice.id);
        console.log(`  → Synced to CRM contact`);
      } catch (crmErr) {
        console.warn(`  ⚠ CRM sync failed (non-fatal): ${crmErr.message}`);
      }
    }

    console.log(`\n✅ Reset complete: ${SEED_DATA.length} invoices seeded and synced to CRM`);

    await pool.end();
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

resetDatabase();
