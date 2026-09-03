[CmdletBinding()]
param(
    [ValidateRange(1, 10)]
    [int]$Runs = 2,
    [string[]]$Scenario,
    [ValidateSet('Critical', 'All', 'Strict')]
    [string]$Suite = 'Critical',
    [ValidateSet('Lite', 'Strict')]
    [string]$Profile = 'Lite',
    [string]$Model = 'gemini-3.8-flash-high',
    [ValidateRange(1, 30)]
    [int]$TimeoutMinutes = 8,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$testRoot = Split-Path -Parent $PSCommandPath
$fixtureRoot = Join-Path $testRoot 'fixtures'
$pluginRoot = [System.IO.Path]::GetFullPath((Join-Path $testRoot '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $pluginRoot '..'))
$resultRoot = Join-Path $workspaceRoot ".behavior-results\$(Get-Date -Format 'yyyyMMdd-HHmmss-fff')"
$scenarioIndex = Join-Path $testRoot 'scenarios\index.mjs'
$assertRunner = Join-Path $testRoot 'assert-run.mjs'
$model = $Model

$node = Get-Command node -ErrorAction Stop
$agy = Get-Command agy -ErrorAction Stop
$availableModels = @(& $agy.Source models 2>&1 | ForEach-Object { $_.ToString().Split("`t")[0].Trim() })
if ($LASTEXITCODE -ne 0 -or $model -notin $availableModels) {
    throw "Requested model '$model' is not available. Run 'agy models' to inspect installed models."
}
$allScenarios = @(& $node.Source $scenarioIndex --list | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0) { throw 'Could not load scenario definitions.' }

if ($Scenario) {
    foreach ($name in $Scenario) {
        if (-not ($allScenarios | Where-Object name -eq $name)) { throw "Unknown scenario: $name" }
    }
    $selected = @($allScenarios | Where-Object { $_.name -in $Scenario })
}
else {
    $selected = @($allScenarios | Where-Object { $Suite -in @($_.suite) })
}
if ($selected.Count -eq 0) { throw "No scenarios selected for suite '$Suite'." }

if ($DryRun) {
    Write-Output "DRY RUN: model=$model, effort=high, suite=$Suite, profile=$Profile, runs=$Runs"
    foreach ($definition in $selected) {
        $fixture = Join-Path $fixtureRoot $definition.fixture
        if (-not (Test-Path -LiteralPath $fixture -PathType Container)) { throw "Missing fixture: $fixture" }
        $turns = if ($definition.PSObject.Properties.Name -contains 'turns') { @($definition.turns) } else { @([pscustomobject]@{ prompt = $definition.prompt }) }
        for ($turnIndex = 0; $turnIndex -lt $turns.Count; $turnIndex++) {
            Write-Output "[$($definition.name) turn $($turnIndex + 1)] $($turns[$turnIndex].prompt)"
        }
    }
    Write-Output 'No model calls or fixture changes were made.'
    exit 0
}

New-Item -ItemType Directory -Path $resultRoot -Force | Out-Null
$results = [System.Collections.Generic.List[object]]::new()

function Remove-DisposableFixture {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
    $resolved = [System.IO.Path]::GetFullPath($Path)
    if ((Split-Path -Parent $resolved).TrimEnd('\') -ne $tempParent -or (Split-Path -Leaf $resolved) -notlike 'superpowers-lite-*') {
        throw "Refusing to remove non-disposable path: $resolved"
    }
    for ($attempt = 1; $attempt -le 6; $attempt++) {
        try { Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop; return }
        catch {
            if ($attempt -eq 6) { Write-Warning "Could not remove disposable fixture: $resolved" }
            else { Start-Sleep -Milliseconds 500 }
        }
    }
}

foreach ($definition in $selected) {
    $fixture = Join-Path $fixtureRoot $definition.fixture
    if (-not (Test-Path -LiteralPath $fixture -PathType Container)) { throw "Missing fixture: $fixture" }

    for ($run = 1; $run -le $Runs; $run++) {
        $caseRoot = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-$($definition.name)-$run-$([guid]::NewGuid().ToString('N'))"
        $runRoot = Join-Path $resultRoot "$($definition.name)\run-$run"
        New-Item -ItemType Directory -Path $caseRoot, $runRoot -Force | Out-Null
        Get-ChildItem -LiteralPath $fixture -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $caseRoot -Recurse -Force
        }

        try {
            Push-Location $caseRoot
            try {
                git init -q
                git config user.email 'fixture@superpowers-lite.local'
                git config user.name 'Superpowers Lite Fixture'
                git add .
                git commit -q -m 'fixture baseline'

                if ($definition.PSObject.Properties.Name -contains 'seedCandidate' -and $definition.seedCandidate -eq $true) {
                    $candidate = "export function discountedTotal(total) {`n  return total > 100 ? total * 0.9 : total;`n}`n"
                    Set-Content -LiteralPath (Join-Path $caseRoot 'src\discount.mjs') -Value $candidate -Encoding utf8NoBOM
                }
                if ($definition.PSObject.Properties.Name -contains 'seedCallPathCandidate' -and $definition.seedCallPathCandidate -eq $true) {
                    Set-Content -LiteralPath (Join-Path $caseRoot 'src\tax.mjs') -Value "export const addTax = (dollars) => dollars * 110;`n" -Encoding utf8NoBOM
                }
                if ($definition.PSObject.Properties.Name -contains 'seedPreExisting') {
                    $seedPath = Join-Path $caseRoot $definition.seedPreExisting.path
                    Set-Content -LiteralPath $seedPath -Value $definition.seedPreExisting.content -Encoding utf8NoBOM
                }

                $turns = if ($definition.PSObject.Properties.Name -contains 'turns') { @($definition.turns) } else { @([pscustomobject]@{ prompt = $definition.prompt }) }
                $conversationId = $null
                $cliExits = [System.Collections.Generic.List[int]]::new()
                for ($turnIndex = 0; $turnIndex -lt $turns.Count; $turnIndex++) {
                    $turn = $turns[$turnIndex]
                    $turnNumber = $turnIndex + 1
                    $turnRoot = if ($turns.Count -gt 1) { Join-Path $runRoot "turn-$turnNumber" } else { $runRoot }
                    New-Item -ItemType Directory -Path $turnRoot -Force | Out-Null
                    $schemaName = if ($turn.PSObject.Properties.Name -contains 'schema') { $turn.schema } else { 'final-report.schema.json' }
                    $turnSchema = Join-Path $testRoot "schemas\$schemaName"
                    if (-not (Test-Path -LiteralPath $turnSchema -PathType Leaf)) { throw "Missing turn schema: $turnSchema" }
                    Write-Output "[$($definition.name) run $run/$Runs turn $turnNumber/$($turns.Count)] invoking $model ($Profile)"
                    $baseArgs = @('--add-dir', $caseRoot, '--model', $model, '--effort', 'high', '--mode', 'accept-edits', '--dangerously-skip-permissions', '--output-format', 'stream-json', '--json-schema', $turnSchema, '--print-timeout', "${TimeoutMinutes}m", '--print', $turn.prompt)
                    $invokeArgs = if ($turnIndex -eq 0) { @('--new-project') + $baseArgs } else { @('--conversation', $conversationId) + $baseArgs }
                    $rawLines = @()
                    $cliExit = 1
                    for ($attempt = 1; $attempt -le 3; $attempt++) {
                        $rawLines = @(& $agy.Source @invokeArgs 2>&1 | ForEach-Object { $_.ToString() })
                        $cliExit = $LASTEXITCODE
                        $rawText = $rawLines -join "`n"
                        $transient = $cliExit -ne 0 -and $rawText -match '(?i)(service is currently unavailable|eligibility check failed.*(?:UNAVAILABLE|429|503)|RESOURCE_EXHAUSTED)'
                        if (-not $transient -or $attempt -eq 3) { break }
                        $attemptPath = Join-Path $turnRoot "raw-attempt-$attempt.ndjson"
                        [System.IO.File]::WriteAllText($attemptPath, ($rawText + "`n"), [System.Text.UTF8Encoding]::new($false))
                        Write-Warning "Transient Antigravity service failure on attempt $attempt/3; retrying this turn."
                        Start-Sleep -Seconds 3
                    }
                    $cliExits.Add($cliExit)
                    $rawPath = Join-Path $turnRoot 'raw.ndjson'
                    [System.IO.File]::WriteAllText($rawPath, (($rawLines -join "`n") + "`n"), [System.Text.UTF8Encoding]::new($false))
                    $resultEvents = @($rawLines | ForEach-Object {
                        try { $_ | ConvertFrom-Json -ErrorAction Stop } catch { $null }
                    } | Where-Object { $null -ne $_ -and $_.event -eq 'result' })
                    if ($resultEvents.Count -gt 0) { $conversationId = $resultEvents[-1].result.conversation_id }
                    if ($turnIndex -lt ($turns.Count - 1) -and [string]::IsNullOrWhiteSpace($conversationId)) {
                        throw "Turn $turnNumber did not return a conversation ID for resume."
                    }
                }
            }
            finally { Pop-Location }

            $exitJson = ConvertTo-Json @($cliExits) -Compress
            $assertJson = & $node.Source $assertRunner $definition.name $caseRoot $runRoot $exitJson 2>&1 | Out-String
            $assertExit = $LASTEXITCODE
            $assertionPath = Join-Path $runRoot 'assertions.json'
            $assertions = if (Test-Path -LiteralPath $assertionPath) { Get-Content -LiteralPath $assertionPath -Raw | ConvertFrom-Json } else { $null }
            $passed = $assertExit -eq 0 -and $null -ne $assertions -and $assertions.passed -eq $true
            $results.Add([pscustomobject]@{
                scenario = $definition.name
                run = $run
                passed = $passed
                cliExitCode = @($cliExits)
                assertionExitCode = $assertExit
            })
            if ($passed) { Write-Output "PASS [$($definition.name) run $run]" }
            else {
                Write-Warning "FAIL [$($definition.name) run $run]"
                if ($assertions) {
                    @($assertions.checks | Where-Object { -not $_.passed }) | ForEach-Object { Write-Warning "  $($_.check): $($_.evidence)" }
                }
                else { Write-Warning $assertJson.Trim() }
            }
        }
        finally { Remove-DisposableFixture -Path $caseRoot }
    }
}

$summary = [ordered]@{
    model = $model
    effort = 'high'
    suite = $Suite
    profile = $Profile
    runsPerScenario = $Runs
    passed = @($results | Where-Object passed).Count
    failed = @($results | Where-Object { -not $_.passed }).Count
    total = $results.Count
    results = @($results)
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $resultRoot 'summary.json') -Encoding utf8NoBOM
Write-Output "Behavior results: $resultRoot"
Write-Output "Passed $($summary.passed)/$($summary.total); failed $($summary.failed)."
if ($summary.failed -gt 0) { exit 1 }
