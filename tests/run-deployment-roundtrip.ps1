[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$testRoot = Split-Path -Parent $PSCommandPath
$pluginRoot = [System.IO.Path]::GetFullPath((Join-Path $testRoot '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $pluginRoot '..'))
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.deploy-backups'))
$originalUserProfile = $env:USERPROFILE
$testProfile = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-deploy-$([guid]::NewGuid().ToString('N'))"
$target = Join-Path $testProfile '.gemini\config\plugins\superpowers-lite'
$backupTimestampRoot = $null

try {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $target 'old-sentinel.txt') -Value 'restore-me' -Encoding utf8NoBOM
    $env:USERPROFILE = $testProfile

    & (Join-Path $pluginRoot 'scripts\deploy.ps1') -Surface App -Profile Lite | Out-Host
    $markerPath = Join-Path $target '.superpowers-lite-managed.json'
    $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
    if ($marker.appBackup -isnot [string]) { throw 'Roundtrip marker appBackup is not a scalar string.' }
    if ($marker.name -ne 'superpowers-lite' -or $marker.version -ne '0.5.0' -or $marker.profile -ne 'Lite') {
        throw 'Roundtrip marker identity/version/profile is invalid.'
    }
    $backup = [System.IO.Path]::GetFullPath([string]$marker.appBackup)
    if (-not (Test-Path -LiteralPath (Join-Path $backup 'old-sentinel.txt') -PathType Leaf)) { throw 'Roundtrip backup does not contain the previous target.' }
    $backupTimestampRoot = Split-Path -Parent (Split-Path -Parent $backup)

    $extra = Join-Path $target 'hooks.json'
    Set-Content -LiteralPath $extra -Value '{}' -Encoding utf8NoBOM
    $driftDetected = $false
    try { & (Join-Path $pluginRoot 'scripts\verify-install.ps1') -Surface App -Profile Lite | Out-Host }
    catch { $driftDetected = $true }
    if (-not $driftDetected) { throw 'Lite verifier did not reject an extra hooks.json file.' }
    Remove-Item -LiteralPath $extra -Force

    & (Join-Path $pluginRoot 'scripts\undeploy.ps1') -Surface App -Apply | Out-Host
    $sentinel = Join-Path $target 'old-sentinel.txt'
    if (-not (Test-Path -LiteralPath $sentinel -PathType Leaf)) { throw 'Roundtrip did not restore the old target.' }
    if ((Get-Content -LiteralPath $sentinel -Raw).Trim() -ne 'restore-me') { throw 'Roundtrip restored sentinel content is wrong.' }
    if (Test-Path -LiteralPath (Join-Path $target '.superpowers-lite-managed.json')) { throw 'Managed runtime remained after rollback.' }
    Write-Output 'Deployment roundtrip passed: scalar marker, extra-file detection, and App backup restore.'
}
finally {
    $env:USERPROFILE = $originalUserProfile
    if (Test-Path -LiteralPath $testProfile) { Remove-Item -LiteralPath $testProfile -Recurse -Force }
    if ($backupTimestampRoot) {
        $resolved = [System.IO.Path]::GetFullPath($backupTimestampRoot)
        $parent = [System.IO.Path]::GetFullPath((Split-Path -Parent $resolved)).TrimEnd('\')
        if ($parent -eq $backupRoot.TrimEnd('\') -and (Split-Path -Leaf $resolved) -match '^\d{8}-\d{9}$' -and (Test-Path -LiteralPath $resolved)) {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        }
    }
}
