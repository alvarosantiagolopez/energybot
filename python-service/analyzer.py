"""Statistical analysis of energy consumption trends across a series of invoices."""

from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats

SUMMER_MONTHS = {6, 7, 8}
WINTER_MONTHS = {12, 1, 2}
SEASONALITY_THRESHOLD_PCT = 20
TREND_STABLE_THRESHOLD_PCT = 5


def _parse_period_date(invoice):
    """Extracts a representative date from an invoice's billing period for ordering/month grouping."""
    period = invoice.get("period") or invoice.get("billingPeriod") or {}
    if isinstance(period, dict):
        raw = period.get("start") or period.get("end")
    else:
        raw = str(period).split(" - ")[0] if period else None

    if not raw:
        raw = invoice.get("created_at") or invoice.get("createdAt")

    if not raw:
        return None

    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(raw)[: len(fmt) + 4], fmt)
        except ValueError:
            continue

    try:
        return pd.to_datetime(raw).to_pydatetime()
    except (ValueError, TypeError):
        return None


def _build_dataframe(invoices):
    records = []
    for inv in invoices:
        date = _parse_period_date(inv)
        consumption = inv.get("consumption_kwh") or inv.get("consumptionKwh")
        cost = inv.get("total_cost") or inv.get("totalCost")
        if date is None or consumption is None:
            continue
        records.append(
            {
                "date": date,
                "month": date.month,
                "consumption_kwh": float(consumption),
                "total_cost": float(cost) if cost is not None else None,
            }
        )

    df = pd.DataFrame.from_records(records)
    if not df.empty:
        df = df.sort_values("date").reset_index(drop=True)
    return df


def _linear_trend(values):
    """Fits a linear regression over invoice index vs. value, returns (direction, pct_change)."""
    x = np.arange(len(values))
    slope, intercept, *_ = stats.linregress(x, values)

    start_value = intercept
    end_value = intercept + slope * (len(values) - 1)

    if start_value == 0:
        pct_change = 0.0
    else:
        pct_change = ((end_value - start_value) / abs(start_value)) * 100

    if abs(pct_change) < TREND_STABLE_THRESHOLD_PCT:
        direction = "stable"
    elif pct_change > 0:
        direction = "increasing"
    else:
        direction = "decreasing"

    return direction, round(float(pct_change), 2)


def _detect_seasonality(df):
    summer = df[df["month"].isin(SUMMER_MONTHS)]["consumption_kwh"]
    winter = df[df["month"].isin(WINTER_MONTHS)]["consumption_kwh"]

    if summer.empty or winter.empty:
        return False

    summer_avg = summer.mean()
    winter_avg = winter.mean()
    baseline = winter_avg if winter_avg != 0 else summer_avg
    if baseline == 0:
        return False

    diff_pct = abs(summer_avg - winter_avg) / abs(baseline) * 100
    return bool(diff_pct > SEASONALITY_THRESHOLD_PCT)


MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def calculate_trends(invoices):
    """
    Computes consumption/cost trends over a list of invoice dicts.

    Each invoice is expected to provide at least `consumption_kwh` (or
    `consumptionKwh`) and a period/date field; `total_cost`/`totalCost` is
    optional but needed for cost-based fields.

    Returns a dict with monthly_avg_consumption, monthly_avg_cost,
    trend_direction, trend_percentage, seasonality_detected, peak_month,
    and savings_potential_eur. Returns a "insufficient_data" flag if fewer
    than 2 usable invoices are provided.
    """
    df = _build_dataframe(invoices)

    if len(df) < 2:
        return {
            "monthly_avg_consumption": None,
            "monthly_avg_cost": None,
            "trend_direction": "stable",
            "trend_percentage": 0.0,
            "seasonality_detected": False,
            "peak_month": None,
            "savings_potential_eur": None,
            "insufficient_data": True,
        }

    monthly_avg_consumption = round(float(df["consumption_kwh"].mean()), 2)

    cost_series = df["total_cost"].dropna()
    monthly_avg_cost = round(float(cost_series.mean()), 2) if not cost_series.empty else None

    trend_direction, trend_percentage = _linear_trend(df["consumption_kwh"].to_numpy())

    seasonality_detected = _detect_seasonality(df)

    peak_row = df.loc[df["consumption_kwh"].idxmax()]
    peak_month = MONTH_NAMES[int(peak_row["month"]) - 1]

    savings_potential_eur = None
    if monthly_avg_cost is not None and monthly_avg_consumption > 0:
        avg_cost_per_kwh = df.assign(cpk=df["total_cost"] / df["consumption_kwh"])["cpk"].mean()
        above_avg = df[df["consumption_kwh"] > monthly_avg_consumption]
        excess_kwh = (above_avg["consumption_kwh"] - monthly_avg_consumption).sum()
        savings_potential_eur = round(float(excess_kwh * avg_cost_per_kwh), 2)

    return {
        "monthly_avg_consumption": monthly_avg_consumption,
        "monthly_avg_cost": monthly_avg_cost,
        "trend_direction": trend_direction,
        "trend_percentage": trend_percentage,
        "seasonality_detected": seasonality_detected,
        "peak_month": peak_month,
        "savings_potential_eur": savings_potential_eur,
        "insufficient_data": False,
    }
