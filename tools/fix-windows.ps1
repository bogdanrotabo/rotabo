<#
    fix-windows.ps1  -  Small, reversible fixes for a slow Windows 11 laptop.

    What it does (nothing else):
      1. Disables the startup entries that eat RAM at every logon and are never
         needed at logon: Edge "startup boost", Copilot auto-launch, Lenovo Vantage.
         Done the same way Task Manager > Startup does it, so it can be turned back
         on from Task Manager at any time.
      2. Clears the Microsoft Store cache (wsreset), which unsticks Store-app updates
         that fail with 0x80073D02.
      3. Offers a real restart at the end. The audit found a pending reboot, and the
         laptop had not properly restarted in 6 days because Fast Startup hides it.

    Run AS ADMINISTRATOR:

        powershell -NoProfile -ExecutionPolicy Bypass -File .\fix-windows.ps1
#>

#Requires -Version 5.1

$ErrorActionPreference = 'SilentlyContinue'

$isAdmin = (New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This needs to run as Administrator. Right-click PowerShell > Run as administrator, then run it again." -ForegroundColor Red
    exit 1
}

# Task Manager marks a startup entry as disabled by writing 03 00 00 00 + 8 zero bytes
# under StartupApproved\Run, next to the entry's name. Explorer then skips it at logon.
$disabled = [byte[]](3,0,0,0,0,0,0,0,0,0,0,0)

function Disable-StartupEntry($hive, $pattern, $label) {
    $run      = "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    $approved = "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"
    $entries  = (Get-ItemProperty $run -ErrorAction SilentlyContinue).PSObject.Properties |
                Where-Object { $_.Name -like $pattern -and $_.Name -notlike 'PS*' }
    if (-not $entries) { Write-Host "  $label : not present, nothing to do"; return }
    if (-not (Test-Path $approved)) { New-Item $approved -Force | Out-Null }
    foreach ($e in $entries) {
        Set-ItemProperty -Path $approved -Name $e.Name -Value $disabled -Type Binary
        Write-Host "  $label : disabled at startup  ($($e.Name))" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "1. Startup entries" -ForegroundColor Cyan
Disable-StartupEntry 'HKCU:' 'MicrosoftEdgeAutoLaunch_*'    'Edge startup boost'
Disable-StartupEntry 'HKCU:' 'MicrosoftCopilotAutoLaunch_*' 'Copilot auto-launch'
Disable-StartupEntry 'HKLM:' 'LenovoVantage'                'Lenovo Vantage'
Write-Host "  (OneDrive and Google Drive were left alone. Turn them off in Task Manager > Startup if you do not use them.)"

Write-Host ""
Write-Host "2. Microsoft Store cache" -ForegroundColor Cyan
Start-Process wsreset.exe -Wait
Write-Host "  cleared" -ForegroundColor Green

Write-Host ""
Write-Host "3. Restart" -ForegroundColor Cyan
Write-Host "  A real restart is needed to finish pending updates and free the RAM."
$answer = Read-Host "  Restart now? Save your work first. (y/n)"
if ($answer -match '^[yYdD]') {
    Restart-Computer -Force
} else {
    Write-Host "  OK. Restart yourself from Start > Power > Restart (not Shut down) when you are ready." -ForegroundColor Yellow
}
