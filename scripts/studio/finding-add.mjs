import { parseArgs, upsertFinding } from "./findings-lib.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  const result = upsertFinding(process.cwd(), {
    zone: args.one("zone"),
    severity: args.one("severity"),
    size: args.one("size"),
    scope: args.one("scope"),
    category: args.one("category"),
    component: args.one("component", "general"),
    invariant: args.one("invariant"),
    summary: args.one("summary"),
    disposition: args.one("disposition", "LEDGER"),
    fingerprint: args.one("fingerprint"),
    evidence: args.many("evidence"),
    introducedBy: args.many("introduced-by"),
    foundBy: args.many("found-by"),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
