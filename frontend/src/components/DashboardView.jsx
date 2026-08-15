import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchInvoices } from '../api';

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">
        {formatNumber(payload[0].value, unit === '€' ? 2 : 0)} {unit}
      </p>
    </div>
  );
}

/**
 * Home view: aggregate KPIs and consumption/cost trends across all
 * analyzed invoices, sourced from GET /api/invoices (same data as History).
 */
function DashboardView() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const stats = useMemo(() => {
    if (invoices.length === 0) {
      return { count: 0, totalSpend: 0, avgConsumption: 0, latestAnomaly: null };
    }
    const totalSpend = invoices.reduce((sum, inv) => sum + (Number(inv.total_cost) || 0), 0);
    const totalConsumption = invoices.reduce(
      (sum, inv) => sum + (Number(inv.consumption_kwh) || 0),
      0
    );
    const latestAnomaly = invoices.find((inv) => inv.anomalies) || null;
    return {
      count: invoices.length,
      totalSpend,
      avgConsumption: totalConsumption / invoices.length,
      latestAnomaly,
    };
  }, [invoices]);

  const chartData = useMemo(() => {
    return [...invoices]
      .reverse()
      .map((inv, index) => ({
        name: inv.period || `#${index + 1}`,
        consumption: Number(inv.consumption_kwh) || 0,
        cost: Number(inv.total_cost) || 0,
      }));
  }, [invoices]);

  if (isLoading) return <p className="status-message">Loading dashboard...</p>;
  if (error) return <p className="error-message">{error}</p>;

  if (invoices.length === 0) {
    return (
      <div className="dashboard-view">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>An overview of all the energy invoices you've analyzed.</p>
        </div>
        <div className="empty-state">
          <span className="empty-state__icon">📊</span>
          <h2>No invoices analyzed yet</h2>
          <p>Upload your first energy invoice to start seeing insights here.</p>
          <Link to="/upload" className="btn btn--primary">
            Upload an Invoice
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>An overview of all the energy invoices you've analyzed.</p>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-card__label">Invoices Analyzed</span>
          <span className="metric-card__value">{stats.count}</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Total Spend</span>
          <span className="metric-card__value">{formatNumber(stats.totalSpend, 2)} €</span>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Average Consumption</span>
          <span className="metric-card__value">{formatNumber(stats.avgConsumption)} kWh</span>
        </div>
        <div className={`metric-card ${stats.latestAnomaly ? 'metric-card--anomaly' : 'metric-card--ok'}`}>
          <span className="metric-card__label">Latest Anomaly</span>
          <span className="metric-card__value metric-card__value--small">
            {stats.latestAnomaly ? stats.latestAnomaly.period || 'Detected' : 'None detected'}
          </span>
        </div>
      </div>

      <div className="chart-grid">
        <section className="card">
          <h2>Consumption Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip unit="kWh" />} />
              <Line
                type="monotone"
                dataKey="consumption"
                name="Consumption"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h2>Cost Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<ChartTooltip unit="€" />} />
              <Line
                type="monotone"
                dataKey="cost"
                name="Cost"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {stats.latestAnomaly && (
        <section className="card card--anomaly">
          <h2>⚠ Latest Anomaly</h2>
          <p>
            <strong>{stats.latestAnomaly.company || 'Unknown company'}</strong>
            {stats.latestAnomaly.period ? ` — ${stats.latestAnomaly.period}` : ''}
          </p>
          <p>{stats.latestAnomaly.anomalies}</p>
        </section>
      )}
    </div>
  );
}

export default DashboardView;
