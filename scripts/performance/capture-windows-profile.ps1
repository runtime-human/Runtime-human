$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$outputDirectory = Join-Path $repositoryRoot "artifacts\performance"
$outputPath = Join-Path $outputDirectory "windows-profile-v1.json"

function Invoke-VersionCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $value = & $Command @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read version from $Command"
    }
    return ($value | Out-String).Trim()
}

Push-Location $repositoryRoot
try {
    $operatingSystem = Get-CimInstance Win32_OperatingSystem
    $processor = Get-CimInstance Win32_Processor | Select-Object -First 1
    $computer = Get-CimInstance Win32_ComputerSystem
    $commit = Invoke-VersionCommand -Command "git" -Arguments @("rev-parse", "HEAD")

    $profile = [ordered]@{
        schemaVersion = "windows-performance-profile-v1"
        capturedAtUtc = [DateTimeOffset]::UtcNow.ToString("O")
        repositoryCommit = $commit
        operatingSystem = [ordered]@{
            caption = $operatingSystem.Caption
            version = $operatingSystem.Version
            buildNumber = $operatingSystem.BuildNumber
        }
        processor = [ordered]@{
            name = $processor.Name.Trim()
            logicalProcessors = [int]$computer.NumberOfLogicalProcessors
        }
        memory = [ordered]@{
            totalPhysicalBytes = [int64]$computer.TotalPhysicalMemory
        }
        tooling = [ordered]@{
            node = Invoke-VersionCommand -Command "node" -Arguments @("--version")
            pnpm = Invoke-VersionCommand -Command "pnpm" -Arguments @("--version")
            rustc = Invoke-VersionCommand -Command "rustc" -Arguments @("--version")
            cargo = Invoke-VersionCommand -Command "cargo" -Arguments @("--version")
        }
    }

    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $profile | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $outputPath

    & pnpm perf:january:baseline
    if ($LASTEXITCODE -ne 0) {
        throw "January performance baseline failed"
    }

    Write-Host "Wrote redacted Windows profile to $outputPath"
}
finally {
    Pop-Location
}
