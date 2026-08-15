import { Fragment, useEffect, useState } from 'react';
import { fetchInvoices } from '../api';

function parseRecommendations(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(digits);
}

/**
 * Lists all previously analyzed invoices. Clicking a row expands it in place
 * to show the full stored AI analysis and recommendations.
 */
function HistoryView() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchInvoices()
      .then((data) => {
        if (isMounted) setInvoices(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) return <p className="status-message">Loading history...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (invoices.length === 0) return <p className="status-message">No invoices analyzed yet.</p>;

  return (
    <div className="history-view">
      <table className="history-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Period</th>
            <th>Consumption</th>
            <th>Total Cost</th>
            <th>Anomaly</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const isExpanded = expandedId === invoice.id;
            return (
              <Fragment key={invoice.id}>
                <tr
                  className="history-table__row"
                  onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                >
                  <td>{invoice.company || 'N/A'}</td>
                  <td>{invoice.period || 'N/A'}</td>
                  <td>{formatNumber(invoice.consumption_kwh)} kWh</td>
                  <td>{formatNumber(invoice.total_cost, 2)}</td>
                  <td>
                    {invoice.anomalies ? (
                      <span className="anomaly-badge">Yes</span>
                    ) : (
                      <span className="anomaly-badge anomaly-badge--none">No</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="history-table__detail-row">
                    <td colSpan={5}>
                      <div className="history-detail">
                        {invoice.anomalies && (
                          <div className="history-detail__section history-detail__section--anomaly">
                            <h3>Anomalies</h3>
                            <p>{invoice.anomalies}</p>
                          </div>
                        )}
                        <div className="history-detail__section">
                          <h3>AI Analysis</h3>
                          <p>{invoice.ai_analysis || 'No analysis available.'}</p>
                        </div>
                        <div className="history-detail__section">
                          <h3>Recommendations</h3>
                          <ul>
                            {parseRecommendations(invoice.recommendations).map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryView;
