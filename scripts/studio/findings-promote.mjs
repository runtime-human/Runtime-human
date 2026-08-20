import { parseArgs, promoteRecurring } from "./findings-lib.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  const promoted = promoteRecurring(process.cwd(), { id: args.one("id") });
  console.log(JSON.stringify({ promoted }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
