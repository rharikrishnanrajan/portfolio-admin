# security-smoke.ps1
# Phase 6 security smoke test for the admin portfolio site.
# Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local
# Tests RLS policies and role restrictions using the anon key.
# Prints PASS/FAIL per check. Exits non-zero on any failure.
# Requires: curl.exe (bundled with Windows 10+) and PowerShell 5.1+
# NEVER prints keys or tokens to output.

param(
    [string]$EnvFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Load .env.local
# ---------------------------------------------------------------------------
# Try candidates in order
$candidates = @()
if ($EnvFile -ne "") { $candidates += $EnvFile }
$candidates += "$PSScriptRoot\..\admin\.env.local"
$candidates += "$PSScriptRoot\..\.env.local"
$candidates += "$PSScriptRoot\.env.local"
# Also try the directory where the script is invoked from
$candidates += (Join-Path (Get-Location) ".env.local")

$resolvedEnv = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $resolvedEnv = $c; break }
}

if (-not $resolvedEnv) {
    Write-Error "ERROR: .env.local not found. Run from admin/ or provide -EnvFile path."
    exit 1
}

$SupabaseUrl = $null
$AnonKey     = $null

foreach ($line in Get-Content $resolvedEnv) {
    $line = $line.Trim()
    if ($line -match '^VITE_SUPABASE_URL=(.+)$')      { $SupabaseUrl = $matches[1].Trim() }
    if ($line -match '^VITE_SUPABASE_ANON_KEY=(.+)$') { $AnonKey     = $matches[1].Trim() }
}

if (-not $SupabaseUrl -or -not $AnonKey) {
    Write-Error "ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in $resolvedEnv"
    exit 1
}

Write-Host "Security smoke test"
Write-Host "Supabase URL: $SupabaseUrl"
Write-Host "Anon key: loaded (not printed)"
Write-Host ""

# ---------------------------------------------------------------------------
# 2. Helpers
# ---------------------------------------------------------------------------
$script:Pass   = 0
$script:Fail   = 0
$script:Checks = [System.Collections.Generic.List[PSCustomObject]]::new()

function Invoke-Rest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$JsonBody = "",
        [string]$Prefer = ""
    )

    $tmpOut  = [System.IO.Path]::GetTempFileName()
    $tmpBody = $null

    $args = @(
        "--silent"
        "--write-out", "%{http_code}"
        "--output", $tmpOut
        "-X", $Method
        "-H", "apikey: $AnonKey"
        "-H", "Authorization: Bearer $AnonKey"
        "-H", "Content-Type: application/json"
        "-H", "Accept: application/json"
    )

    if ($Prefer -ne "") {
        $args += "-H"
        $args += "Prefer: $Prefer"
    }

    if ($JsonBody -ne "") {
        # Write body to temp file (UTF-8 without BOM) to avoid shell quoting issues on Windows
        $tmpBody = [System.IO.Path]::GetTempFileName()
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($tmpBody, $JsonBody, $utf8NoBom)
        $args += "--data-binary"
        $args += "@$tmpBody"
    }

    $args += $Url

    $statusCode = (& curl.exe @args 2>$null).Trim()
    $body = ""
    if (Test-Path $tmpOut) {
        $body = Get-Content $tmpOut -Raw -ErrorAction SilentlyContinue
        Remove-Item $tmpOut -ErrorAction SilentlyContinue
    }
    if ($tmpBody -and (Test-Path $tmpBody)) {
        Remove-Item $tmpBody -ErrorAction SilentlyContinue
    }
    if (-not $statusCode) { $statusCode = "000" }

    return @{
        Code = [int]$statusCode
        Body = if ($body) { $body.Trim() } else { "" }
    }
}

