import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = process.cwd();
const skillsRoot = resolve(root, ".agents", "skills");
const errors = [];

const MAX_SKILL_LINES = 180;
const REQUIRED_FIELDS = ["name", "description", "compatibility"];
const KNOWN_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".jsonc",
  ".mjs",
  ".cjs",
  ".js",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const NON_SCRIPT_PNPM_WORDS = new Set([
  "install",
  "exec",
  "run",
  "add",
  "remove",
  "dlx",
  "store",
  "root",
  "test",
]);

function parseFrontMatter(raw) {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) return null;
  const lines = raw.split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  if (end < 0) return null;
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([a-z_-]+):\s*(.*)$/i);
    if (match) fields[match[1].toLowerCase()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return fields;
}

function bodyAfterFrontMatter(raw) {
  const lines = raw.split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  return end < 0 ? raw : lines.slice(end + 1).join("\n");
}

function referencedRepoPaths(body) {
  const references = [];
  for (const match of body.matchAll(/`([^`]+)`/g)) {
    const token = match[1].replaceAll("\\", "/").trim();
    if (!token.includes("/")) continue;
    if (token.startsWith("http://") || token.startsWith("https://")) continue;
    if (/[*{}<>]/.test(token) || token.includes("..")) continue;
    if (!KNOWN_EXTENSIONS.has(token.slice(token.lastIndexOf(".")).toLowerCase())) continue;
    references.push(token.replace(/^\.\//, ""));
  }
  return [...new Set(references)];
}

function referencedPnpmScripts(body) {
  const scripts = [];
  for (const match of body.matchAll(/\bpnpm\s+([a-z][a-z0-9:@._-]*)/gi)) {
    const name = match[1];
    if (!NON_SCRIPT_PNPM_WORDS.has(name.toLowerCase())) scripts.push(name);
  }
  return [...new Set(scripts)];
}

function readSkillMap() {
  const mapPath = resolve(root, ".studio", "skill-map.json");
  if (!existsSync(mapPath)) {
    errors.push("missing .studio/skill-map.json");
    return null;
  }
  let map;
  try {
    map = JSON.parse(readFileSync(mapPath, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON .studio/skill-map.json: ${error.message}`);
    return null;
  }
  if (map.schemaVersion !== 1) errors.push(".studio/skill-map.json schemaVersion must be 1");
  const entries = Array.isArray(map.skills) ? map.skills : [];
  const seen = new Set();
  for (const entry of entries) {
    for (const field of ["name", "path", "status", "activation"]) {
      if (typeof entry?.[field] !== "string" || entry[field].trim() === "") {
        errors.push(`skill-map entry missing ${field}: ${JSON.stringify(entry?.name ?? entry)}`);
      }
    }
    if (entry?.name && seen.has(entry.name)) errors.push(`skill-map duplicate name ${entry.name}`);
    seen.add(entry?.name);
    if (entry && !["active", "planned"].includes(entry.status)) {
      errors.push(`skill-map ${entry.name} has invalid status ${entry.status}`);
    }
    if (entry?.status === "active" && typeof entry.path === "string") {
      const skillFile = resolve(root, entry.path.replaceAll("\\", "/"), "SKILL.md");
      if (!existsSync(skillFile))
        errors.push(`skill-map active skill missing on disk: ${entry.name} (${entry.path})`);
    }
  }
  return { entries, byName: new Map(entries.map((entry) => [entry?.name, entry])) };
}

function validateDiskSkill(directory) {
  const skillFile = join(directory, "SKILL.md");
  const dirName = basename(directory);
  if (!existsSync(skillFile)) {
    errors.push(`missing SKILL.md: .agents/skills/${dirName}`);
    return null;
  }
  const raw = readFileSync(skillFile, "utf8");
  const frontMatter = parseFrontMatter(raw);
  if (!frontMatter) {
    errors.push(`.agents/skills/${dirName}/SKILL.md: missing YAML frontmatter`);
    return null;
  }
  for (const field of REQUIRED_FIELDS) {
    if (!frontMatter[field] || frontMatter[field].trim() === "") {
      errors.push(`.agents/skills/${dirName}/SKILL.md: empty or missing ${field}`);
    }
  }
  if (frontMatter.name && frontMatter.name !== dirName) {
    errors.push(
      `.agents/skills/${dirName}/SKILL.md: name "${frontMatter.name}" must equal directory name`,
    );
  }
  const lineCount = raw.split(/\r?\n/).length;
  if (lineCount > MAX_SKILL_LINES) {
    errors.push(
      `.agents/skills/${dirName}/SKILL.md: ${lineCount} lines exceed soft limit ${MAX_SKILL_LINES}`,
    );
  }
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  for (const path of referencedRepoPaths(bodyAfterFrontMatter(raw))) {
    if (!existsSync(resolve(root, path))) {
      errors.push(`.agents/skills/${dirName}/SKILL.md: referenced path does not exist: ${path}`);
    }
  }
  for (const script of referencedPnpmScripts(bodyAfterFrontMatter(raw))) {
    if (!packageJson.scripts?.[script]) {
      errors.push(
        `.agents/skills/${dirName}/SKILL.md: referenced pnpm script does not exist: ${script}`,
      );
    }
  }
  return { dirName, description: frontMatter.description ?? "", lineCount };
}

function main() {
  if (!existsSync(skillsRoot)) {
    errors.push("missing .agents/skills directory");
  }
  const map = existsSync(skillsRoot) ? readSkillMap() : null;

  const diskSkills = [];
  if (existsSync(skillsRoot)) {
    for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const validated = validateDiskSkill(join(skillsRoot, entry.name));
      if (validated) diskSkills.push(validated);
    }
  }

  const names = diskSkills.map((skill) => skill.dirName);
  if (new Set(names).size !== names.length) errors.push("duplicate skill directory names");
  const descriptions = diskSkills.map((skill) => skill.description);
  if (descriptions.some((value) => value === "")) {
    // already reported as empty/missing description
  } else if (new Set(descriptions).size !== descriptions.length) {
    errors.push("skill descriptions must be pairwise distinct");
  }

  if (map) {
    const mappedNames = new Set(map.entries.map((entry) => entry?.name));
    for (const name of names) {
      if (!mappedNames.has(name))
        errors.push(`skill on disk missing from .studio/skill-map.json: ${name}`);
    }
  }

  if (errors.length) {
    console.error("Skills invalid:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Skills OK (${diskSkills.length})`);
}

main();
