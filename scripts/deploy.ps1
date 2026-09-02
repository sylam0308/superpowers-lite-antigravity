[CmdletBinding()]
param(
    [ValidateSet('App', 'Cli', 'All')][string]$Surface = 'All',
    [ValidateSet('Lite', 'Strict')][string]$Profile = 'Lite'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$pluginId = 'superpowers-lite'
$scriptRoot = Split-Path -Parent $PSCommandPath
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $sourceRoot '..'))
$appPluginsRoot = Join-Path $env:USERPROFILE '.gemini\config\plugins'
$appTarget = Join-Path $appPluginsRoot $pluginId
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupRoot = Join-Path $workspaceRoot ".deploy-backups\$timestamp"
$stagingRoot = Join-Path $workspaceRoot ".deploy-staging\$([guid]::NewGuid().ToString('N'))"
$buildRoot = Join-Path $stagingRoot $pluginId

function Assert-ExactChildPath {
    param([string]$Target, [string]$Parent, [string]$ExpectedName)
    $targetFull = [System.IO.Path]::GetFullPath($Target)
    $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\')
    if ((Split-Path -Parent $targetFull).TrimEnd('\') -ne $parentFull -or (Split-Path -Leaf $targetFull) -ne $ExpectedName) {
        throw "Refusing unsafe target path: $targetFull"
    }
}

function Copy-DirectoryContents {
    param([string]$From, [string]$To)
    New-Item -ItemType Directory -Path $To -Force | Out-Null
    Get-ChildItem -LiteralPath $From -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $To -Recurse -Force }
}

function Backup-Directory {
    param([string]$Target, [string]$Label)
    if (-not (Test-Path -LiteralPath $Target -PathType Container)) { return $null }
    $destination = Join-Path $backupRoot "$Label\$pluginId"
    Copy-DirectoryContents -From $Target -To $destination
    Write-Output "Backed up $Label target to $destination"
    return $destination
}

function Backup-CliState {
    $destination = Join-Path $backupRoot 'Cli-state'
    $copied = $false
    foreach ($file in @((Join-Path $env:USERPROFILE '.gemini\config\import_manifest.json'), (Join-Path $env:USERPROFILE '.gemini\config\config.json'))) {
        if (Test-Path -LiteralPath $file -PathType Leaf) {
            New-Item -ItemType Directory -Path $destination -Force | Out-Null
            Copy-Item -LiteralPath $file -Destination $destination -Force
            $copied = $true
        }
    }
    if ($copied) { return $destination }
    return $null
}

Assert-ExactChildPath -Target $appTarget -Parent $appPluginsRoot -ExpectedName $pluginId
$manifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'plugin.json') -Raw | ConvertFrom-Json
if ($manifest.name -ne $pluginId) { throw "Manifest name must be '$pluginId'." }
$node = Get-Command node -ErrorAction Stop
$agy = Get-Command agy -ErrorAction Stop
$agyVersion = (& $agy.Source --version 2>&1 | Out-String).Trim()
Write-Output "Antigravity CLI version: $agyVersion"

& $node.Source (Join-Path $sourceRoot 'tests\validate.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Custom validator failed.' }
& $agy.Source plugin validate $sourceRoot
if ($LASTEXITCODE -ne 0) { throw 'Source plugin validation failed.' }

$appBackup = Backup-Directory -Target $appTarget -Label 'App'
$cliStateBackup = if ($Surface -in @('Cli', 'All')) { Backup-CliState } else { $null }
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

try {
    & (Join-Path $scriptRoot 'build-runtime.ps1') -SourceRoot $sourceRoot -OutputRoot $buildRoot -Profile $Profile -InstalledRuntimeRoot $appTarget
    if ($LASTEXITCODE -ne 0) { throw 'Runtime build failed.' }
    & $agy.Source plugin validate $buildRoot
    if ($LASTEXITCODE -ne 0) { throw 'Built runtime validation failed.' }

    $marker = [ordered]@{
        pluginId = $pluginId
        version = $manifest.version
        profile = $Profile
        managedBy = $PSCommandPath
        source = $sourceRoot
        deployedAt = (Get-Date).ToUniversalTime().ToString('o')
        agyVersion = $agyVersion
        appBackup = $appBackup
        cliStateBackup = $cliStateBackup
    }
    $marker | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $buildRoot '.superpowers-lite-managed.json') -Encoding utf8NoBOM

    if ($Surface -in @('App', 'Cli', 'All')) {
        New-Item -ItemType Directory -Path $appPluginsRoot -Force | Out-Null
        $stageName = ".$pluginId.stage-$([guid]::NewGuid().ToString('N'))"
        $appStage = Join-Path $appPluginsRoot $stageName
        Assert-ExactChildPath -Target $appStage -Parent $appPluginsRoot -ExpectedName $stageName
        Copy-DirectoryContents -From $buildRoot -To $appStage
        if (Test-Path -LiteralPath $appTarget) { Remove-Item -LiteralPath $appTarget -Recurse -Force }
        Move-Item -LiteralPath $appStage -Destination $appTarget
        Write-Output "Deployed App runtime: $appTarget"
    }

    if ($Surface -in @('Cli', 'All')) {
        # Never install from the final App target: agy may stage the source onto
        # itself and truncate files. Install from the disposable build instead.
        & $agy.Source plugin install $buildRoot
        if ($LASTEXITCODE -ne 0) { throw 'CLI plugin install failed.' }
        & $agy.Source plugin enable $pluginId
        if ($LASTEXITCODE -ne 0) { throw 'CLI plugin enable failed.' }
    }

    & (Join-Path $scriptRoot 'verify-install.ps1') -Surface $Surface -Profile $Profile
    if ($LASTEXITCODE -ne 0) { throw 'Install verification failed.' }
}
finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        $resolved = [System.IO.Path]::GetFullPath($stagingRoot)
        $allowedParent = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.deploy-staging')).TrimEnd('\')
        if ((Split-Path -Parent $resolved).TrimEnd('\') -eq $allowedParent) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    }
}

if (Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue) {
    Write-Warning 'Antigravity App is running. Restart it and create a new conversation before App smoke testing.'
}
Write-Output "Deployment complete: surface=$Surface, profile=$Profile, version=$($manifest.version), agy=$agyVersion"