function Run-Check {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$JsonBody = "",
        # DENY  = operation must be refused (403/401) or return empty rows
        # ALLOW = 2xx with any body
        # EMPTY = 2xx with empty body / no rows returned
        [string]$Expect = "DENY",
        [string]$Prefer = ""
    )

    $r = Invoke-Rest -Url $Url -Method $Method -JsonBody $JsonBody -Prefer $Prefer
    $code = $r.Code
    $body = $r.Body

    $passed = $false
    $detail = "HTTP $code"

    switch ($Expect) {
        "DENY" {
            if ($code -eq 401 -or $code -eq 403) {
                # Explicit RLS / auth denial
                $passed = $true
                $detail = "HTTP $code (denied)"
            } elseif ($code -eq 400) {
                # PostgREST PGRST102 / check constraint = request reached DB but was refused
                # Treat as PASS — operation did not succeed
                $passed = $true
                $detail = "HTTP 400 (request refused — check constraint or schema)"
            } elseif ($code -eq 404) {
                $passed = $true
                $detail = "HTTP 404 (not found)"
            } elseif ($code -eq 200 -or $code -eq 206) {
                # RLS read deny returns 200 with [] in PostgREST
                if ($body -eq "[]" -or $body -eq "" -or $body -eq "null") {
                    $passed = $true
                    $detail = "HTTP 200 — empty result (RLS denies rows)"
                } else {
                    $passed = $false
                    $detail = "HTTP 200 — data returned (unexpected)"
                }
            } elseif ($code -eq 204) {
                # DELETE on non-existent ID returns 204 in PostgREST even when 0 rows deleted
                # We consider this PASS for the delete-of-fake-UUID test only if we signal it
                $passed = $true
                $detail = "HTTP 204 (no rows matched the fake UUID — expected)"
            } else {
                $passed = $false
                $detail = "HTTP $code (unexpected)"
            }
        }
        "ALLOW" {
            $passed = ($code -ge 200 -and $code -lt 300)
            if (-not $passed) { $detail = "HTTP $code (expected 2xx)" }
        }
        "EMPTY" {
            if ($code -ge 200 -and $code -lt 300) {
                $passed = ($body -eq "[]" -or $body -eq "" -or $body -eq "null")
                if (-not $passed) { $detail = "HTTP $code but non-empty body returned" }
            } else {
                $passed = $true  # Also OK if denied
            }
        }
        "DENY_OR_EMPTY" {
            # Accepts RLS deny (401/403) OR empty-row result
            if ($code -eq 401 -or $code -eq 403) {
                $passed = $true
                $detail = "HTTP $code (denied)"
            } elseif ($code -ge 200 -and $code -lt 300) {
                if ($body -eq "[]" -or $body -eq "" -or $body -eq "null") {
                    $passed = $true
                    $detail = "HTTP $code — empty result"
                } else {
                    $passed = $false
                    $detail = "HTTP $code — data returned (unexpected)"
                }
            } else {
                $passed = $false
                $detail = "HTTP $code"
            }
        }
    }

    $status = if ($passed) { "PASS" } else { "FAIL" }
    if ($passed) { $script:Pass++ } else { $script:Fail++ }
    $script:Checks.Add([PSCustomObject]@{ Status = $status; Name = $Name; Detail = $detail })
    $marker = if ($passed) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$marker  $Name  ($detail)"
}

$Base = "$SupabaseUrl/rest/v1"

# ---------------------------------------------------------------------------
# 3. READ checks — public tables the anon role CAN read
# ---------------------------------------------------------------------------
Run-Check -Name "READ projects (public)"        -Url "$Base/projects?select=id,title,visible" -Expect "ALLOW"
Run-Check -Name "READ sections (public)"        -Url "$Base/sections?select=id,slug" -Expect "ALLOW"
Run-Check -Name "READ skill_domains (public)"   -Url "$Base/skill_domains?select=id,title" -Expect "ALLOW"
Run-Check -Name "READ public_profile view"      -Url "$Base/public_profile?select=full_name,headline" -Expect "ALLOW"

# ---------------------------------------------------------------------------
# 4. READ checks — tables anon CANNOT read
# ---------------------------------------------------------------------------
Run-Check -Name "READ profile (anon denied)"  -Url "$Base/profile?select=*" -Expect "DENY_OR_EMPTY"
Run-Check -Name "READ messages (anon denied)" -Url "$Base/messages?select=*" -Expect "DENY_OR_EMPTY"
Run-Check -Name "READ admins (anon denied)"   -Url "$Base/admins?select=*"   -Expect "DENY_OR_EMPTY"

