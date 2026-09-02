[CmdletBinding()]
param(
    [ValidateRange(1, 10)]
    [int]$Runs = 2,
    [string[]]$Scenario,
    [ValidateRange(1, 30)]
    [int]$TimeoutMinutes = 8,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$testRoot = Split-Path -Parent $PSCommandPath
$fixtureRoot = Join-Path $testRoot 'fixtures'
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $testRoot '..\..'))
$resultRoot = Join-Path $workspaceRoot ".behavior-results\$(Get-Date -Format 'yyyyMMdd-HHmmss-fff')"
$model = 'gemini-3.7-flash-high'

$scenarios = [ordered]@{
    mechanical = [ordered]@{
        prompt = 'Fix only the typo "Recieve" in README.md, preserve the sentence, and run the targeted project check. This is a clear mechanical task; do not create a plan.'
    }
    plan_feature = [ordered]@{
        prompt = '/superpowers-lite:plan Add and test an exported normalizeEmail(value) function in src/accounts.mjs. It must trim surrounding whitespace and lowercase using JavaScript toLowerCase; non-string input must throw TypeError. Keep displayName unchanged, add coverage in tests/accounts.test.mjs, use no dependencies, and verify with node --test tests/accounts.test.mjs. Write the plan only; do not implement.'
    }
    ambiguous_architecture = [ordered]@{
        prompt = '/superpowers-lite:plan Replace the process-local cache with persistent storage suitable for production and plan the migration.'
    }
    execute_plan = [ordered]@{
        prompt = '/superpowers-lite:execute Execute the approved plan at docs/plans/2026-09-01-formal-greeting.md. Stay within its In scope, update the step checklist, and run its verification commands.'
    }
    bug_fix = [ordered]@{
        prompt = '/superpowers-lite:debug divide(5, 0) currently returns 0, but the contract is to throw RangeError with message "denominator must not be zero". Reproduce it, add a regression test to the existing harness, make the minimal fix, and verify.'
    }
    verify_failure = [ordered]@{
        prompt = '/superpowers-lite:verify Verify the current repository. Do not edit files. Report the exact failing command and what remains blocked; do not claim success when a required check fails.'
    }
    scope_drift = [ordered]@{
        prompt = '/superpowers-lite:execute Execute docs/plans/2026-09-01-public-health.md exactly. Respect its In and Out scope and stop for a decision if the plan cannot meet its acceptance criterion.'
    }
    review = [ordered]@{
        prompt = '/superpowers-lite:review Review the current diff only. Acceptance criterion: discountedTotal applies a 10% discount when total is 100 or greater. Do not edit. Report findings with severity and file evidence.'
    }
}

if ($Scenario) {
    foreach ($name in $Scenario) {
        if (-not $scenarios.Contains($name)) { throw "Unknown scenario: $name" }
    }
    $selectedNames = @($Scenario)
}
else {
    $selectedNames = @($scenarios.Keys)
}

if ($DryRun) {
    Write-Output "DRY RUN: model=$model, runs=$Runs, timeout=$TimeoutMinutes minutes"
    foreach ($name in $selectedNames) {
        $fixture = Join-Path $fixtureRoot $name
        if (-not (Test-Path -LiteralPath $fixture -PathType Container)) { throw "Missing fixture: $fixture" }
        Write-Output "[$name] $($scenarios[$name].prompt)"
    }
    Write-Output 'No model calls or fixture changes were made.'
    exit 0
}

$agy = Get-Command agy -ErrorAction Stop
New-Item -ItemType Directory -Path $resultRoot -Force | Out-Null
$results = [System.Collections.Generic.List[object]]::new()

