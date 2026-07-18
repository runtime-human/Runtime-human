#!/usr/bin/env node
// Build documentation table-of-contents + manifest from front-matter.
// Runs without external dependencies (Node >= 18).
//
//   node scripts/build-toc.mjs        # add front-matter + write MANIFEST.jsonc
//   node scripts/build-toc.mjs --check # validate only (CI), exit 1 on problems
//
// Convention: docs/**/*.md start with YAML front-matter (see docs/STYLE.md).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const MANIFEST = path.join(DOCS, "MANIFEST.jsonc");

const TYPE_BY_DIR = {
  adr: "adr",
  architecture: "architecture",
  "game-design": "engine",
  simulation: "simulation",
  persistence: "engine",
  content: "content",
  ui: "ui",
  engineering: "engine",
  events: "events",
  research: "research",
  plans: "plan",
  sources: "source",
  agents: "agent",
  superpowers: "plan",
};

const STATUS_BY_DIR = {
  adr: "accepted",
  research: "draft",
  plans: "draft",
  superpowers: "completed",
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseTitle(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const l of lines) {
    const m = l.match(/^#\s+(.*)$/);
    if (m) return m[1].trim();
  }
  return path.basename(file, ".md");
}

function deriveType(file) {
  const rel = path.relative(DOCS, file).split(path.sep);
  for (let i = rel.length - 2; i >= 0; i--) {
    if (TYPE_BY_DIR[rel[i]]) return TYPE_BY_DIR[rel[i]];
  }
  return "index";
}

function addFrontMatter(file, check) {
  const raw = fs.readFileSync(file, "utf8");
  if (raw.startsWith("---")) return null; // already has front-matter
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const title = parseTitle(file);
  const type = deriveType(file);
  const status = STATUS_BY_DIR[type] || "draft";
  const block =
    `---${eol}title: ${JSON.stringify(title)}${eol}type: ${type}${eol}status: ${status}${eol}canon: true${eol}updated: ${new Date().toISOString().slice(0, 10)}${eol}---${eol}${eol}`;
  if (check) {
    console.error(`[missing front-matter] ${path.relative(ROOT, file)}`);
    return "missing";
  }
  fs.writeFileSync(file, block + raw, "utf8");
  return "added";
}

function parseFrontMatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const body = raw.slice(3, end).trim();
  const fm = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return fm;
}

function main() {
  const check = process.argv.includes("--check");
  const files = walk(DOCS).filter((f) => path.basename(f) !== "STYLE.md");
  let added = 0;
  let missing = 0;
  const entries = [];

  for (const f of files) {
    const r = addFrontMatter(f, check);
    if (r === "added") added++;
    if (r === "missing") missing++;

    const fm = parseFrontMatter(f);
    if (!fm) continue;
    entries.push({
      file: path.relative(ROOT, f).split(path.sep).join("/"),
      title: Array.isArray(fm.title) ? fm.title[0] : fm.title,
      type: Array.isArray(fm.type) ? fm.type[0] : fm.type,
      status: Array.isArray(fm.status) ? fm.status[0] : fm.status,
      canon: fm.canon ? fm.canon[0] === "true" : true,
      dependsOn: fm.depends_on || [],
    });
  }

  // Validate: every Accepted ADR must be referenced by >=1 depends_on.
  const adrIds = entries
    .filter((e) => e.type === "adr")
    .map((e) => {
      const m = e.file.match(/ADR-(\d+)/);
      return m ? "ADR-" + m[1] : null;
    })
    .filter(Boolean);
  const referenced = new Set(entries.flatMap((e) => e.dependsOn));
  const orphanAdrs = adrIds.filter((id) => !referenced.has(id));

  if (!check) {
    const manifest = {
      _generated: new Date().toISOString(),
      _note: "Machine-generated. See docs/STYLE.md. Do not edit by hand.",
      count: entries.length,
      byType: entries.reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {}),
      entries,
    };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2).replace(/\n/g, "\n") + "\n", "utf8");
    console.log(`Front-matter added to ${added} file(s). MANIFEST written with ${entries.length} entries.`);
  }

  if (missing > 0) {
    console.error(`\nCI FAIL: ${missing} file(s) missing front-matter.`);
    process.exit(1);
  }
  if (orphanAdrs.length > 0) {
    console.error(`\nWARN: Accepted ADRs not referenced by any depends_on: ${orphanAdrs.join(", ")}`);
  }
}

main();
