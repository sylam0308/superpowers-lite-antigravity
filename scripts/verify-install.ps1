[CmdletBinding()]
param(
    [ValidateSet('Source', 'App', 'Cli', 'All')]
    [string]$Surface = 'All'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $PSCommandPath
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$pluginId = 'superpowers-lite'
$appRoot = Join-Path $env:USERPROFILE '.gemini\config\plugins\superpowers-lite'
$configRoot = Join-Path $env:USERPROFILE '.gemini\config'

function Get-RuntimeFiles {
    param([Parameter(Mandatory)][string]$Root)

    $fixed = @('plugin.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md')
    $files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    foreach ($relative in $fixed) {
        $path = Join-Path $Root $relative
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $files.Add((Get-Item -LiteralPath $path))
        }
    }
    foreach ($directory in @('rules', 'skills')) {
        $path = Join-Path $Root $directory
        if (Test-Path -LiteralPath $path -PathType Container) {
            Get-ChildItem -LiteralPath $path -Recurse -File | ForEach-Object { $files.Add($_) }
        }
    }
    return $files | Sort-Object FullName
}

function Get-RuntimeMap {
    param([Parameter(Mandatory)][string]$Root)

    if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
        throw "Plugin surface is missing: $Root"
    }

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
    $map = [ordered]@{}
    foreach ($file in Get-RuntimeFiles -Root $resolvedRoot) {
        $relative = $file.FullName.Substring($resolvedRoot.Length + 1).Replace('\', '/')
        $map[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    return $map
}

function Assert-Manifest {
    param([Parameter(Mandatory)][string]$Root)

    $manifestPath = Join-Path $Root 'plugin.json'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Missing plugin.json at $Root"
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.name -ne $pluginId) {
        throw "Unexpected plugin name '$($manifest.name)' at $Root"
    }
    return $manifest
}

function Compare-Surface {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)]$SourceManifest,
        [Parameter(Mandatory)]$SourceMap
    )

    $targetManifest = Assert-Manifest -Root $Target
    if ($targetManifest.version -ne $SourceManifest.version) {
        throw "$Label version mismatch: source=$($SourceManifest.version), target=$($targetManifest.version)"
    }

    $markerPath = Join-Path $Target '.superpowers-lite-managed.json'
    if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) {
        throw "$Label is missing the managed marker: $markerPath"
    }
    $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
    if ($marker.pluginId -ne $pluginId) {
        throw "$Label managed marker has unexpected plugin ID '$($marker.pluginId)'"
    }

    $targetMap = Get-RuntimeMap -Root $Target
    $sourceNames = @($SourceMap.Keys)
    $targetNames = @($targetMap.Keys)
    $missing = @($sourceNames | Where-Object { -not $targetMap.Contains($_) })
    $extra = @($targetNames | Where-Object { -not $SourceMap.Contains($_) })
    $changed = @($sourceNames | Where-Object { $targetMap.Contains($_) -and $SourceMap[$_] -ne $targetMap[$_] })
    if ($missing.Count -or $extra.Count -or $changed.Count) {
        throw "$Label runtime drift. Missing=[$($missing -join ', ')]; Extra=[$($extra -join ', ')]; Changed=[$($changed -join ', ')]"
    }

    [pscustomobject]@{
        Surface = $Label
        Version = $targetManifest.version
        Files = $targetMap.Count
        Status = 'MATCH'
        Path = $Target
    }
}

function Assert-CliRegistration {
    param(
        [Parameter(Mandatory)]$SourceManifest,
        [Parameter(Mandatory)]$SourceMap
    )

    $agy = Get-Command agy -ErrorAction Stop
    $rawList = & $agy.Source plugin list 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "agy plugin list failed: $rawList" }
    try { $list = $rawList | ConvertFrom-Json }
    catch { throw "agy plugin list did not return valid JSON: $rawList" }
    $registration = @($list.imports | Where-Object { $_.name -eq $pluginId })
    if ($registration.Count -ne 1) {
        throw "CLI registration for $pluginId was not found exactly once."
    }
    if ('skills' -notin @($registration[0].components)) {
        throw "CLI registration does not include skills: $($registration[0].components -join ', ')"
    }

    $configPath = Join-Path $configRoot 'config.json'
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $pluginSetting = $config.plugins.PSObject.Properties[$pluginId]
    if ($null -eq $pluginSetting -or $pluginSetting.Value.enabled -ne $true) {
        throw "CLI plugin $pluginId is not enabled in $configPath"
    }

    $null = Compare-Surface -Label 'CLI shared runtime' -Target $appRoot -SourceManifest $SourceManifest -SourceMap $SourceMap
    [pscustomobject]@{
        Surface = 'CLI'
        Version = $SourceManifest.version
        Files = $SourceMap.Count
        Status = 'REGISTERED/MATCH'
        Path = "$appRoot (shared runtime)"
    }
}

$sourceManifest = Assert-Manifest -Root $sourceRoot
$sourceMap = Get-RuntimeMap -Root $sourceRoot
if ($sourceMap.Count -eq 0) {
    throw 'No runtime files found in source.'
}

$rows = [System.Collections.Generic.List[object]]::new()
$rows.Add([pscustomobject]@{
    Surface = 'Source'
    Version = $sourceManifest.version
    Files = $sourceMap.Count
    Status = 'VALID'
    Path = $sourceRoot
})

if ($Surface -in @('App', 'All')) {
    $rows.Add((Compare-Surface -Label 'App' -Target $appRoot -SourceManifest $sourceManifest -SourceMap $sourceMap))
}
if ($Surface -in @('Cli', 'All')) {
    $rows.Add((Assert-CliRegistration -SourceManifest $sourceManifest -SourceMap $sourceMap))
}

$rows | Format-Table -AutoSize
Write-Output "Runtime checksum verification passed for surface: $Surface"
