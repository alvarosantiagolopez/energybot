import { useEffect, useState } from 'react';
import { fetchCrmContacts } from '../api';

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(digits);
}

function formatTimestamp(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

/**
 * Lists all CRM contacts and their sync status. Contacts are created/updated
 * automatically whenever an invoice is analyzed (see crmService.syncInvoiceToCRM).
 */
function CrmView() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchCrmContacts()
      .then((data) => {
        if (isMounted) setContacts(data);
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

  if (isLoading) {
    return (
      <div className="crm-view">
        <div className="page-header">
          <h1>CRM Sync</h1>
          <p>Contacts synced automatically from analyzed invoices.</p>
        </div>
        <p className="status-message">Loading contacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-view">
        <div className="page-header">
          <h1>CRM Sync</h1>
          <p>Contacts synced automatically from analyzed invoices.</p>
        </div>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="crm-view">
        <div className="page-header">
          <h1>CRM Sync</h1>
          <p>Contacts synced automatically from analyzed invoices.</p>
        </div>
        <div className="empty-state">
          <span className="empty-state__icon">🔗</span>
          <h2>No CRM contacts yet</h2>
          <p>Contacts appear here automatically once you analyze an invoice.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-view">
      <div className="page-header">
        <h1>CRM Sync</h1>
        <p>Contacts synced automatically from analyzed invoices.</p>
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Last Consumption</th>
            <th>Anomaly Status</th>
            <th>Sync Status</th>
            <th>Last Synced</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact, index) => (
            <tr
              key={contact.id}
              className={`history-table__row ${index % 2 === 1 ? 'history-table__row--alt' : ''}`}
            >
              <td>{contact.company_name}</td>
              <td>{formatNumber(contact.last_consumption_kwh)} kWh</td>
              <td>
                <span
                  className={`anomaly-dot ${contact.anomaly_status === 'alert' ? 'anomaly-dot--alert' : 'anomaly-dot--ok'}`}
                />
                {contact.anomaly_status === 'alert' ? 'Anomaly' : 'Normal'}
              </td>
              <td>{contact.last_sync_status}</td>
              <td>{formatTimestamp(contact.last_synced_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CrmView;
