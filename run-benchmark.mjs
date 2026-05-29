#!/usr/bin/env node
/**
 * Benchmark objectif Koverstar vs pointures — collecteur PageSpeed Insights.
 *
 * Zéro dépendance (fetch natif Node 18+). Interroge l'API PSI de Google pour
 * chaque cible de targets.json (perf, SEO, accessibilité, best-practices + Core
 * Web Vitals lab), écrit un snapshot horodaté dans scores/<date>.json, et
 * régénère PERF.md (tableau de la dernière passe, trié, Koverstar mis en avant).
 *
 * Usage :
 *   node run-benchmark.mjs                # toutes les cibles, stratégie mobile
 *   node run-benchmark.mjs --desktop      # stratégie desktop
 *   node run-benchmark.mjs --only=koverstar,coverstyl
 *
 * Clé API (recommandé, sinon quota partagé anonyme → 429 fréquents) :
 *   PSI_API_KEY=xxxx node run-benchmark.mjs
 *   (clé gratuite : https://developers.google.com/speed/docs/insights/v5/get-started)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Clé API : env d'abord, sinon fichier .env local (PSI_API_KEY=xxx, gitignoré).
// Permet au cron de toujours trouver la clé sans dépendre de l'environnement shell.
async function resolveKey() {
  if (process.env.PSI_API_KEY) return process.env.PSI_API_KEY.trim();
  try {
    const env = await readFile(join(__dirname, ".env"), "utf8");
    const m = env.match(/^\s*PSI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  } catch { /* pas de .env, on continue keyless */ }
  return "";
}
const KEY = await resolveKey();
const args = process.argv.slice(2);
const STRATEGY = args.includes("--desktop") ? "desktop" : "mobile";
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
const CONCURRENCY = KEY ? 3 : 1; // sans clé : séquentiel pour ménager le quota partagé
const TIMEOUT_MS = 80_000;
const CATS = ["performance", "seo", "accessibility", "best-practices"];

function psiUrl(target) {
  const u = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  u.searchParams.set("url", target);
  u.searchParams.set("strategy", STRATEGY);
  for (const c of CATS) u.searchParams.append("category", c);
  if (KEY) u.searchParams.set("key", KEY);
  return u.toString();
}

function pct(score) {
  return score == null ? null : Math.round(score * 100);
}

