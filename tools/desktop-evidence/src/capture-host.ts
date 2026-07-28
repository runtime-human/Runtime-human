import { arch, cpus, freemem, platform, totalmem } from "node:os";

export type WindowsHostProfile = Readonly<{
  os: "windows";
  arch: "x64" | "arm64";
  logicalProcessors: number;
  memoryMiB: number;
  cpuModel: string;
}>;

export function captureWindowsHostProfile(): WindowsHostProfile {
  if (platform() !== "win32") {
    throw new Error("Desktop evidence capture currently supports Windows only");
  }

  const architecture = arch();
  if (architecture !== "x64" && architecture !== "arm64") {
    throw new Error(`Unsupported Windows architecture: ${architecture}`);
  }

  const processors = cpus();
  const cpuModel = processors[0]?.model.trim() || "unknown-windows-cpu";
  const memoryMiB = Math.floor(totalmem() / (1024 * 1024));
  if (memoryMiB <= 0 || freemem() < 0) {
    throw new Error("Windows host memory information is unavailable");
  }

  return Object.freeze({
    os: "windows",
    arch: architecture,
    logicalProcessors: Math.max(1, processors.length),
    memoryMiB,
    cpuModel,
  });
}
