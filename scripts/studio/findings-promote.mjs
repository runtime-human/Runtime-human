import { resolve } from "node:path";
import {
  OPEN_LEDGER,
  parseArgs,
  promoteRecurring,
  readJsonl,
  readPolicy,
} from "./findings-lib.mjs";

try {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const id = args.one("id");
  const policy = readPolicy(root);
  const rows = readJsonl(resolve(root, OPEN_LEDGER));
  const requested = id ? rows.find((row) => row.id === id) : null;
  if (id && !requested) throw new Error(`Open finding not found: ${id}`);

  const hasPromotion = id
    ? requested.recurrenceLevel !== "systemic"
    : rows.some(
        (row) =>
          (row.occurrences ?? 1) >= policy.promotion.systemicOccurrenceThreshold &&
          row.recurrenceLevel !== "systemic",
      );

  const promoted = hasPromotion ? promoteRecurring(root, { id }) : [];
  console.log(JSON.stringify({ promoted }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