async function fetchOne(t, attempt = 1) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(psiUrl(t.url), { signal: ctrl.signal });
    const data = await res.json();
    if (data.error) {
      return { id: t.id, name: t.name, url: t.url, status: "error", error: `${data.error.code} ${data.error.message?.slice(0, 120)}` };
    }
    const lr = data.lighthouseResult;
    const c = lr.categories || {};
    const a = lr.audits || {};
    const num = (k) => a[k]?.numericValue ?? null;
    const disp = (k) => a[k]?.displayValue ?? null;
    return {
      id: t.id,
      name: t.name,
      url: t.url,
      category: t.category,
      self: !!t.self,
      status: "ok",
      scores: {
        performance: pct(c.performance?.score),
        seo: pct(c.seo?.score),
        accessibility: pct(c.accessibility?.score),
        bestPractices: pct(c["best-practices"]?.score),
      },
      cwv: {
        lcpMs: num("largest-contentful-paint"),
        lcp: disp("largest-contentful-paint"),
        cls: num("cumulative-layout-shift"),
        clsDisp: disp("cumulative-layout-shift"),
        tbtMs: num("total-blocking-time"),
        tbt: disp("total-blocking-time"),
        fcp: disp("first-contentful-paint"),
        si: disp("speed-index"),
      },
    };
  } catch (e) {
    if (attempt < 2 && e.name !== "AbortError") {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchOne(t, attempt + 1);
    }
    return { id: t.id, name: t.name, url: t.url, status: "error", error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, n, worker) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      process.stderr.write(`  · ${items[idx].name} …\n`);
      out[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return out;
}

function objComposite(s) {
  if (!s) return null;
  const vals = [s.performance, s.seo, s.accessibility, s.bestPractices].filter((v) => v != null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function bar(v) {
  if (v == null) return "—";
  const filled = Math.round((v / 100) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function renderPerfMd(snapshot) {
  const { date, strategy, keyed, results } = snapshot;
  const ok = results.filter((r) => r.status === "ok");
  const ranked = [...ok].sort((a, b) => (objComposite(b.scores) ?? -1) - (objComposite(a.scores) ?? -1));
  const errs = results.filter((r) => r.status !== "ok");

  let md = `# PERF.md — couche objective (PageSpeed Insights)\n\n`;
  md += `> **Auto-généré par \`run-benchmark.mjs\`. Ne pas éditer à la main.**\n`;
  md += `> Dernière passe : **${date}** · stratégie : **${strategy}** · clé API : **${keyed ? "oui" : "non (quota partagé)"}**\n\n`;

  if (ok.length) {
    md += `## Classement objectif (moyenne perf / SEO / a11y / best-practices)\n\n`;
    md += `| # | Site | Composite | Perf | SEO | A11y | BP | LCP | CLS | TBT |\n`;
    md += `|---|------|-----------|------|-----|------|----|-----|-----|-----|\n`;
    ranked.forEach((r, i) => {
      const s = r.scores;
      const me = r.self ? " **(nous)**" : "";
      md += `| ${i + 1} | ${r.name}${me} | ${objComposite(s) ?? "—"} | ${s.performance ?? "—"} | ${s.seo ?? "—"} | ${s.accessibility ?? "—"} | ${s.bestPractices ?? "—"} | ${r.cwv.lcp ?? "—"} | ${r.cwv.clsDisp ?? "—"} | ${r.cwv.tbt ?? "—"} |\n`;
    });
    md += `\n`;

    const me = ok.find((r) => r.self);
    if (me) {
      const rank = ranked.findIndex((r) => r.self) + 1;
      md += `## Position Koverstar\n\n`;
      md += `**${rank}ᵉ / ${ranked.length}** sur le composite objectif.\n\n`;
      md += `| Axe | Koverstar | Meilleur du panel | Écart |\n|---|---|---|---|\n`;
      for (const [label, k] of [["Performance", "performance"], ["SEO", "seo"], ["Accessibilité", "accessibility"], ["Best practices", "bestPractices"]]) {
        const mine = me.scores[k];
        const best = Math.max(...ok.map((r) => r.scores[k] ?? -1));
        const bestSite = ok.find((r) => r.scores[k] === best)?.name ?? "—";
        const gap = mine != null && best >= 0 ? best - mine : null;
        md += `| ${label} | ${mine ?? "—"} ${bar(mine)} | ${best} (${bestSite}) | ${gap == null ? "—" : gap === 0 ? "✅ leader" : "−" + gap} |\n`;
      }
      md += `\n`;
    }
  } else {
    md += `## ⚠️ Aucune donnée objective collectée\n\nToutes les requêtes ont échoué (souvent : quota PSI partagé épuisé → 429). **Crée une clé API gratuite** et relance avec \`PSI_API_KEY\`. Voir \`runbook.md\`.\n\n`;
  }

  if (errs.length) {
    md += `## Cibles en erreur cette passe\n\n`;
    for (const e of errs) md += `- **${e.name}** — \`${e.error}\`\n`;
    md += `\n`;
  }
  md += `---\n*Historique complet des passes : \`scores/*.json\`.*\n`;
  return md;
}

async function main() {
  const cfg = JSON.parse(await readFile(join(__dirname, "targets.json"), "utf8"));
  let targets = cfg.targets;
  if (ONLY) targets = targets.filter((t) => ONLY.includes(t.id));
  if (!targets.length) {
    console.error("Aucune cible. Vérifie targets.json / --only.");
    process.exit(1);
  }

  console.error(`▶ Benchmark PSI — ${targets.length} cibles · ${STRATEGY} · clé ${KEY ? "présente" : "ABSENTE (quota partagé, 429 probable)"}`);
  const results = await pool(targets, CONCURRENCY, fetchOne);

  const date = new Date().toISOString().slice(0, 10);
  const snapshot = { date, ranAt: new Date().toISOString(), strategy: STRATEGY, keyed: !!KEY, results };

  await mkdir(join(__dirname, "scores"), { recursive: true });
  await writeFile(join(__dirname, "scores", `${date}.json`), JSON.stringify(snapshot, null, 2));
  await writeFile(join(__dirname, "PERF.md"), renderPerfMd(snapshot));

  const ok = results.filter((r) => r.status === "ok");
  const err = results.length - ok.length;
  console.error(`\n✓ ${ok.length} OK · ${err} erreur(s). Snapshot → scores/${date}.json · PERF.md régénéré.`);
  for (const r of ok) {
    console.error(`   ${r.self ? "★" : " "} ${r.name.padEnd(26)} comp=${objComposite(r.scores) ?? "—"}  perf=${r.scores.performance ?? "—"}`);
  }
  for (const r of results.filter((x) => x.status !== "ok")) {
    console.error(`   ✗ ${r.name.padEnd(26)} ${r.error}`);
  }
}

main().catch((e) => {
  console.error("ÉCHEC:", e);
  process.exit(1);
});