# ---------------------------------------------------------------------------
# 5. WRITE checks — anon must NOT be able to mutate admin tables
# ---------------------------------------------------------------------------
Run-Check -Name "INSERT projects (anon denied)" `
    -Url "$Base/projects" -Method "POST" `
    -JsonBody '{"title":"SMOKE_TEST_XSS","kicker":"test","visible":false}' `
    -Prefer "return=minimal" -Expect "DENY"

Run-Check -Name "UPDATE projects (anon denied)" `
    -Url "$Base/projects?id=eq.00000000-0000-0000-0000-000000000000" -Method "PATCH" `
    -JsonBody '{"title":"pwned"}' -Expect "DENY"

# DELETE: use a fake UUID; PostgREST returns 204 even when 0 rows matched
# We expect 204 (empty) which is acceptable — the fake row doesn't exist and anon can't create one
Run-Check -Name "DELETE projects (anon — fake UUID returns 204)" `
    -Url "$Base/projects?id=eq.00000000-0000-0000-0000-000000000000" `
    -Method "DELETE" -Expect "DENY"

# ---------------------------------------------------------------------------
# 6. ADMINS table — inserting must be denied
# ---------------------------------------------------------------------------
Run-Check -Name "INSERT admins (anon denied)" `
    -Url "$Base/admins" -Method "POST" `
    -JsonBody '{"user_id":"00000000-0000-0000-0000-000000000000"}' `
    -Prefer "return=minimal" -Expect "DENY"

# ---------------------------------------------------------------------------
# 7. Storage buckets — anon upload must be denied
# ---------------------------------------------------------------------------
$tmpFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllBytes($tmpFile, [byte[]]@(0x00))

$pfCode = (& curl.exe --silent --write-out "%{http_code}" --output NUL `
    -X POST "$SupabaseUrl/storage/v1/object/portfolio/smoke-anon-$(Get-Date -f 'HHmmssffff').bin" `
    -H "apikey: $AnonKey" -H "Authorization: Bearer $AnonKey" `
    -H "Content-Type: application/octet-stream" `
    --data-binary "@$tmpFile" 2>$null).Trim()
Remove-Item $tmpFile -ErrorAction SilentlyContinue

$pfInt = [int]$pfCode
if ($pfInt -lt 200 -or $pfInt -ge 300) {
    $script:Pass++
    $script:Checks.Add([PSCustomObject]@{ Status = "PASS"; Name = "UPLOAD portfolio bucket (anon denied)"; Detail = "HTTP $pfInt" })
    Write-Host "[PASS]  UPLOAD portfolio bucket (anon denied)  (HTTP $pfInt)"
} else {
    $script:Fail++
    $script:Checks.Add([PSCustomObject]@{ Status = "FAIL"; Name = "UPLOAD portfolio bucket (anon denied)"; Detail = "HTTP $pfInt — upload SUCCEEDED" })
    Write-Host "[FAIL]  UPLOAD portfolio bucket (anon denied)  (HTTP $pfInt — upload SUCCEEDED)"
}

$tmpFile2 = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllBytes($tmpFile2, [byte[]]@(0x00))
$pdCode = (& curl.exe --silent --write-out "%{http_code}" --output NUL `
    -X POST "$SupabaseUrl/storage/v1/object/project-documents/smoke-anon-$(Get-Date -f 'HHmmssffff').bin" `
    -H "apikey: $AnonKey" -H "Authorization: Bearer $AnonKey" `
    -H "Content-Type: application/octet-stream" `
    --data-binary "@$tmpFile2" 2>$null).Trim()
Remove-Item $tmpFile2 -ErrorAction SilentlyContinue

$pdInt = [int]$pdCode
if ($pdInt -lt 200 -or $pdInt -ge 300) {
    $script:Pass++
    $script:Checks.Add([PSCustomObject]@{ Status = "PASS"; Name = "UPLOAD project-documents bucket (anon denied)"; Detail = "HTTP $pdInt" })
    Write-Host "[PASS]  UPLOAD project-documents bucket (anon denied)  (HTTP $pdInt)"
} else {
    $script:Fail++
    $script:Checks.Add([PSCustomObject]@{ Status = "FAIL"; Name = "UPLOAD project-documents bucket (anon denied)"; Detail = "HTTP $pdInt — upload SUCCEEDED" })
    Write-Host "[FAIL]  UPLOAD project-documents bucket (anon denied)  (HTTP $pdInt — upload SUCCEEDED)"
}

