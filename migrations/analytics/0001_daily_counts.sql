-- Dedicated ARSC analytics database only. No visitor or enquiry records.
CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL CHECK (path IN ('/', '/services/general-virtual-assistance/', '/services/social-media-management/', '/services/social-media-graphics/')),
  event TEXT NOT NULL CHECK (event IN ('page_view', 'enquiry_start', 'enquiry_accepted', 'email_click')),
  count INTEGER NOT NULL CHECK (count > 0),
  PRIMARY KEY (day, path, event)
) WITHOUT ROWID;

-- Compact totals are retained for a rolling year, never raw browsing history.
CREATE TRIGGER IF NOT EXISTS analytics_retention AFTER INSERT ON analytics_daily
BEGIN
  DELETE FROM analytics_daily WHERE day < date('now', '-364 days');
END;
