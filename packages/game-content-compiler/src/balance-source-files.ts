import { loadContentSourceFiles } from "./load-content-source-files";
import type { ContentSourceFile } from "./content-types";

export const BALANCE_SOURCE_ROOT = "balance" as const;

export type LoadBalanceSourceFilesOptions = Readonly<{
  repositoryRoot: string;
}>;

export async function loadBalanceSourceFiles(
  options: LoadBalanceSourceFilesOptions,
): Promise<readonly ContentSourceFile[]> {
  return loadContentSourceFiles({
    repositoryRoot: options.repositoryRoot,
    sourceRoots: [BALANCE_SOURCE_ROOT],
  });
}