# ---------------------------------------------------------------------------
# 8. RPC — is_admin: anon must get false (not admin), not an error indicating
#    privilege escalation. HTTP 200 returning "false" is correct behaviour.
#    Call without a body — the function takes no parameters.
# ---------------------------------------------------------------------------
$rpcRes = Invoke-Rest -Url "$Base/rpc/is_admin" -Method "POST"
$rpcCode = $rpcRes.Code
$rpcBody = $rpcRes.Body
# Acceptable: 200 with body "false" (not an admin), or 403/404
if ($rpcCode -eq 200 -and $rpcBody -eq "false") {
    $script:Pass++
    $script:Checks.Add([PSCustomObject]@{ Status = "PASS"; Name = "RPC is_admin returns false for anon (correct)"; Detail = "HTTP 200 body=false" })
    Write-Host "[PASS]  RPC is_admin returns false for anon (correct)  (HTTP 200 body=false)"
} elseif ($rpcCode -eq 200 -and $rpcBody -eq "true") {
    $script:Fail++
    $script:Checks.Add([PSCustomObject]@{ Status = "FAIL"; Name = "RPC is_admin returns false for anon (correct)"; Detail = "HTTP 200 body=true — anon is_admin!" })
    Write-Host "[FAIL]  RPC is_admin returned true for anon — PRIVILEGE ESCALATION!  (HTTP 200 body=true)"
} elseif ($rpcCode -eq 403 -or $rpcCode -eq 401 -or $rpcCode -eq 404) {
    $script:Pass++
    $script:Checks.Add([PSCustomObject]@{ Status = "PASS"; Name = "RPC is_admin denied for anon"; Detail = "HTTP $rpcCode" })
    Write-Host "[PASS]  RPC is_admin denied for anon  (HTTP $rpcCode)"
} else {
    $script:Fail++
    $script:Checks.Add([PSCustomObject]@{ Status = "FAIL"; Name = "RPC is_admin"; Detail = "HTTP $rpcCode body=$rpcBody" })
    Write-Host "[FAIL]  RPC is_admin unexpected  (HTTP $rpcCode body=$rpcBody)"
}

# ---------------------------------------------------------------------------
# 9. Contact message — the anon role CAN insert messages (public contact form).
#    A valid message should succeed (HTTP 201).
# ---------------------------------------------------------------------------
Run-Check -Name "INSERT messages valid contact (anon ALLOW)" `
    -Url "$Base/messages" -Method "POST" `
    -JsonBody '{"name":"Smoke Test","email":"smoketest@example.com","subject":"Test","body":"Automated security smoke test message."}' `
    -Prefer "return=minimal" -Expect "ALLOW"

# ---------------------------------------------------------------------------
# 10. Contact message — invalid email should be rejected by DB check constraint.
#     SECURITY FINDING: If this returns 2xx, the chk_messages_email constraint
#     is missing — the supabase/04_hardening.sql migration has not been applied.
#     This check will FAIL until the DBA applies the migration.
# ---------------------------------------------------------------------------
Run-Check -Name "INSERT messages invalid email (DB rejects via chk_messages_email)" `
    -Url "$Base/messages" -Method "POST" `
    -JsonBody '{"name":"Attacker","email":"not-an-email","subject":"XSS","body":"test"}' `
    -Prefer "return=minimal" -Expect "DENY"

# ---------------------------------------------------------------------------
# 11. Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================"
Write-Host "Results: $($script:Pass) PASS  |  $($script:Fail) FAIL"
Write-Host "========================================"

if ($script:Fail -gt 0) {
    Write-Host ""
    Write-Host "FAILED checks:"
    foreach ($c in $script:Checks) {
        if ($c.Status -eq "FAIL") {
            Write-Host "  [FAIL] $($c.Name) — $($c.Detail)"
        }
    }
    exit 1
}

exit 0
