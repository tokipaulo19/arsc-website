export const COUNT_FIELDS = [
  "likes", "comments", "shares", "reposts", "saves", "reach", "impressions",
  "views", "video_views", "video_starts", "video_completions", "follows_attributed",
];

export function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function sumAvailable(values) {
  const available = values.map(safeNumber).filter((value) => value !== null);
  return available.length ? available.reduce((total, value) => total + value, 0) : null;
}

export function ratioPercent(numerator, denominator) {
  const top = safeNumber(numerator);
  const bottom = safeNumber(denominator);
  if (top === null || bottom === null || bottom <= 0) return null;
  return (top / bottom) * 100;
}

export function engagements(record) {
  return sumAvailable([record.likes, record.comments, record.shares, record.reposts, record.saves]);
}

export function enrichRates(record) {
  const totalEngagements = engagements(record);
  const sharesAndReposts = sumAvailable([record.shares, record.reposts]);
  return {
    ...record,
    engagements: totalEngagements,
    engagement_rate: ratioPercent(totalEngagements, record.reach),
    share_rate: ratioPercent(sharesAndReposts, record.reach),
    save_rate: ratioPercent(record.saves, record.reach),
    comment_rate: ratioPercent(record.comments, record.reach),
    completion_rate: ratioPercent(record.video_completions, record.video_starts),
  };
}

export function parseDateKey(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function inclusiveDays(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function getPeriodRange(preset, referenceValue, customStart, customEnd) {
  const reference = parseDateKey(referenceValue);
  if (!reference) throw new Error("A valid reporting reference date is required.");
  let start;
  let end = reference;
  let previousStart;
  let previousEnd;
  if (preset === "mtd") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  } else if (preset === "previous-month") {
    end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 0));
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    previousEnd = addDays(start, -1);
    previousStart = new Date(Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth(), 1));
  } else if (preset === "custom") {
    start = parseDateKey(customStart);
    end = parseDateKey(customEnd);
    if (!start || !end || start > end) throw new Error("Choose a valid custom start and end date.");
  } else {
    const days = preset === "14" ? 14 : 30;
    start = addDays(end, -(days - 1));
  }
  if (!previousStart || !previousEnd) {
    const length = inclusiveDays(start, end);
    previousEnd = addDays(start, -1);
    previousStart = addDays(previousEnd, -(length - 1));
  }
  return {
    start: toDateKey(start),
    end: toDateKey(end),
    previousStart: toDateKey(previousStart),
    previousEnd: toDateKey(previousEnd),
    days: inclusiveDays(start, end),
  };
}

export function isWithin(dateValue, startValue, endValue) {
  const date = String(dateValue ?? "").slice(0, 10);
  return Boolean(date && date >= startValue && date <= endValue);
}

export function postMaturity(publishedAt, referenceValue) {
  const published = new Date(publishedAt);
  const reference = new Date(`${String(referenceValue).slice(0, 10)}T23:59:59Z`);
  const hours = Math.max(0, (reference.getTime() - published.getTime()) / 3600000);
  if (hours < 24) return { key: "early", label: "Early", hours };
  if (hours < 72) return { key: "developing", label: "Developing", hours };
  if (hours < 168) return { key: "maturing", label: "Maturing", hours };
  return { key: "mature", label: "Mature", hours };
}

export function median(values) {
  const numbers = values.map(safeNumber).filter((value) => value !== null).sort((a, b) => a - b);
  if (!numbers.length) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
}

export function average(values) {
  const numbers = values.map(safeNumber).filter((value) => value !== null);
  return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : null;
}

function aggregateRecords(records, fields) {
  return Object.fromEntries(fields.map((field) => [field, sumAvailable(records.map((record) => record[field]))]));
}

