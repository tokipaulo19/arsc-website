const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  crypto = require("node:crypto"),
  test = require("node:test");
const root = path.join(__dirname, "..", "samples", "portfolio");
const slugs = ["aura", "form", "june", "hearth", "north", "tidehouse"];
const context = {};
vm.runInNewContext(
  fs.readFileSync(path.join(root, "shared/domain.js"), "utf8"),
  context,
);
const d = context.PortfolioDomain;
test("beauty estimates keep service, people and bridal-only trials consistent", () => {
  assert.equal(d.beautyQuote("bridal", 3, true).total, 770);
  assert.equal(d.beautyQuote("occasion", 2, true).total, 260);
  assert.equal(d.beautyQuote("occasion", 2, true).trial, false);
  for (const count of [0, 7, 1.5, NaN])
    assert.throws(() => d.beautyQuote("bridal", count));
  for (const id of ["missing", "toString", "__proto__"])
    assert.throws(() => d.beautyQuote(id, 1));
});
test("coaching goals produce the requested session count without mutating stored plans", () => {
  for (const goal of ["strength", "energy", "return"])
    for (const days of [2, 3, 4]) {
      const p = d.coachPlan(goal, days);
      assert.equal(p.sessions.length, days);
      assert.equal(p.monthly, 149);
    }
  assert.notEqual(
    d.coachPlan("strength", 2).sessions[0],
    d.coachPlan("return", 2).sessions[0],
  );
  const p = d.coachPlan("strength", 2);
  p.sessions.pop();
  assert.equal(d.coachPlan("strength", 2).sessions.length, 2);
  assert.throws(() => d.coachPlan("strength", 5));
  assert.throws(() => d.coachPlan("toString", 3));
});
test("stay estimates enforce nights and room capacities and calculate exact rates", () => {
  assert.equal(d.stayQuote("loft", 3, 4).total, 1140);
  assert.equal(d.stayQuote("ocean", 2, 3).total, 590);
  assert.equal(d.stayQuote("garden", 14, 2).total, 3080);
  for (const args of [
    ["garden", 2, 3],
    ["ocean", 0, 2],
    ["loft", 15, 1],
    ["garden", 1.5, 1],
    ["garden", 2, 1.5],
    ["missing", 2, 1],
    ["__proto__", 2, 1],
  ])
    assert.throws(() => d.stayQuote(...args));
});
test("design fees validate scope and area and remain design-only calculations", () => {
  assert.equal(d.interiorQuote("home", 80, "concept").total, 4000);
  assert.equal(d.interiorQuote("hospitality", 120, "detailed").total, 10800);
  for (const args of [
    ["home", 0, "concept"],
    ["home", 501, "concept"],
    ["home", 80.5, "concept"],
    ["toString", 80, "concept"],
    ["home", 80, "missing"],
  ])
    assert.throws(() => d.interiorQuote(...args));
});
test("date validation rejects past, malformed and rolled dates; departures cross month and leap boundaries", () => {
  assert.equal(d.isFutureDate("2030-10-12", "2030-10-12"), true);
  assert.equal(d.isFutureDate("2030-10-11", "2030-10-12"), false);
  assert.equal(d.isFutureDate("2030-02-30", "2029-01-01"), false);
  assert.equal(d.isFutureDate("2030-2-3", "2029-01-01"), false);
  assert.equal(d.departureDate("2032-02-28", 2), "2032-03-01");
  assert.equal(d.departureDate("2030-12-30", 3), "2031-01-02");
  assert.throws(() => d.departureDate("2030-02-30", 2));
});
test("all six independent websites and the gallery have working local routes, sections and assets", () => {
  for (const slug of ["", ...slugs]) {
    const directory = path.join(root, slug);
    const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(ref)) continue;
      if (ref.startsWith("#")) {
        assert.ok(ids.has(ref.slice(1)), slug + ": " + ref);
        continue;
      }
      assert.ok(
        fs.existsSync(path.resolve(directory, ref.split("#")[0])),
        slug + ": " + ref,
      );
    }
    if (slug) {
      assert.ok(fs.existsSync(path.join(directory, "styles.css")));
      assert.ok(fs.existsSync(path.join(directory, "app.js")));
      assert.match(html, /Fictional business/);
      for (const form of html.matchAll(/<form\b([^>]+)>/g))
        assert.match(
          form[1],
          /method="dialog"/,
          "native submit must never send personal demo data",
        );
    }
  }
});
test("featured images are distinct within and between websites, with no repeated hero as section filler", () => {
  const all = new Set();
  for (const slug of slugs) {
    const html = fs.readFileSync(path.join(root, slug, "index.html"), "utf8");
    const images = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(
      (m) => m[1],
    );
    assert.ok(images.length > 0);
    assert.equal(
      new Set(images).size,
      images.length,
      slug + ": repeated photo",
    );
    for (const image of images) {
      assert.ok(!all.has(image), "same photo on multiple sites: " + image);
      all.add(image);
    }
  }
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "assets/prompts.json"), "utf8"),
  );
  assert.equal(all.size, 12);
  assert.equal(manifest.assets.length, 12);
  const hashes = new Set();
  let total = 0;
  for (const a of manifest.assets) {
    const bytes = fs.readFileSync(path.join(root, "assets", a.file));
    assert.ok(bytes.length < 350000, a.file + " should be web-optimised");
    total += bytes.length;
    hashes.add(crypto.createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, 12);
  assert.ok(total < 3000000);
});
test("gallery features six industries and preserves the previous beauty collection as an archive", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  slugs.forEach((slug) =>
    assert.ok(html.includes('href="' + slug + '/index.html"')),
  );
  assert.match(html, /makeup-brands\/archive.html/);
  assert.equal((html.match(/class="g-project /g) || []).length, 6);
});
test("forms and builders never call a network endpoint or persist entered personal information", () => {
  for (const slug of slugs) {
    const js = fs.readFileSync(path.join(root, slug, "app.js"), "utf8");
    assert.doesNotMatch(
      js,
      /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|\.submit\s*\(/,
    );
  }
  const ui = fs.readFileSync(path.join(root, "shared/ui.js"), "utf8");
  assert.doesNotMatch(
    ui,
    /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|\.submit\s*\(/,
  );
});