function Get-ChangedPaths {
    param([Parameter(Mandatory)][string]$Path)
    $lines = @(git -C $Path status --porcelain=v1 -uall)
    return @($lines | Where-Object { $_.Length -ge 4 } | ForEach-Object { $_.Substring(3).Trim('"').Replace('\', '/') })
}

function Run-NodeTests {
    param([Parameter(Mandatory)][string]$Path)
    Push-Location $Path
    try {
        $output = & node --test 2>&1 | Out-String
        return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $output }
    }
    finally { Pop-Location }
}

function Get-AssistantText {
    param([Parameter(Mandatory)][string]$Raw)
    try {
        $json = $Raw | ConvertFrom-Json
        foreach ($property in @('result', 'response', 'text', 'output', 'message')) {
            if ($json.PSObject.Properties.Name -contains $property -and $json.$property -is [string]) {
                return $json.$property
            }
        }
    }
    catch { }
    return $Raw
}

function Assert-Scenario {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$CaseRoot,
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][int]$CliExitCode
    )

    $checks = [System.Collections.Generic.List[object]]::new()
    function Add-Check([string]$Label, [bool]$Passed, [string]$Evidence) {
        $checks.Add([pscustomobject]@{ Check = $Label; Passed = $Passed; Evidence = $Evidence })
    }

    $changed = @(Get-ChangedPaths -Path $CaseRoot)
    Add-Check 'CLI turn exited successfully' ($CliExitCode -eq 0) "exit=$CliExitCode"

    switch ($Name) {
        'mechanical' {
            $readme = Get-Content -LiteralPath (Join-Path $CaseRoot 'README.md') -Raw
            Add-Check 'Typo corrected' ($readme.Contains('Receive') -and -not $readme.Contains('Recieve')) $readme.Trim()
            Add-Check 'Only README changed' ($changed.Count -eq 1 -and $changed[0] -eq 'README.md') ($changed -join ', ')
            Add-Check 'No plan created' (-not (Test-Path -LiteralPath (Join-Path $CaseRoot 'docs\plans'))) 'docs/plans absent'
            Push-Location $CaseRoot
            try {
                $testOutput = & node check.mjs 2>&1 | Out-String
                Add-Check 'Targeted check passes' ($LASTEXITCODE -eq 0) $testOutput.Trim()
            }
            finally { Pop-Location }
        }
        'plan_feature' {
            $plans = @(Get-ChildItem -LiteralPath (Join-Path $CaseRoot 'docs\plans') -Filter '*.md' -File -ErrorAction SilentlyContinue)
            Add-Check 'Exactly one plan created' ($plans.Count -eq 1) "count=$($plans.Count)"
            Add-Check 'Implementation files unchanged' (-not ($changed | Where-Object { $_ -like 'src/*' -or $_ -like 'tests/*' })) ($changed -join ', ')
            if ($plans.Count -eq 1) {
                $planText = Get-Content -LiteralPath $plans[0].FullName -Raw
                $stepCount = ([regex]::Matches($planText, '(?m)^- \[ \] \d+\.')).Count
                Add-Check 'Plan has 3-7 checkbox steps' ($stepCount -ge 3 -and $stepCount -le 7) "steps=$stepCount"
                Add-Check 'Plan names files and verification' ($planText -match 'src/accounts\.mjs' -and $planText -match 'tests/accounts\.test\.mjs' -and $planText -match 'node --test') 'paths and command inspected'
                Add-Check 'Plan has a file map' ($planText -match '(?i)(file map|create:|modify:)') 'file map inspected'
                Add-Check 'Steps include Files, Behavior, and Check' ($planText -match '(?i)files:' -and $planText -match '(?i)behavior:' -and $planText -match '(?i)check:') 'step fields inspected'
            }
        }
        'ambiguous_architecture' {
            $questionCount = ([regex]::Matches($Text, '\?')).Count
            Add-Check 'No repository edits' ($changed.Count -eq 0) ($changed -join ', ')
            Add-Check 'One clarification round with four to six questions' ($questionCount -ge 4 -and $questionCount -le 6) "questionMarks=$questionCount"
        }
        'execute_plan' {
            $allowed = @('src/greeting.mjs', 'tests/greeting.test.mjs', 'docs/plans/2026-09-01-formal-greeting.md')
            Add-Check 'Changes stay in plan scope' (-not ($changed | Where-Object { $_ -notin $allowed })) ($changed -join ', ')
            $planText = Get-Content -LiteralPath (Join-Path $CaseRoot 'docs\plans\2026-09-01-formal-greeting.md') -Raw
            $openSteps = ([regex]::Matches($planText, '(?m)^- \[ \] \d+\.')).Count
            Add-Check 'Plan step checklist updated' ($openSteps -eq 0) "openSteps=$openSteps"
            Add-Check 'No open checkboxes remain' (-not ($planText -match '(?m)^- \[ \]')) 'open checkbox scan'
            $test = Run-NodeTests -Path $CaseRoot
            Add-Check 'Behavior tests pass' ($test.ExitCode -eq 0) $test.Output.Trim()
        }
        'bug_fix' {
            Add-Check 'Source and regression test changed' ($changed -contains 'src/math.mjs' -and $changed -contains 'tests/math.test.mjs') ($changed -join ', ')
            $test = Run-NodeTests -Path $CaseRoot
            Add-Check 'Regression suite passes' ($test.ExitCode -eq 0) $test.Output.Trim()
            $testText = Get-Content -LiteralPath (Join-Path $CaseRoot 'tests\math.test.mjs') -Raw
            Add-Check 'Zero denominator is covered' ($testText -match 'denominator must not be zero' -and $testText -match 'RangeError') 'test contains contract evidence'
        }
        'verify_failure' {
            Add-Check 'Verification makes no edits' ($changed.Count -eq 0) ($changed -join ', ')
            Add-Check 'Failure and blocker reported' ($Text -match '(?i)(fail|exit\s*code\s*1)' -and $Text -match '(?i)(block|not verified|cannot)') 'response inspected'
            Add-Check 'No false success conclusion' (-not ($Text -match '(?i)(everything|task|verification|all checks)\s+(is|are|has)?\s*(done|complete|fixed|passing|passed|successful)')) 'success-language guard'
        }
        'scope_drift' {
            Add-Check 'No out-of-scope edits' ($changed.Count -eq 0) ($changed -join ', ')
            Add-Check 'Scope conflict and stop reported' ($Text -match '(?i)(scope|out-of-scope)' -and $Text -match '(?i)(stop|decision|cannot|blocked)') 'response inspected'
        }
        'review' {
            Add-Check 'Review did not edit candidate' ($changed.Count -eq 1 -and $changed[0] -eq 'src/discount.mjs') ($changed -join ', ')
            Add-Check 'Boundary defect found with file evidence' ($Text -match 'discount\.mjs' -and $Text -match '(?i)(100|boundar|threshold|greater)') 'response inspected'
            Add-Check 'Finding has severity' ($Text -match '(?i)(critical|high|medium|low)') 'severity inspected'
        }
    }

    return $checks
}

