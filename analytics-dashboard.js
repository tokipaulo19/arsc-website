(() => {
  const labels = { '/': 'Homepage', '/services/general-virtual-assistance/': 'General virtual assistance', '/services/social-media-management/': 'Social media management', '/services/social-media-graphics/': 'Social media graphics' };
  const events = ['page_view', 'enquiry_start', 'enquiry_accepted', 'email_click'];
  const number = value => Number(value).toLocaleString('en-AU');
  const status = document.getElementById('status'), period = document.getElementById('period'), refresh = document.getElementById('refresh');
  let controller, revision = 0;
  async function load() {
    controller?.abort(); controller = new AbortController(); const activeController = controller, current = ++revision;
    const timeout = setTimeout(() => activeController.abort(), 8000);
    refresh.disabled = true; status.textContent = 'Loading private statistics…';
    document.getElementById('export').href = '/analytics/export?days=' + period.value;
    try {
      const response = await fetch('/analytics/report?days=' + period.value, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error('unavailable');
      const report = await response.json(); if (current !== revision) return;
      const totals = Object.fromEntries(events.map(event => [event, 0]));
      const pages = Object.fromEntries(Object.keys(labels).map(path => [path, { ...totals }]));
      const days = new Map();
      for (let i = 0; i < report.days; i++) { const date = new Date(report.from + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + i); days.set(date.toISOString().slice(0, 10), 0); }
      let today = 0;
      for (const row of report.rows) {
        if (!pages[row.path] || !events.includes(row.event)) continue;
        totals[row.event] += row.count; pages[row.path][row.event] += row.count;
        if (row.event === 'page_view') days.set(row.day, (days.get(row.day) || 0) + row.count);
        if (row.day === report.to) today += row.count;
      }
      for (const event of events) document.getElementById(event).textContent = number(totals[event]);
      const tbody = document.getElementById('pages'); tbody.replaceChildren();
      for (const [path, counts] of Object.entries(pages)) {
        const tr = document.createElement('tr'), name = document.createElement('th'); name.scope = 'row'; name.textContent = labels[path]; tr.append(name);
        for (const event of events) { const td = document.createElement('td'); td.textContent = number(counts[event]); tr.append(td); } tbody.append(tr);
      }
      // Bound the chart to 30 bars even for annual reports and small phones.
      const bucketSize = Math.ceil(days.size / 30), buckets = [];
      let index = 0;
      for (const [day, count] of days) {
        if (index++ % bucketSize === 0) buckets.push({ from: day, to: day, count: 0 });
        const bucket = buckets[buckets.length - 1]; bucket.to = day; bucket.count += count;
      }
      const chart = document.getElementById('chart'), max = Math.max(1, ...buckets.map(bucket => bucket.count)); chart.replaceChildren();
      for (const bucket of buckets) { const bar = document.createElement('span'); bar.className = 'bar'; bar.style.height = (bucket.count / max * 100) + '%'; bar.title = bucket.from + (bucket.to !== bucket.from ? ' — ' + bucket.to : '') + ': ' + number(bucket.count) + ' page views'; chart.append(bar); }
      chart.setAttribute('aria-label', 'Page views by date range: ' + buckets.map(bucket => bucket.from + ' to ' + bucket.to + ': ' + bucket.count).join('; '));
      document.getElementById('range').textContent = report.from + ' — ' + report.to + ' / UTC · ' + (bucketSize === 1 ? 'daily' : bucketSize + '-day groups');
      document.getElementById('capacity').textContent = 'Today’s stored events: ' + number(today) + ' / ' + number(report.cap) + '.';
      status.textContent = report.rows.length ? 'Updated just now. These are observed totals, not a linked visitor funnel.' : 'No recorded activity yet. Statistics begin when visitors allow optional analytics; no sample figures are shown.';
    } catch { if (current === revision) status.textContent = 'Statistics unavailable. Any figures shown are from the last successful refresh. Check your Access session or database setup, then refresh.'; }
    finally { clearTimeout(timeout); if (current === revision) refresh.disabled = false; }
  }
  period.addEventListener('change', load); refresh.addEventListener('click', load); void load();
})();
