[CmdletBinding()]
param(
    [ValidateSet('Source', 'App', 'Cli', 'All')][string]$Surface = 'All',
    [ValidateSet('Lite', 'Strict')][string]$Profile = 'Lite'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $PSCommandPath
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot '..'))
$pluginId = 'superpowers-lite'
$appRoot = Join-Path $env:USERPROFILE '.gemini\config\plugins\superpowers-lite'
$cliCandidate = Join-Path $env:USERPROFILE '.gemini\antigravity-cli\plugins\superpowers-lite'
$configRoot = Join-Path $env:USERPROFILE '.gemini\config'
$agy = Get-Command agy -ErrorAction Stop
$agyVersion = (& $agy.Source --version 2>&1 | Out-String).Trim()

function Get-ChecksumDocument {
    param([string]$Root)
    $path = Join-Path $Root '.superpowers-lite-checksums.json'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing checksum document: $path" }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Assert-Runtime {
    param([string]$Label, [string]$Root, $Expected)
    if (-not (Test-Path -LiteralPath $Root -PathType Container)) { throw "$Label runtime is missing: $Root" }
    $manifest = Get-Content -LiteralPath (Join-Path $Root 'plugin.json') -Raw | ConvertFrom-Json
    if ($manifest.name -ne $pluginId) { throw "$Label has unexpected plugin '$($manifest.name)'." }
    if ($manifest.version -ne $Expected.version) { throw "$Label version mismatch: $($manifest.version) != $($Expected.version)" }
    $actual = Get-ChecksumDocument -Root $Root
    if ($actual.profile -ne $Profile) { throw "$Label profile mismatch: $($actual.profile) != $Profile" }
    $expectedMap = @{}; foreach ($item in $Expected.files) { $expectedMap[$item.path] = $item.sha256 }
    $actualMap = @{}; foreach ($item in $actual.files) { $actualMap[$item.path] = $item.sha256 }
    $missing = @($expectedMap.Keys | Where-Object { -not $actualMap.ContainsKey($_) })
    $extra = @($actualMap.Keys | Where-Object { -not $expectedMap.ContainsKey($_) })
    $changed = @($expectedMap.Keys | Where-Object { $actualMap.ContainsKey($_) -and $actualMap[$_] -ne $expectedMap[$_] })
    foreach ($item in $actual.files) {
        $file = Join-Path $Root $item.path
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { $missing += $item.path; continue }
        $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($hash -ne $item.sha256) { $changed += $item.path }
    }
    $diskMap = @{}
    $rootBase = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
    Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Where-Object {
        $_.Name -notin @('.superpowers-lite-checksums.json', '.superpowers-lite-managed.json')
    } | ForEach-Object {
        $relative = $_.FullName.Substring($rootBase.Length + 1).Replace('\', '/')
        $diskMap[$relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $missing += @($expectedMap.Keys | Where-Object { -not $diskMap.ContainsKey($_) })
    $extra += @($diskMap.Keys | Where-Object { -not $expectedMap.ContainsKey($_) })
    $changed += @($expectedMap.Keys | Where-Object { $diskMap.ContainsKey($_) -and $diskMap[$_] -ne $expectedMap[$_] })
    if ($Profile -eq 'Lite' -and ((Test-Path -LiteralPath (Join-Path $Root 'hooks.json')) -or (Test-Path -LiteralPath (Join-Path $Root 'hooks') -PathType Container))) {
        $extra += 'Strict hook files present in Lite runtime'
    }
    if ($Profile -eq 'Strict' -and (-not (Test-Path -LiteralPath (Join-Path $Root 'hooks.json') -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $Root 'hooks\strict-gate.mjs') -PathType Leaf))) {
        $missing += 'Strict hook files'
    }
    $missing = @($missing | Sort-Object -Unique)
    $extra = @($extra | Sort-Object -Unique)
    $changed = @($changed | Sort-Object -Unique)
    if ($missing.Count -or $extra.Count -or $changed.Count) {
        throw "$Label runtime drift. Missing=[$($missing -join ', ')]; Extra=[$($extra -join ', ')]; Changed=[$($changed -join ', ')]"
    }
    $markerPath = Join-Path $Root '.superpowers-lite-managed.json'
    if ($Label -ne 'Source build' -and -not (Test-Path -LiteralPath $markerPath -PathType Leaf)) { throw "$Label managed marker is missing." }
    if ($Label -ne 'Source build') {
        $marker = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
        if ($marker.name -ne $pluginId -or $marker.pluginId -ne $pluginId) { throw "$Label managed marker plugin identity is invalid." }
        if ($marker.version -ne $manifest.version) { throw "$Label managed marker version mismatch." }
        if ($marker.profile -ne $Profile) { throw "$Label managed marker profile mismatch." }
    }
    [pscustomobject]@{ Surface = $Label; Version = $manifest.version; Profile = $Profile; Files = $actual.files.Count; Status = 'MATCH'; Path = $Root }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-verify-$([guid]::NewGuid().ToString('N'))"
try {
    & (Join-Path $scriptRoot 'build-runtime.ps1') -SourceRoot $sourceRoot -OutputRoot $tempRoot -Profile $Profile -InstalledRuntimeRoot $appRoot | Out-Null
    $expected = Get-ChecksumDocument -Root $tempRoot
    $rows = [System.Collections.Generic.List[object]]::new()
    $sourceManifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'plugin.json') -Raw | ConvertFrom-Json
    $rows.Add([pscustomobject]@{ Surface = 'Source'; Version = $sourceManifest.version; Profile = $Profile; Files = $expected.files.Count; Status = 'VALID'; Path = $sourceRoot })

    if ($Surface -in @('App', 'All')) { $rows.Add((Assert-Runtime -Label 'App' -Root $appRoot -Expected $expected)) }
    if ($Surface -in @('Cli', 'All')) {
        $rawList = & $agy.Source plugin list 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "agy plugin list failed: $rawList" }
        $list = $rawList | ConvertFrom-Json
        $registration = @($list.imports | Where-Object name -eq $pluginId)
        if ($registration.Count -ne 1) { throw 'CLI registration was not found exactly once.' }
        $registrationSource = [string]$registration[0].source
        if ('skills' -notin @($registration[0].components)) { throw 'CLI registration does not include skills.' }
        $cliRoot = if ($registrationSource -eq 'antigravity') { $appRoot } elseif (Test-Path -LiteralPath $cliCandidate -PathType Container) { $cliCandidate } else { throw "CLI runtime for registration source '$registrationSource' could not be resolved." }

        $configPath = Join-Path $configRoot 'config.json'
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        $setting = $config.plugins.PSObject.Properties[$pluginId]
        if ($null -eq $setting -or $setting.Value.enabled -ne $true) { throw "CLI plugin is not enabled in $configPath" }
        $row = Assert-Runtime -Label 'CLI' -Root $cliRoot -Expected $expected
        $row | Add-Member -NotePropertyName RegistrationSource -NotePropertyValue $registrationSource
        $rows.Add($row)
    }

    $rows | Format-Table -AutoSize
    Write-Output "Antigravity CLI version: $agyVersion"
    Write-Output "Runtime checksum verification passed: surface=$Surface, profile=$Profile"
}
finally {
    if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
