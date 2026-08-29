import { resolve } from "node:path";
import { clusterFindings, OPEN_LEDGER, parseArgs, readJsonl, readPolicy } from "./findings-lib.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  const policy = readPolicy(process.cwd());
  let rows = readJsonl(resolve(process.cwd(), OPEN_LEDGER));
  const zone = args.one("zone");
  if (zone) rows = rows.filter((row) => row.zone === zone);
  const clusters = clusterFindings(rows, policy);

  if (args.has("json")) {
    console.log(JSON.stringify(clusters, null, 2));
  } else {
    for (const cluster of clusters) {
      console.log(
        `${cluster.state.padEnd(11)} ${cluster.key} findings=${cluster.findingCount} occurrences=${cluster.totalOccurrences} score=${cluster.score} risk=${cluster.recommendedRisk}`,
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
