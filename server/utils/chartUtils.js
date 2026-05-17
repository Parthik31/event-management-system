/**
 * chartUtils.js — Shared graph data helpers
 *
 * ROOT CAUSE ANALYSIS
 * ───────────────────
 * The backend aggregates bookings and groups them by date using MongoDB's
 * $dateToString with format '%Y-%m-%d' (fixed from the old '%d %b' format).
 *
 * OLD BUG 1 — Wrong date label format for sorting:
 *   MongoDB used format '%d %b' → "17 May", "01 Nov".
 *   $sort: {_id: 1} on these strings is LEXICOGRAPHIC — it compares the
 *   DAY NUMBER first: "05 Jun" < "28 Feb" because "0" < "2".
 *   Result: months were completely scrambled on the graph (Nov before Feb, etc).
 *
 * OLD BUG 2 — Wrong time window:
 *   get30DaysAgo() was used for the MongoDB $match, but the UI says "last 14 days".
 *   Result: up to 30 days of data could appear on a graph labelled "14 days".
 *
 * OLD BUG 3 — Frontend sort on 'DD MMM' strings also broken:
 *   EventFinance / MovieFinance / MultiplexFinance did:
 *     [...data.chart].sort((a, b) => new Date(a.date) - new Date(b.date))
 *   new Date("17 May") parses as year 2001 in all browsers — so dates spanning
 *   a year boundary (e.g. Dec 2025 → Jan 2026) would all collapse to year 2001
 *   and compare correctly by coincidence — but MongoDB's string sort already
 *   delivered them in wrong order, so the re-sort was too late to help.
 *   EventDashboard / MovieDashboard / MultiplexDashboard / AdminDashboard /
 *   AdminFinance did NO sort at all on the frontend.
 *
 * FIXES APPLIED
 * ─────────────
 * Backend (DashboardAnalytics.js):
 *   1. formatDateLabel changed to '%Y-%m-%d' → ISO date keys ("2026-05-17").
 *      ISO strings ARE lexicographically chronological, so MongoDB's $sort works.
 *   2. get30DaysAgo() replaced with get14DaysAgo() throughout.
 *
 * Frontend (this file + all 8 dashboard/finance pages):
 *   1. prepareChartData() sorts by the ISO date key and filters to last 14 days.
 *   2. formatChartDate() converts "2026-05-17" → "17 May" for X-axis display.
 *   3. All chartData lines replaced with: prepareChartData(data?.chart)
 */

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS   = 30 * 24 * 60 * 60 * 1000;

/**
 * Parse an ISO date string "2026-05-17" into a Date object reliably.
 * Falls back gracefully on null / undefined / malformed input.
 */
const parseISODate = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string') return new Date(0);
  // "2026-05-17" → split to avoid timezone ambiguity from new Date(isoStr)
  const [year, month, day] = isoStr.split('-').map(Number);
  if (!year || !month || !day) return new Date(0);
  // Use UTC midnight so timezone doesn't shift the day
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Convert ISO date key "2026-05-17" to display label "17 May".
 * Used as XAxis tickFormatter in Recharts.
 */
export const formatChartDate = (isoStr) => {
  const d = parseISODate(isoStr);
  if (d.getTime() === 0) return isoStr || ''; // fallback: show raw value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

/**
 * Prepare chart data for rendering:
 *   1. Guard against null/non-array input → return []
 *   2. Filter to last 14 days only
 *   3. Sort chronologically by date (oldest → newest, left → right)
 *   4. Deduplicate by date key (keeps the last occurrence if duplicates exist)
 *
 * Handles both:
 *   - New ISO format keys: { date: "2026-05-17", revenue: 500 }
 *   - _id field alias:     { _id: "2026-05-17", date: "2026-05-17", revenue: 500 }
 *
 * @param {Array}  rawChart — data.chart from the API response
 * @param {number} days    — window size in days (default 14; pass 30 for admin dashboard)
 * @returns {Array} sorted, filtered, deduplicated chart array safe for Recharts
 */
export const prepareChartData = (rawChart, days = 14) => {
  if (!Array.isArray(rawChart) || rawChart.length === 0) return [];

  const windowMs = days === 30 ? THIRTY_DAYS_MS : FOURTEEN_DAYS_MS;
  const cutoff = Date.now() - windowMs;

  // Deduplicate by date key (last-write-wins)
  const seen = new Map();
  for (const point of rawChart) {
    const key = point.date || point._id || '';
    if (!key) continue;
    seen.set(key, point);
  }

  return [...seen.values()]
    .filter((point) => {
      const d = parseISODate(point.date || point._id || '');
      return d.getTime() > 0 && d.getTime() >= cutoff;
    })
    .sort((a, b) => {
      const da = parseISODate(a.date || a._id || '');
      const db = parseISODate(b.date || b._id || '');
      return da.getTime() - db.getTime(); // ascending: oldest left → newest right
    });
};
