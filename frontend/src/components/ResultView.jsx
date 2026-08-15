function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(digits);
}

function formatDiff(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const rounded = Number(value).toFixed(1);
  const sign = value > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

const RECOMMENDATION_ICONS = ['💡', '🔧', '📉', '⚡', '🔋'];

/**
 * Shows the extracted invoice data, historical comparison, anomalies,
 * AI analysis, and recommendations for a single processed invoice.
 */
function ResultView({ data, onUploadAnother }) {
  const { extracted, comparison, anomalies, analysis, recommendations } = data;

  const hasHistory = comparison && (comparison.avgConsumption !== null || comparison.avgCostPerKwh !== null);
  const consumptionDiff = formatDiff(comparison?.consumptionDiffPct);
  const costDiff = formatDiff(comparison?.costDiffPct);

  return (
    <div className="result-view">
      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-card__label">Company</span>
          <span className="metric-card__value metric-card__value--small">{extracted.companyName || 'N/A'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Billing Period</span>
          <span className="metric-card__value metric-card__value--small">
            {extracted.billingPeriod?.start} → {extracted.billingPeriod?.end}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Consumption</span>
          <span className="metric-card__value">{formatNumber(extracted.consumptionKwh)} kWh</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Total Cost</span>
          <span className="metric-card__value">
            {formatNumber(extracted.totalCost, 2)} {extracted.currency}
          </span>
        </div>
      </div>

      <section className="card">
        <h2>Contract Details</h2>
        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Cost per kWh</span>
            <span className="data-value">{formatNumber(extracted.costPerKwh, 4)}</span>
          </div>
          <div className="data-item">
            <span className="data-label">Contract Type</span>
            <span className="data-value">{extracted.contractType || 'Unknown'}</span>
          </div>
        </div>
      </section>

      {hasHistory && (
        <section className="card">
          <h2>Comparison with History</h2>
          <div className="data-grid">
            <div className="data-item">
              <span className="data-label">Consumption vs. average</span>
              <span className={`data-value ${comparison.consumptionDiffPct > 0 ? 'value--up' : 'value--down'}`}>
                {consumptionDiff ?? 'N/A'} ({formatNumber(comparison.avgConsumption)} kWh avg)
              </span>
            </div>
            <div className="data-item">
              <span className="data-label">Total cost vs. average</span>
              <span className={`data-value ${comparison.costDiffPct > 0 ? 'value--up' : 'value--down'}`}>
                {costDiff ?? 'N/A'} ({formatNumber(comparison.avgTotalCost, 2)} avg)
              </span>
            </div>
          </div>
        </section>
      )}

      {anomalies && (
        <section className="card card--anomaly">
          <h2>⚠ Anomalies Detected</h2>
          <p>{anomalies}</p>
        </section>
      )}

      {analysis && (
        <section className="card">
          <h2>AI Analysis</h2>
          <p className="analysis-text">{analysis}</p>
        </section>
      )}

      {recommendations && recommendations.length > 0 && (
        <section className="card">
          <h2>Recommendations</h2>
          <div className="recommendation-grid">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-card">
                <span className="recommendation-card__icon">
                  {RECOMMENDATION_ICONS[index % RECOMMENDATION_ICONS.length]}
                </span>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="upload-actions upload-actions--center">
        <button className="btn btn--primary" onClick={onUploadAnother}>
          Analyze Another Invoice
        </button>
      </div>
    </div>
  );
}

export default ResultView;
