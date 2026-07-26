# OPT-00 TypeScript Diagnostic

Branch head: ccf769bde8684ce09522bfe505ff2ffc3b651863
Merge ref: aa0a2e38c8ae2d3d09fcdd6c2b3b8e200af12ab
Branch exit: $branchExit
Merge exit: $mergeExit

## Branch output

`	ext
$ tsc -b --pretty false
tests/january-1990-application-baseline.perf.test.ts(13,8): error TS6307: File 'H:/actions-runner/_work/Runtime-human/Runtime-human/scripts/performance/performance-summary.ts' is not listed within the file list of project 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  The file is in the program because:
    Imported via "../scripts/performance/performance-summary" from file 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/january-1990-application-baseline.perf.test.ts'
    Imported via "../scripts/performance/performance-summary" from file 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/performance-summary.test.ts'
[ELIFECYCLE] Command failed with exit code 2.

`

## Merge-ref output

`	ext
$ tsc -b --pretty false
tests/january-1990-application-baseline.perf.test.ts(13,8): error TS6307: File 'H:/actions-runner/_work/Runtime-human/Runtime-human/scripts/performance/performance-summary.ts' is not listed within the file list of project 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  The file is in the program because:
    Imported via "../scripts/performance/performance-summary" from file 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/january-1990-application-baseline.perf.test.ts'
    Imported via "../scripts/performance/performance-summary" from file 'H:/actions-runner/_work/Runtime-human/Runtime-human/tests/performance-summary.test.ts'
[ELIFECYCLE] Command failed with exit code 2.

`
