[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateSet('App', 'Cli', 'All')]
    [string]$Surface = 'All'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$pluginId = 'superpowers-lite'
$appPluginsRoot = Join-Path $env:USERPROFILE '.gemini\config\plugins'
$appTarget = Join-Path $appPluginsRoot $pluginId
$cliCandidate = Join-Path $env:USERPROFILE '.gemini\antigravity-cli\plugins\superpowers-lite'
$scriptRoot = Split-Path -Parent $PSCommandPath
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $sourceRoot '..'))
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.deploy-backups'))

function Get-ManagedMarker {
    param([Parameter(Mandatory)][string]$Target)
    if (-not (Test-Path -LiteralPath $Target -PathType Container)) { return $null }
    $markerPath = Join-Path $Target '.superpowers-lite-managed.json'
    if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) {
        throw "Refusing unmanaged target: $Target"
    }
    $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
    if ($marker.pluginId -ne $pluginId) {
        throw "Refusing marker for plugin '$($marker.pluginId)' at $Target"
    }
    return $marker
}

function Get-ValidatedAppBackup {
    param($Marker)
    if ($null -eq $Marker -or $null -eq $Marker.appBackup -or [string]::IsNullOrWhiteSpace([string]$Marker.appBackup)) { return $null }
    if ($Marker.appBackup -isnot [string]) { throw 'Refusing non-scalar appBackup in managed marker.' }
    $resolved = [System.IO.Path]::GetFullPath([string]$Marker.appBackup)
    $relative = [System.IO.Path]::GetRelativePath($backupRoot, $resolved)
    if ($relative -eq '..' -or $relative.StartsWith("..$([System.IO.Path]::DirectorySeparatorChar)") -or [System.IO.Path]::IsPathRooted($relative)) {
        throw "Refusing App backup outside managed backup root: $resolved"
    }
    if ((Split-Path -Leaf $resolved) -ne $pluginId -or -not (Test-Path -LiteralPath $resolved -PathType Container)) {
        throw "Managed App backup is missing or has an invalid target: $resolved"
    }
    return [string]$resolved
}

function Restore-AppBackup {
    param([Parameter(Mandatory)][string]$Backup)
    $stageName = ".$pluginId.restore-$([guid]::NewGuid().ToString('N'))"
    $stage = Join-Path $appPluginsRoot $stageName
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    Get-ChildItem -LiteralPath $Backup -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
    }
    try {
        if (Test-Path -LiteralPath $appTarget) { Remove-Item -LiteralPath $appTarget -Recurse -Force }
        Move-Item -LiteralPath $stage -Destination $appTarget
    }
    catch {
        throw "App restore failed. Recovery copy remains at '$stage'; source backup remains at '$Backup'. $($_.Exception.Message)"
    }
    Write-Output "Restored App backup: $Backup"
}

function Show-ManagedFiles {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Target
    )
    if (-not (Test-Path -LiteralPath $Target -PathType Container)) {
        Write-Output "${Label}: not installed at $Target"
        return
    }
    $null = Get-ManagedMarker -Target $Target
    Write-Output "$Label managed target: $Target"
    Get-ChildItem -LiteralPath $Target -Recurse -File -Force | Sort-Object FullName | ForEach-Object {
        Write-Output "  $($_.FullName)"
    }
}

function Test-CliRegistered {
    $agy = Get-Command agy -ErrorAction Stop
    $raw = & $agy.Source plugin list 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "agy plugin list failed: $raw" }
    $list = $raw | ConvertFrom-Json
    return @($list.imports | Where-Object { $_.name -eq $pluginId }).Count -eq 1
}

function Get-CliRegistration {
    $agy = Get-Command agy -ErrorAction Stop
    $raw = & $agy.Source plugin list 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "agy plugin list failed: $raw" }
    $list = $raw | ConvertFrom-Json
    return @($list.imports | Where-Object { $_.name -eq $pluginId }) | Select-Object -First 1
}

if (-not $Apply) {
    Write-Output 'DRY RUN: no files or plugin registrations will be changed.'
    if ($Surface -in @('App', 'All')) { Show-ManagedFiles -Label 'App' -Target $appTarget }
    if ($Surface -in @('Cli', 'All')) {
        $registration = Get-CliRegistration
        if ($null -eq $registration) { Write-Output 'CLI registration present: False' }
        else {
            $runtime = if ($registration.source -eq 'antigravity') { $appTarget } else { $cliCandidate }
            $null = Get-ManagedMarker -Target $runtime
            Write-Output 'CLI registration present: True'
            Write-Output "CLI registration source: $($registration.source)"
            Write-Output "CLI managed runtime: $runtime"
        }
    }
    Write-Output 'Re-run with -Apply to undeploy only the managed targets shown above.'
    exit 0
}

$appMarker = Get-ManagedMarker -Target $appTarget
$appBackup = if ($Surface -in @('App', 'All')) { Get-ValidatedAppBackup -Marker $appMarker } else { $null }

if ($Surface -in @('Cli', 'All')) {
    if (Test-CliRegistered) {
        $agy = Get-Command agy -ErrorAction Stop
        $registration = Get-CliRegistration
        $preserveRoot = $null
        if ($Surface -eq 'Cli' -and $registration.source -eq 'antigravity') {
            $preserveRoot = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-undeploy-$([guid]::NewGuid().ToString('N'))"
            New-Item -ItemType Directory -Path $preserveRoot -Force | Out-Null
            Get-ChildItem -LiteralPath $appTarget -Force | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination $preserveRoot -Recurse -Force
            }
        }
        & $agy.Source plugin uninstall $pluginId
        if ($LASTEXITCODE -ne 0) { throw "agy plugin uninstall failed with exit code $LASTEXITCODE" }
        if ($preserveRoot -and -not (Test-Path -LiteralPath $appTarget -PathType Container)) {
            New-Item -ItemType Directory -Path $appTarget -Force | Out-Null
            Get-ChildItem -LiteralPath $preserveRoot -Force | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination $appTarget -Recurse -Force
            }
        }
        if ($preserveRoot -and (Test-Path -LiteralPath $preserveRoot)) {
            Remove-Item -LiteralPath $preserveRoot -Recurse -Force
        }
        Write-Output 'Uninstalled managed CLI plugin.'
    }
}

if ($Surface -in @('App', 'All')) {
    if ($null -ne $appMarker) {
        if ($appBackup) {
            Restore-AppBackup -Backup $appBackup
        }
        else {
            if (Test-Path -LiteralPath $appTarget) { Remove-Item -LiteralPath $appTarget -Recurse -Force }
            Write-Output 'Removed managed App plugin; no previous App target was recorded.'
        }
    }
}

if (Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue) {
    Write-Warning 'Antigravity App is running. Restart it and create a new conversation to refresh plugins.'
}
