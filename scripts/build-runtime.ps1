[CmdletBinding()]
param(
    [string]$SourceRoot,
    [Parameter(Mandatory)][string]$OutputRoot,
    [ValidateSet('Lite', 'Strict')][string]$Profile = 'Lite',
    [string]$InstalledRuntimeRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $PSCommandPath
if (-not $SourceRoot) { $SourceRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..')) }
else { $SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot) }
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
if (-not $InstalledRuntimeRoot) { $InstalledRuntimeRoot = $OutputRoot }
$InstalledRuntimeRoot = [System.IO.Path]::GetFullPath($InstalledRuntimeRoot)

$manifest = Get-Content -LiteralPath (Join-Path $SourceRoot 'plugin.json') -Raw | ConvertFrom-Json
if ($manifest.name -ne 'superpowers-lite') { throw "Manifest name must be superpowers-lite; found '$($manifest.name)'." }
if (Test-Path -LiteralPath $OutputRoot) { Remove-Item -LiteralPath $OutputRoot -Recurse -Force }
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

foreach ($relative in @('plugin.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md')) {
    $source = Join-Path $SourceRoot $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing runtime file: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $OutputRoot $relative) -Force
}
foreach ($directory in @('rules', 'skills', 'lib')) {
    $source = Join-Path $SourceRoot $directory
    if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw "Missing runtime directory: $source" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $OutputRoot $directory) -Recurse -Force
}

if ($Profile -eq 'Strict') {
    $hookSource = Join-Path $SourceRoot 'hooks'
    $templatePath = Join-Path $SourceRoot 'profiles\strict\hooks.template.json'
    if (-not (Test-Path -LiteralPath $hookSource -PathType Container)) { throw 'Strict profile hook runtime is missing.' }
    if (-not (Test-Path -LiteralPath $templatePath -PathType Leaf)) { throw 'Strict profile hooks template is missing.' }
    Copy-Item -LiteralPath $hookSource -Destination (Join-Path $OutputRoot 'hooks') -Recurse -Force
    $commandRoot = $InstalledRuntimeRoot.Replace('\', '/')
    $hooks = (Get-Content -LiteralPath $templatePath -Raw).Replace('{{PLUGIN_ROOT}}', $commandRoot)
    Set-Content -LiteralPath (Join-Path $OutputRoot 'hooks.json') -Value $hooks -Encoding utf8NoBOM
}

$runtimeFiles = Get-ChildItem -LiteralPath $OutputRoot -Recurse -File | Where-Object {
    $_.Name -notin @('.superpowers-lite-checksums.json', '.superpowers-lite-managed.json')
} | Sort-Object FullName
$outputBase = $OutputRoot.TrimEnd('\')
$checksums = @($runtimeFiles | ForEach-Object {
    [ordered]@{
        path = $_.FullName.Substring($outputBase.Length + 1).Replace('\', '/')
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
})
$checksumDocument = [ordered]@{
    pluginId = 'superpowers-lite'
    version = $manifest.version
    profile = $Profile
    algorithm = 'SHA-256'
    files = $checksums
}
$checksumDocument | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputRoot '.superpowers-lite-checksums.json') -Encoding utf8NoBOM

[pscustomobject]@{
    Plugin = 'superpowers-lite'
    Version = $manifest.version
    Profile = $Profile
    Files = $checksums.Count
    Output = $OutputRoot
}
