import { parseArgs, resolveFinding } from "./findings-lib.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  const finding = resolveFinding(process.cwd(), {
    id: args.one("id"),
    rootCause: args.one("root-cause"),
    fixCommit: args.one("fix-commit"),
    prevention: args.many("prevention"),
  });
  console.log(JSON.stringify({ resolved: finding }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