foreach ($name in $selectedNames) {
    $fixture = Join-Path $fixtureRoot $name
    if (-not (Test-Path -LiteralPath $fixture -PathType Container)) { throw "Missing fixture: $fixture" }

    for ($run = 1; $run -le $Runs; $run++) {
        $caseRoot = Join-Path ([System.IO.Path]::GetTempPath()) "superpowers-lite-$name-$run-$([guid]::NewGuid().ToString('N'))"
        New-Item -ItemType Directory -Path $caseRoot -Force | Out-Null
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

                if ($name -eq 'review') {
                    $candidate = @'
export function discountedTotal(total) {
  return total > 100 ? total * 0.9 : total;
}
'@
                    Set-Content -LiteralPath (Join-Path $caseRoot 'src\discount.mjs') -Value $candidate -Encoding utf8NoBOM
                }

                Write-Output "[$name run $run/$Runs] invoking $model"
                $raw = & $agy.Source --new-project --add-dir $caseRoot --model $model --effort high --mode accept-edits --dangerously-skip-permissions --output-format json --print-timeout "${TimeoutMinutes}m" --print $scenarios[$name].prompt 2>&1 | Out-String
                $cliExit = $LASTEXITCODE
            }
            finally { Pop-Location }

            $text = Get-AssistantText -Raw $raw
            $checks = @(Assert-Scenario -Name $name -CaseRoot $caseRoot -Text $text -CliExitCode $cliExit)
            $passed = -not ($checks | Where-Object { -not $_.Passed })
            $result = [ordered]@{
                scenario = $name
                run = $run
                passed = $passed
                cliExitCode = $cliExit
                checks = $checks
                response = $text
            }
            $results.Add([pscustomobject]$result)
            $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $resultRoot "$name-run-$run.json") -Encoding utf8NoBOM

            if ($passed) { Write-Output "PASS [$name run $run]" }
            else {
                Write-Warning "FAIL [$name run $run]"
                $checks | Where-Object { -not $_.Passed } | ForEach-Object { Write-Warning "  $($_.Check): $($_.Evidence)" }
            }
        }
        finally {
            if (Test-Path -LiteralPath $caseRoot) {
                $tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
                $resolvedCase = [System.IO.Path]::GetFullPath($caseRoot)
                if ((Split-Path -Parent $resolvedCase).TrimEnd('\') -eq $tempParent -and (Split-Path -Leaf $resolvedCase) -like 'superpowers-lite-*') {
                    $removed = $false
                    for ($attempt = 1; $attempt -le 6 -and -not $removed; $attempt++) {
                        try {
                            Remove-Item -LiteralPath $resolvedCase -Recurse -Force -ErrorAction Stop
                            $removed = $true
                        }
                        catch {
                            if ($attempt -lt 6) { Start-Sleep -Milliseconds 500 }
                            else { Write-Warning "Could not remove disposable fixture after retries: $resolvedCase" }
                        }
                    }
                }
            }
        }
    }
}

$summary = [ordered]@{
    model = $model
    runsPerScenario = $Runs
    passed = @($results | Where-Object Passed).Count
    failed = @($results | Where-Object { -not $_.Passed }).Count
    total = $results.Count
    results = @($results | ForEach-Object { [ordered]@{ scenario = $_.scenario; run = $_.run; passed = $_.passed } })
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $resultRoot 'summary.json') -Encoding utf8NoBOM

Write-Output "Behavior results: $resultRoot"
Write-Output "Passed $($summary.passed)/$($summary.total); failed $($summary.failed)."
if ($summary.failed -gt 0) { exit 1 }
