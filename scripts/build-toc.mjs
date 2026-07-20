#!/usr/bin/env node
// Add/validate documentation front-matter and build deterministic derived indexes.
// Usage:
//   node scripts/build-toc.mjs
//   node scripts/build-toc.mjs --check

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const MANIFEST = path.join(DOCS, "MANIFEST.jsonc");
const CATALOG = path.join(DOCS, "CATALOG.md");
const CHECK = process.argv.includes("--check");
const TODAY = new Date().toISOString().slice(0, 10);

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

const CATALOG_SECTIONS = [
  ["index", "Навигация"],
  ["adr", "Architecture Decision Records"],
  ["architecture", "Архитектура"],
  ["engine", "Движки и инженерные спецификации"],
  ["simulation", "Симуляция и баланс"],
  ["content", "Контент"],
  ["ui", "UI"],
  ["events", "События и narrative"],
  ["plan", "Планы"],
  ["research", "Исследования"],
  ["source", "Источники"],
  ["agent", "Агенты"],
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : entry.name.endsWith(".md") ? [full] : [];
    })
    .filter((file) => path.resolve(file) !== CATALOG)
    .sort((a, b) => a.localeCompare(b, "en"));
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function docsRelative(file) {
  return file.replace(/^docs\//, "");
}

function deriveType(file) {
  const parts = path.relative(DOCS, file).split(path.sep);
  for (let i = parts.length - 2; i >= 0; i--) {
    if (TYPE_BY_DIR[parts[i]]) return TYPE_BY_DIR[parts[i]];
  }
  return "index";
}

function deriveStatus(file, type) {
  const name = path.basename(file);
  if (type === "adr" && /^ADR-\d{3}-/.test(name)) return "accepted";
  if (type === "plan" && file.includes(`${path.sep}superpowers${path.sep}`)) return "completed";
  return "draft";
}

function deriveCanon(type) {
  return !["research", "source"].includes(type);
}

function titleFromBody(raw, file) {
  const body = stripFrontMatter(raw).body;
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1].trim() || path.basename(file, ".md");
}

function adrDependencies(raw, file) {
  const own = path.basename(file).match(/^(ADR-\d{3})-/)?.[1];
  return [...new Set(raw.match(/ADR-\d{3}/g) || [])]
    .filter((id) => id !== own)
    .sort();
}

function stripFrontMatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontMatter: null, body: raw };
  }
  const lines = raw.split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  if (end < 0) return { frontMatter: null, body: raw };
  return {
    frontMatter: lines.slice(1, end),
    body: lines.slice(end + 1).join("\n").replace(/^\n/, ""),
  };
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner
      ? inner
          .split(",")
          .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""))
          .filter(Boolean)
      : [];
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontMatter(raw) {
  const { frontMatter } = stripFrontMatter(raw);
  if (!frontMatter) return null;
  const result = {};
  for (const line of frontMatter) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (match) result[match[1]] = parseScalar(match[2]);
  }
  return result;
}

function quote(value) {
  return JSON.stringify(value);
}

function metadataFor(file, raw) {
  const type = deriveType(file);
  return {
    title: titleFromBody(raw, file),
    type,
    status: deriveStatus(file, type),
    canon: deriveCanon(type),
    depends_on: adrDependencies(raw, file),
    updated: TODAY,
  };
}

function renderFrontMatter(meta) {
  const deps = meta.depends_on.length ? `\ndepends_on: [${meta.depends_on.join(", ")}]` : "";
  return `---\ntitle: ${quote(meta.title)}\ntype: ${meta.type}\nstatus: ${meta.status}\ncanon: ${meta.canon}${deps}\nupdated: ${meta.updated}\n---\n\n`;
}

function validateMetadata(file, meta) {
  const errors = [];
  for (const key of ["title", "type", "status", "canon", "updated"]) {
    if (meta?.[key] === undefined || meta[key] === "") errors.push(`${relative(file)}: missing ${key}`);
  }
  if (meta && meta.type !== deriveType(file))
    errors.push(`${relative(file)}: type must be ${deriveType(file)}`);
  if (meta && typeof meta.canon !== "boolean")
    errors.push(`${relative(file)}: canon must be boolean`);
  if (meta && !/^\d{4}-\d{2}-\d{2}$/.test(String(meta.updated)))
    errors.push(`${relative(file)}: updated must be YYYY-MM-DD`);
  if (
    meta?.depends_on &&
    (!Array.isArray(meta.depends_on) || meta.depends_on.some((id) => !/^ADR-\d{3}$/.test(id)))
  ) {
    errors.push(`${relative(file)}: depends_on must contain ADR-### IDs`);
  }
  return errors;
}