export function buildPostRows(payload, range, filters = {}) {
  const posts = payload.posts.filter((post) => {
    if (!isWithin(post.published_at, range.start, range.end)) return false;
    if (filters.platform && filters.platform !== "all" && post.platform !== filters.platform) return false;
    if (filters.pillar && filters.pillar !== "all" && post.primary_pillar !== filters.pillar && !post.secondary_pillars?.includes(filters.pillar)) return false;
    if (filters.format && filters.format !== "all" && post.format !== filters.format) return false;
    if (filters.campaign && filters.campaign !== "all" && post.campaign_slug !== filters.campaign) return false;
    return true;
  });
  return posts.map((post) => {
    const snapshots = payload.post_daily
      .filter((row) => row.post_id === post.post_id && row.snapshot_date <= range.end)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const metricRecord = snapshots.at(-1) ?? {};
    const manychatRecords = payload.manychat_daily.filter((row) => row.post_id === post.post_id && isWithin(row.snapshot_date, range.start, range.end));
    const webRecords = payload.web_daily.filter((row) => row.post_id === post.post_id && isWithin(row.date, range.start, range.end));
    const manychat = aggregateRecords(manychatRecords, ["automation_sends", "dm_interactions", "contacts_captured", "link_clicks"]);
    const web = aggregateRecords(webRecords, ["sessions", "users", "engaged_sessions", "landing_page_views", "conversions"]);
    const providerCtr = manychatRecords.map((row) => safeNumber(row.automation_ctr)).find((value) => value !== null) ?? null;
    const manychatCtr = providerCtr ?? ratioPercent(manychat.link_clicks, manychat.automation_sends);
    const maturity = postMaturity(post.published_at, range.end);
    return enrichRates({
      ...post,
      ...metricRecord,
      ...manychat,
      ...web,
      title: post.post_title,
      maturity,
      manychat_ctr: manychatCtr,
    });
  });
}

export function aggregatePosts(rows) {
  const totals = aggregateRecords(rows, [...COUNT_FIELDS, "engagements", "automation_sends", "dm_interactions", "contacts_captured", "link_clicks", "sessions", "users", "engaged_sessions", "landing_page_views", "conversions"]);
  return {
    ...totals,
    posts: rows.length,
    engagement_rate: ratioPercent(totals.engagements, totals.reach),
    share_rate: ratioPercent(sumAvailable([totals.shares, totals.reposts]), totals.reach),
    save_rate: ratioPercent(totals.saves, totals.reach),
    comment_rate: ratioPercent(totals.comments, totals.reach),
    completion_rate: ratioPercent(totals.video_completions, totals.video_starts),
    manychat_ctr: ratioPercent(totals.link_clicks, totals.automation_sends),
    average_engagement_rate: average(rows.map((row) => row.engagement_rate)),
  };
}

export function valueChange(current, previous) {
  const currentNumber = safeNumber(current);
  const previousNumber = safeNumber(previous);
  if (currentNumber === null || previousNumber === null) return { absolute: null, percent: null };
  const absolute = currentNumber - previousNumber;
  return { absolute, percent: previousNumber === 0 ? null : (absolute / previousNumber) * 100 };
}

export function groupRows(rows, keySelector) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keySelector(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return groups;
}

export function accountValueAt(rows, field, dateValue) {
  const candidates = rows
    .filter((row) => row.date <= dateValue && safeNumber(row[field]) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return safeNumber(candidates.at(-1)?.[field]);
}

export function sumRowsInRange(rows, dateField, valueField, range) {
  return sumAvailable(rows.filter((row) => isWithin(row[dateField], range.start, range.end)).map((row) => row[valueField]));
}

export function maturityEligible(row, minimumHours = 72) {
  return safeNumber(row.maturity?.hours) >= minimumHours;
}

export function buildCsv(rows, columns) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = [...columns.map((column) => column.label), "Maturity"].map(quote).join(",");
  const records = rows.map((row) => [
    ...columns.map((column) => {
      const value = row[column.key];
      return Array.isArray(value) ? value.join("|") : value;
    }),
    row.maturity?.label ?? "",
  ].map(quote).join(","));
  return [header, ...records].join("\n");
}
