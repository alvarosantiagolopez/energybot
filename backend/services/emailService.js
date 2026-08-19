// Sends automatic email alerts when the analysis agent detects an invoice anomaly.
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function buildAlertHtml(invoiceData, analysisResult) {
  const { companyName, billingPeriod, consumptionKwh } = invoiceData;
  const { anomalies, recommendations, comparison } = analysisResult;
  const averageConsumption = comparison?.avgConsumption;
  const percentDifference = comparison?.consumptionDiffPct;

  const topRecommendation = Array.isArray(recommendations) && recommendations.length > 0
    ? recommendations[0]
    : 'No specific recommendation available.';

  const period = billingPeriod?.start && billingPeriod?.end
    ? `${billingPeriod.start} to ${billingPeriod.end}`
    : 'N/A';

  const diffLabel = typeof percentDifference === 'number'
    ? `${percentDifference > 0 ? '+' : ''}${percentDifference.toFixed(1)}%`
    : 'N/A';

  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #b91c1c;">⚠️ Energy Anomaly Detected</h2>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Billing period:</strong> ${period}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">Current consumption</td>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">${consumptionKwh} kWh</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">Average consumption</td>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">${typeof averageConsumption === 'number' ? averageConsumption.toFixed(1) : 'N/A'} kWh</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">Difference vs average</td>
          <td style="padding: 8px; border: 1px solid #e5e5e5;">${diffLabel}</td>
        </tr>
      </table>
      <p><strong>Anomaly:</strong> ${anomalies}</p>
      <p><strong>Top recommendation:</strong> ${topRecommendation}</p>
      <p style="margin-top: 24px;">
        <a href="#" style="color: #2563eb;">View full analysis in EnergyBot</a>
      </p>
    </div>
  `;
}

export async function sendAnomalyAlert(invoiceData, analysisResult) {
  if (!analysisResult?.anomalies) {
    return { sent: false, reason: 'no anomalies' };
  }

  if (!resend || !process.env.ALERT_EMAIL) {
    console.warn('[emailService] Skipping anomaly alert: RESEND_API_KEY or ALERT_EMAIL not configured');
    return { sent: false, reason: 'email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'EnergyBot <onboarding@resend.dev>',
      to: process.env.ALERT_EMAIL,
      subject: `⚠️ Energy Anomaly Detected - ${invoiceData.companyName}`,
      html: buildAlertHtml(invoiceData, analysisResult),
    });

    if (error) {
      console.warn('[emailService] Failed to send anomaly alert:', error.message);
      return { sent: false, reason: error.message };
    }

    return { sent: true, emailId: data.id };
  } catch (err) {
    console.warn('[emailService] Failed to send anomaly alert:', err.message);
    return { sent: false, reason: err.message };
  }
}