function buildManifest(entries) {
  const byType = {};
  for (const entry of entries) byType[entry.type] = (byType[entry.type] || 0) + 1;
  return {
    _schemaVersion: 1,
    _note: "Machine-generated by scripts/build-toc.mjs. Do not edit by hand.",
    sourceUpdatedThrough: entries.map((entry) => entry.updated).sort().at(-1) || null,
    count: entries.length,
    byType,
    entries,
  };
}

function buildCatalog(entries) {
  const updated = entries.map((entry) => entry.updated).sort().at(-1) || TODAY;
  const lines = [
    "---",
    'title: "Runtime Human — полный каталог документации"',
    "type: index",
    "status: draft",
    "canon: false",
    `updated: ${updated}`,
    "---",
    "",
    "# Runtime Human — полный каталог документации",
    "",
    "> Сгенерировано `node scripts/build-toc.mjs` из metadata документов. Не редактировать вручную.",
    "> Канонический навигационный вход и порядок источников истины: [INDEX.md](INDEX.md).",
    "",
    `Всего документов: **${entries.length}**.`,
    "",
  ];

  for (const [type, title] of CATALOG_SECTIONS) {
    const items = entries
      .filter((entry) => entry.type === type)
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));
    if (items.length === 0) continue;
    lines.push(`## ${title}`, "");
    for (const item of items) {
      const scope = item.canon ? "canon" : "non-canon";
      lines.push(`- [${item.title}](${docsRelative(item.file)}) — \`${item.status}\`, \`${scope}\``);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

const files = walk(DOCS);
const errors = [];
let added = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const meta = parseFrontMatter(raw);
  if (!meta) {
    if (CHECK) {
      errors.push(`${relative(file)}: missing front-matter`);
      continue;
    }
    const generated = metadataFor(file, raw);
    fs.writeFileSync(file, renderFrontMatter(generated) + raw, "utf8");
    added++;
  }
}

const entries = [];
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const meta = parseFrontMatter(raw);
  errors.push(...validateMetadata(file, meta));
  if (!meta) continue;
  entries.push({
    file: relative(file),
    title: String(meta.title),
    type: String(meta.type),
    status: String(meta.status),
    canon: meta.canon,
    dependsOn: Array.isArray(meta.depends_on) ? meta.depends_on : [],
    updated: String(meta.updated),
  });
}

const knownAdrIds = new Set(
  entries
    .map((entry) => entry.file.match(/\/ADR-(\d{3})-/)?.[1])
    .filter(Boolean)
    .map((id) => `ADR-${id}`),
);
for (const entry of entries) {
  for (const dependency of entry.dependsOn) {
    if (!knownAdrIds.has(dependency))
      errors.push(`${entry.file}: unknown depends_on ${dependency}`);
  }
}

const manifestText = JSON.stringify(buildManifest(entries), null, 2) + "\n";
const catalogText = buildCatalog(entries);

if (CHECK) {
  if (!fs.existsSync(MANIFEST)) errors.push("docs/MANIFEST.jsonc: missing");
  else if (fs.readFileSync(MANIFEST, "utf8") !== manifestText)
    errors.push("docs/MANIFEST.jsonc: stale; run node scripts/build-toc.mjs");

  if (!fs.existsSync(CATALOG)) errors.push("docs/CATALOG.md: missing");
  else if (fs.readFileSync(CATALOG, "utf8") !== catalogText)
    errors.push("docs/CATALOG.md: stale; run node scripts/build-toc.mjs");
} else {
  fs.writeFileSync(MANIFEST, manifestText, "utf8");
  fs.writeFileSync(CATALOG, catalogText, "utf8");
}

if (errors.length) {
  for (const error of errors) console.error(`[docs] ${error}`);
  console.error(`[docs] FAIL: ${errors.length} problem(s)`);
  process.exit(1);
}

console.log(`[docs] OK: ${entries.length} files, ${added} front-matter block(s) added`);
