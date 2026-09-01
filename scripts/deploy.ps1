[CmdletBinding()]
param(
    [ValidateSet('App', 'Cli', 'All')]
    [string]$Surface = 'All'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$pluginId = 'superpowers-lite'
$expectedSource = [System.IO.Path]::GetFullPath('D:\Antigravity Plugin\superpowers-lite')
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
    param(
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Parent,
        [Parameter(Mandatory)][string]$ExpectedName
    )
    $targetFull = [System.IO.Path]::GetFullPath($Target)
    $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\')
    if ((Split-Path -Parent $targetFull).TrimEnd('\') -ne $parentFull -or (Split-Path -Leaf $targetFull) -ne $ExpectedName) {
        throw "Refusing unsafe target path: $targetFull"
    }
}

function Copy-DirectoryContents {
    param(
        [Parameter(Mandatory)][string]$From,
        [Parameter(Mandatory)][string]$To
    )
    New-Item -ItemType Directory -Path $To -Force | Out-Null
    Get-ChildItem -LiteralPath $From -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $To -Recurse -Force
    }
}

function Get-RuntimeFiles {
    param([Parameter(Mandatory)][string]$Root)

    $paths = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    foreach ($relative in @('plugin.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md')) {
        $path = Join-Path $Root $relative
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Required runtime file is missing: $path"
        }
        $paths.Add((Get-Item -LiteralPath $path))
    }
    foreach ($directory in @('rules', 'skills')) {
        $path = Join-Path $Root $directory
        if (-not (Test-Path -LiteralPath $path -PathType Container)) {
            throw "Required runtime directory is missing: $path"
        }
        Get-ChildItem -LiteralPath $path -Recurse -File | ForEach-Object { $paths.Add($_) }
    }
    return $paths | Sort-Object FullName
}

function Backup-Target {
    param(
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Label
    )
    if (-not (Test-Path -LiteralPath $Target -PathType Container)) {
        return $null
    }
    $destination = Join-Path $backupRoot "$Label\$pluginId"
    Copy-DirectoryContents -From $Target -To $destination
    Write-Host "Backed up $Label target to $destination"
    return $destination
}

function Backup-CliState {
    $destination = Join-Path $backupRoot 'Cli'
    $stateFiles = @(
        (Join-Path $env:USERPROFILE '.gemini\config\import_manifest.json'),
        (Join-Path $env:USERPROFILE '.gemini\config\config.json')
    )
    $copied = $false
    foreach ($stateFile in $stateFiles) {
        if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
            New-Item -ItemType Directory -Path $destination -Force | Out-Null
            Copy-Item -LiteralPath $stateFile -Destination $destination -Force
            $copied = $true
        }
    }
    if ($copied) {
        Write-Host "Backed up CLI registration state to $destination"
        return $destination
    }
    return $null
}

if ($sourceRoot.TrimEnd('\') -ne $expectedSource.TrimEnd('\')) {
    throw "Source must be exactly $expectedSource; found $sourceRoot"
}
Assert-ExactChildPath -Target $appTarget -Parent $appPluginsRoot -ExpectedName $pluginId

$manifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'plugin.json') -Raw | ConvertFrom-Json
if ($manifest.name -ne $pluginId) {
    throw "Manifest name must be '$pluginId'; found '$($manifest.name)'"
}

$node = Get-Command node -ErrorAction Stop
$agy = Get-Command agy -ErrorAction Stop
& $node.Source (Join-Path $sourceRoot 'tests\validate.mjs')
if ($LASTEXITCODE -ne 0) { throw "Custom validator failed with exit code $LASTEXITCODE" }
& $agy.Source plugin validate $sourceRoot
if ($LASTEXITCODE -ne 0) { throw "agy plugin validate failed with exit code $LASTEXITCODE" }

$appBackup = Backup-Target -Target $appTarget -Label 'App'
$cliBackup = $null
if ($Surface -in @('Cli', 'All')) { $cliBackup = Backup-CliState }
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

$sourceBase = $sourceRoot.TrimEnd('\')
$checksums = [System.Collections.Generic.List[object]]::new()
foreach ($file in Get-RuntimeFiles -Root $sourceRoot) {
    $relativeNative = $file.FullName.Substring($sourceBase.Length + 1)
    $relative = $relativeNative.Replace('\', '/')
    $destination = Join-Path $buildRoot $relativeNative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    $checksums.Add([ordered]@{
        path = $relative
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    })
}

$checksumDocument = [ordered]@{
    pluginId = $pluginId
    version = $manifest.version
    algorithm = 'SHA-256'
    files = $checksums
}
$checksumDocument | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $buildRoot '.superpowers-lite-checksums.json') -Encoding utf8NoBOM

$marker = [ordered]@{
    pluginId = $pluginId
    version = $manifest.version
    managedBy = 'D:\Antigravity Plugin\superpowers-lite\scripts\deploy.ps1'
    source = $sourceRoot
    deployedAt = (Get-Date).ToUniversalTime().ToString('o')
    appBackup = $appBackup
    cliBackup = $cliBackup
}
$marker | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $buildRoot '.superpowers-lite-managed.json') -Encoding utf8NoBOM

try {
    # agy 1.1.23 imports Antigravity plugins from the App config runtime.
    # Therefore every surface uses this one staged runtime copy; CLI state is
    # still registered/enabled separately through agy.
    if ($Surface -in @('App', 'Cli', 'All')) {
        New-Item -ItemType Directory -Path $appPluginsRoot -Force | Out-Null
        $appStage = Join-Path $appPluginsRoot ".$pluginId.stage-$([guid]::NewGuid().ToString('N'))"
        Assert-ExactChildPath -Target $appStage -Parent $appPluginsRoot -ExpectedName (Split-Path -Leaf $appStage)
        Copy-DirectoryContents -From $buildRoot -To $appStage
        if (Test-Path -LiteralPath $appTarget) {
            Remove-Item -LiteralPath $appTarget -Recurse -Force
        }
        Move-Item -LiteralPath $appStage -Destination $appTarget
        Write-Output "Deployed shared Antigravity runtime: $appTarget"
    }

    if ($Surface -in @('Cli', 'All')) {
        & $agy.Source plugin install $buildRoot
        if ($LASTEXITCODE -ne 0) { throw "agy plugin install failed with exit code $LASTEXITCODE" }
        & $agy.Source plugin enable $pluginId
        if ($LASTEXITCODE -ne 0) { throw "agy plugin enable failed with exit code $LASTEXITCODE" }
        Write-Output "Registered and enabled CLI surface using shared runtime: $appTarget"
    }

    $verifySurface = if ($Surface -eq 'App') { 'App' } elseif ($Surface -eq 'Cli') { 'Cli' } else { 'All' }
    & (Join-Path $scriptRoot 'verify-install.ps1') -Surface $verifySurface
    if ($LASTEXITCODE -ne 0) { throw "Install verification failed with exit code $LASTEXITCODE" }
}
finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        $resolvedStaging = [System.IO.Path]::GetFullPath($stagingRoot)
        $allowedStagingParent = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.deploy-staging')).TrimEnd('\')
        if ((Split-Path -Parent $resolvedStaging).TrimEnd('\') -eq $allowedStagingParent) {
            Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
        }
    }
}

if (Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue) {
    Write-Warning 'Antigravity App is running. Restart it and create a new conversation before App smoke testing.'
}
Write-Output "Deployment complete: $Surface, version $($manifest.version), $($checksums.Count) runtime files."
