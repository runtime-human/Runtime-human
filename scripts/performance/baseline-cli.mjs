export function parseBaselineArguments(args, defaults, label) {
  const parsed = {
    warmups: defaults.warmups,
    samples: defaults.samples,
    output: defaults.output,
    commit: null,
  };

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument.startsWith("--warmups=")) {
      parsed.warmups = parseInteger(argument, "--warmups=", 0);
      continue;
    }
    if (argument.startsWith("--samples=")) {
      parsed.samples = parseInteger(argument, "--samples=", 1);
      continue;
    }
    if (argument.startsWith("--output=")) {
      parsed.output = requireValue(argument, "--output=");
      continue;
    }
    if (argument.startsWith("--commit=")) {
      parsed.commit = requireValue(argument, "--commit=");
      continue;
    }
    throw new Error(`Unknown ${label} option: ${argument}`);
  }

  return parsed;
}

function parseInteger(argument, prefix, minimum) {
  const value = Number(requireValue(argument, prefix));
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${prefix.slice(0, -1)} must be an integer >= ${minimum}`);
  }
  return value;
}

function requireValue(argument, prefix) {
  const value = argument.slice(prefix.length);
  if (value.length === 0) throw new Error(`${prefix.slice(0, -1)} requires a value`);
  return value;
}
