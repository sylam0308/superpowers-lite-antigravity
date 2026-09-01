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

if (-not $Apply) {
    Write-Output 'DRY RUN: no files or plugin registrations will be changed.'
    if ($Surface -in @('App', 'All')) { Show-ManagedFiles -Label 'App' -Target $appTarget }
    if ($Surface -in @('Cli', 'All')) {
        $null = Get-ManagedMarker -Target $appTarget
        Write-Output "CLI registration present: $(Test-CliRegistered)"
        Write-Output "CLI runtime is shared with managed App target: $appTarget"
    }
    Write-Output 'Re-run with -Apply to undeploy only the managed targets shown above.'
    exit 0
}

$appMarker = Get-ManagedMarker -Target $appTarget

if ($Surface -in @('Cli', 'All')) {
    if (Test-CliRegistered) {
        $agy = Get-Command agy -ErrorAction Stop
        $preserveRoot = $null
        if ($Surface -eq 'Cli') {
            $preserveRoot = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-undeploy-$([guid]::NewGuid().ToString('N'))"
            New-Item -ItemType Directory -Path $preserveRoot -Force | Out-Null
            Get-ChildItem -LiteralPath $appTarget -Force | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination $preserveRoot -Recurse -Force
            }
        }
        & $agy.Source plugin uninstall $pluginId
        if ($LASTEXITCODE -ne 0) { throw "agy plugin uninstall failed with exit code $LASTEXITCODE" }
        if ($Surface -eq 'Cli' -and -not (Test-Path -LiteralPath $appTarget -PathType Container)) {
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
        $backup = $appMarker.appBackup
        if (Test-Path -LiteralPath $appTarget) {
            Remove-Item -LiteralPath $appTarget -Recurse -Force
        }
        if ($backup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            New-Item -ItemType Directory -Path $appTarget -Force | Out-Null
            Get-ChildItem -LiteralPath $backup -Force | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination $appTarget -Recurse -Force
            }
            Write-Output "Restored App backup: $backup"
        }
        else {
            Write-Output 'Removed managed App plugin; no previous App target was recorded.'
        }
    }
}

if (Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue) {
    Write-Warning 'Antigravity App is running. Restart it and create a new conversation to refresh plugins.'
}
