import { resolve } from "node:path";
import { OPEN_LEDGER, parseArgs, readJsonl } from "./findings-lib.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  let rows = readJsonl(resolve(process.cwd(), OPEN_LEDGER));
  if (args.one("zone")) rows = rows.filter((row) => row.zone === args.one("zone"));
  if (args.one("severity")) rows = rows.filter((row) => row.severity === args.one("severity"));

  if (args.has("json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const counts = Object.fromEntries(
      ["S0", "S1", "S2", "S3", "S4"].map((severity) => [
        severity,
        rows.filter((row) => row.severity === severity).length,
      ]),
    );
    console.log(
      `OPEN REVIEW FINDINGS: ${rows.length} | ${Object.entries(counts)
        .map(([severity, count]) => `${severity}=${count}`)
        .join(" ")}`,
    );
    for (const row of rows) {
      console.log(
        `${row.id} ${row.severity}/${row.size} ${row.zone} x${row.occurrences} ${row.summary}`,
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
