<#
    audit-windows.ps1  -  Read-only Windows health audit.

    CHANGES NOTHING. It only reads and reports.
    Writes a report to your Desktop: windows-audit-<date>.txt

    Best run AS ADMINISTRATOR (a few checks need it; it degrades gracefully without).

        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
        .\audit-windows.ps1

    or, without touching the execution policy at all:

        powershell -NoProfile -ExecutionPolicy Bypass -File .\audit-windows.ps1
#>

#Requires -Version 5.1

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference    = 'SilentlyContinue'

$out  = New-Object System.Collections.Generic.List[string]
function W($t) { $out.Add([string]$t); Write-Host $t }
function H($t) { W ""; W ("=" * 74); W "  $t"; W ("=" * 74) }
function S($t) { W ""; W "-- $t" }

$isAdmin = (New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

W "WINDOWS HEALTH AUDIT   generated $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
W ("Elevated: {0}" -f $(if ($isAdmin) { 'YES' } else { 'NO  <-- rerun as Administrator for full results' }))

# ============================================================ 1. SYSTEM
H "1. SYSTEM"
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $cs = Get-CimInstance Win32_ComputerSystem  -ErrorAction Stop
    $bi = Get-CimInstance Win32_BIOS            -ErrorAction Stop
    $cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    W "OS            : $($os.Caption)"
    W "Version/Build : $($os.Version)  (UBR: $($cv.UBR))"
    W "DisplayVersion: $(if ($cv.DisplayVersion) { $cv.DisplayVersion } else { $cv.ReleaseId })"
    W "Architecture  : $($os.OSArchitecture)"
    W "Installed on  : $($os.InstallDate)"
    W "Last boot     : $($os.LastBootUpTime)"
    W "Uptime        : $([math]::Round(((Get-Date) - $os.LastBootUpTime).TotalDays,1)) days   (with Fast Startup on, shutdown does not reset this)"
    W "Machine       : $($cs.Manufacturer) $($cs.Model)"
    W "BIOS          : $($bi.SMBIOSBIOSVersion)  released $($bi.ReleaseDate)"
    W "Domain/Group  : $($cs.Domain)"
} catch { W "  [error] $_" }

S "Secure Boot / TPM / Virtualisation"
try { W "Secure Boot   : $(Confirm-SecureBootUEFI -ErrorAction Stop)" }
catch { W "Secure Boot   : not available (legacy BIOS, or needs admin)" }
try {
    $tpm = Get-Tpm -ErrorAction Stop
    W "TPM present   : $($tpm.TpmPresent)   ready: $($tpm.TpmReady)"
} catch { W "TPM           : could not read (needs admin)" }
try { W "Virtualisation: $((Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).HypervisorPresent)" } catch {}

# ========================================================== 2. HARDWARE
H "2. HARDWARE"
try {
    $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
    W "CPU           : $($cpu.Name.Trim())"
    W "Cores/Threads : $($cpu.NumberOfCores) / $($cpu.NumberOfLogicalProcessors)"
    W "Max clock     : $($cpu.MaxClockSpeed) MHz"
} catch { W "  [error] $_" }

try {
    $os  = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    # TotalVisibleMemorySize / FreePhysicalMemory are reported in KB, so KB / 1MB = GB.
    $tot = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    $fre = [math]::Round($os.FreePhysicalMemory     / 1MB, 1)
    W ""
    W "RAM total     : $tot GB"
    if ($tot -gt 0) { W "RAM free now  : $fre GB  ($([math]::Round(($tot-$fre)/$tot*100)) % in use)" }
    Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
        W "  slot $($_.DeviceLocator): $([math]::Round($_.Capacity/1GB)) GB @ $($_.Speed) MT/s  $($_.Manufacturer)"
    }
} catch { W "  [error] $_" }

S "GPU"
try { Get-CimInstance Win32_VideoController -ErrorAction Stop | ForEach-Object {
    W "  $($_.Name)   driver $($_.DriverVersion)  ($($_.DriverDate))"
} } catch { W "  (could not read)" }

S "Disks"
try {
    Get-PhysicalDisk -ErrorAction Stop | ForEach-Object {
        W ("  {0,-32} {1,-6} {2,7} GB   health: {3}" -f `
            $_.FriendlyName, $_.MediaType, [math]::Round($_.Size/1GB), $_.HealthStatus)
    }
} catch { W "  (Get-PhysicalDisk unavailable)" }

S "Volumes / free space"
try {
    # Skip volumes with no size: empty DVD drives and card readers would otherwise show up as CRITICALLY LOW.
    Get-Volume -ErrorAction Stop | Where-Object { $_.DriveLetter -and $_.Size -gt 0 } | ForEach-Object {
        $pct  = [math]::Round($_.SizeRemaining / $_.Size * 100)
        $flag = if ($pct -lt 10) { '  <<< CRITICALLY LOW' } elseif ($pct -lt 20) { '  <<< low' } else { '' }
        W ("  {0}:  {1,7} GB free of {2,7} GB  ({3,3} %)  {4}{5}" -f `
            $_.DriveLetter, [math]::Round($_.SizeRemaining/1GB), [math]::Round($_.Size/1GB), `
            $pct, $_.FileSystemType, $flag)
    }
} catch { W "  (Get-Volume unavailable)" }

# =================================================== 3. WINDOWS UPDATE
H "3. WINDOWS UPDATE"
S "Services"
foreach ($svc in 'wuauserv','BITS','CryptSvc','TrustedInstaller','UsoSvc') {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) { W ("  {0,-18} {1,-9} startup: {2}" -f $s.Name, $s.Status, $s.StartType) }
    else    { W ("  {0,-18} NOT FOUND" -f $svc) }
}

S "Recently installed updates (last 15)"
try {
    $fixes = @(Get-HotFix -ErrorAction Stop | Where-Object InstalledOn | Sort-Object InstalledOn -Descending)
    if ($fixes.Count -eq 0) { W "  none reported by Get-HotFix" }
    $fixes | Select-Object -First 15 | ForEach-Object {
        W ("  {0,-12} {1,-16} {2}" -f $_.HotFixID, $_.InstalledOn.ToString('yyyy-MM-dd'), $_.Description)
    }
    if ($fixes.Count -gt 0) {
        $days = [math]::Round(((Get-Date) - $fixes[0].InstalledOn).TotalDays)
        W ""
        W "  Last update installed $days days ago$(if($days -gt 45){'   <<< STALE - updates may be stuck'})"
    }
} catch { W "  [error] $_" }

S "Pending reboot flags"
$pending = @()
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') { $pending += 'CBS' }
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { $pending += 'WindowsUpdate' }
$pfro = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
if ($pfro) { $pending += 'PendingFileRename' }
W $(if ($pending) { "  REBOOT PENDING: $($pending -join ', ')   <<< restart before troubleshooting further" } else { "  none" })

S "Windows Update errors in the last 30 days"
try {
    $errs = @(Get-WinEvent -FilterHashtable @{
        LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'
        Level=1,2,3; StartTime=(Get-Date).AddDays(-30)
    } -MaxEvents 15 -ErrorAction SilentlyContinue)
    if ($errs.Count) { $errs | ForEach-Object { W ("  {0}  id {1}  {2}" -f $_.TimeCreated, $_.Id, ($_.Message -split "`n")[0]) } }
    else { W "  none" }
} catch { W "  none" }

S "Update policy / deferrals (managed settings that can block updates)"
try {
    $au = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -ErrorAction SilentlyContinue
    $wu = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'    -ErrorAction SilentlyContinue
    if ($au -or $wu) {
        if ($au) { $au.PSObject.Properties | Where-Object Name -notlike 'PS*' | ForEach-Object { W "  AU\$($_.Name) = $($_.Value)" } }
        if ($wu) { $wu.PSObject.Properties | Where-Object Name -notlike 'PS*' | ForEach-Object { W "  WU\$($_.Name) = $($_.Value)" } }
        W "  <<< policies present - these can pause or defer updates"
    } else { W "  no policy overrides (good)" }
} catch {}

# ========================================================== 4. STARTUP
H "4. STARTUP PROGRAMS  (biggest cause of slow boot)"
try {
    $paths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'
    )
    $n = 0
    foreach ($p in $paths) {
        $k = Get-ItemProperty $p -ErrorAction SilentlyContinue
        if ($k) { $k.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
            $n++; W ("  {0,-32} {1}" -f $_.Name, $_.Value)
        } }
    }
    foreach ($f in "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup",
                   "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup") {
        Get-ChildItem $f -File -ErrorAction SilentlyContinue | Where-Object Name -ne 'desktop.ini' |
            ForEach-Object { $n++; W "  [folder] $($_.Name)" }
    }
    W ""
    W "  Total startup entries: $n$(if($n -gt 12){'   <<< a lot - trimming these is the single best speed win'})"
} catch {}

S "Scheduled tasks running at logon / boot (non-Microsoft)"
try {
    Get-ScheduledTask -ErrorAction Stop | Where-Object {
        $_.State -eq 'Ready' -and $_.TaskPath -notlike '\Microsoft\*' -and $_.Triggers -and
        (@($_.Triggers | ForEach-Object { $_.CimClass.CimClassName }) -match 'MSFT_Task(Logon|Boot)Trigger')
    } | Select-Object -First 25 | ForEach-Object { W "  $($_.TaskPath)$($_.TaskName)" }
} catch { W "  (could not read scheduled tasks)" }

# ========================================================= 5. SERVICES
H "5. SERVICES"
S "Set to Automatic but NOT running"
try {
    # Delayed-start and trigger-start services are legitimately stopped at times; keep the list to plain Automatic.
    $bad = Get-Service -ErrorAction Stop | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' }
    if ($bad) { $bad | ForEach-Object { W "  $($_.Name)  -  $($_.DisplayName)" } } else { W "  none" }
} catch {}

# ========================================================== 6. STORAGE
H "6. STORAGE CLEANUP OPPORTUNITIES"
function FolderSize($p) {
    # Manual walk: Get-ChildItem -Recurse on WinSxS takes minutes, and .NET's
    # AllDirectories enumeration aborts on the first folder it cannot open.
    if (-not (Test-Path -LiteralPath $p)) { return 0 }
    $bytes = [long]0
    $stack = New-Object System.Collections.Generic.Stack[string]
    $stack.Push($p)
    while ($stack.Count) {
        $d = $stack.Pop()
        try { foreach ($f in [System.IO.Directory]::EnumerateFiles($d)) { $bytes += ([System.IO.FileInfo]$f).Length } } catch {}
        try { foreach ($sd in [System.IO.Directory]::EnumerateDirectories($d)) { $stack.Push($sd) } } catch {}
    }
    [math]::Round($bytes/1GB, 2)
}
$doCache = "$env:WINDIR\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache"
W ("  User temp            : {0} GB   ({1})" -f (FolderSize $env:TEMP), $env:TEMP)
W ("  Windows temp         : {0} GB{1}" -f (FolderSize "$env:WINDIR\Temp"), $(if (-not $isAdmin) { '   (partial - needs admin)' }))
W ("  Windows Update cache : {0} GB   (SoftwareDistribution\Download)" -f (FolderSize "$env:WINDIR\SoftwareDistribution\Download"))
W ("  Delivery Optimization: {0} GB{1}" -f (FolderSize $doCache), $(if (-not $isAdmin) { '   (needs admin)' }))
if (Test-Path "$env:SystemDrive\Windows.old") {
    W ("  Windows.old          : {0} GB   <<< old Windows install, safe to remove via Disk Cleanup" -f (FolderSize "$env:SystemDrive\Windows.old"))
}
if (Test-Path "$env:SystemDrive\`$Recycle.Bin") {
    W ("  Recycle Bin          : {0} GB" -f (FolderSize "$env:SystemDrive\`$Recycle.Bin"))
}
W ("  WinSxS (component store, do NOT delete manually): {0} GB   (overstated - most of it is hard links)" -f (FolderSize "$env:WINDIR\WinSxS"))
$hib = Get-Item "$env:SystemDrive\hiberfil.sys" -Force -ErrorAction SilentlyContinue
if ($hib) { W ("  Hibernation file     : {0} GB" -f [math]::Round($hib.Length/1GB,2)) } else { W "  Hibernation file     : none (hibernation off)" }

# ====================================================== 7. PERFORMANCE
H "7. PERFORMANCE SETTINGS"
try {
    $plan = (powercfg /getactivescheme 2>$null) -join ''
    W "Power plan    : $plan"
    if ($plan -match 'Economi|Power saver') { W "  <<< power saver caps CPU speed - switch to Balanced or High performance" }
} catch {}

try {
    $fast = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' -Name HiberbootEnabled -ErrorAction SilentlyContinue).HiberbootEnabled
    W "Fast startup  : $(if($fast -eq 1){'ON'}else{'off'})"
} catch {}

try {
    $pf = Get-CimInstance Win32_PageFileUsage -ErrorAction Stop
    if ($pf) { $pf | ForEach-Object { W "Page file     : $($_.Name)  $($_.AllocatedBaseSize) MB allocated, peak $($_.PeakUsage) MB" } }
    else     { W "Page file     : none reported" }
} catch {}

try {
    $vfx = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name VisualFXSetting -ErrorAction SilentlyContinue).VisualFXSetting
    W "Visual effects: $(switch($vfx){1{'best appearance'}2{'best performance'}3{'custom'}default{'let Windows choose'}})"
} catch {}

# fsutil refuses to run without elevation.
if ($isAdmin) {
    try {
        $trim = (fsutil behavior query DisableDeleteNotify 2>$null) -join ' '
        W "SSD TRIM      : $trim   (DisableDeleteNotify = 0 means TRIM is ON)"
    } catch {}
} else { W "SSD TRIM      : (needs admin)" }

S "Top 10 programs by memory right now (all processes of a program added together)"
try {
    Get-Process -ErrorAction Stop | Group-Object ProcessName | ForEach-Object {
        [pscustomobject]@{ Name = $_.Name; Count = $_.Count; MB = [math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum/1MB) }
    } | Sort-Object MB -Descending | Select-Object -First 10 | ForEach-Object {
        W ("  {0,-28} {1,7} MB   ({2} process{3})" -f $_.Name, $_.MB, $_.Count, $(if ($_.Count -ne 1) { 'es' }))
    }
} catch {}

# ========================================================= 8. SECURITY
H "8. SECURITY"
try {
    $d = Get-MpComputerStatus -ErrorAction Stop
    W "Defender realtime     : $($d.RealTimeProtectionEnabled)"
    W "Antivirus enabled     : $($d.AntivirusEnabled)"
    W "Signature age (days)  : $($d.AntivirusSignatureAge)$(if($d.AntivirusSignatureAge -gt 3){'   <<< definitions are stale'})"
    W "Last quick scan       : $($d.QuickScanEndTime)"
    W "Tamper protection     : $($d.IsTamperProtected)"
} catch { W "Defender      : could not read (third-party AV installed, or needs admin)" }

try {
    Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop | ForEach-Object {
        W "Registered AV : $($_.displayName)"
    }
} catch {}

S "Firewall"
try { Get-NetFirewallProfile -ErrorAction Stop | ForEach-Object {
    W ("  {0,-10} enabled: {1}" -f $_.Name, $_.Enabled)
    if (-not $_.Enabled) { W "     <<< firewall OFF for this profile" }
} } catch { W "  (could not read)" }

S "BitLocker"
try {
    $bl = Get-BitLockerVolume -ErrorAction Stop
    if ($bl) { $bl | ForEach-Object { W ("  {0}  {1}  {2}%" -f $_.MountPoint, $_.ProtectionStatus, $_.EncryptionPercentage) } }
} catch { W "  could not read (needs admin, or BitLocker not available on this edition)" }

try {
    $uac = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name EnableLUA -ErrorAction Stop).EnableLUA
    W ""
    W "UAC enabled   : $(if($uac -eq 1){'yes'}else{'NO   <<< turn User Account Control back on'})"
} catch {}

# ========================================================== 9. DEVICES
H "9. DEVICES WITH PROBLEMS"
try {
    $bad = Get-CimInstance Win32_PnPEntity -ErrorAction Stop | Where-Object { $_.ConfigManagerErrorCode -ne 0 }
    if ($bad) { $bad | ForEach-Object { W "  [code $($_.ConfigManagerErrorCode)] $($_.Name)" } }
    else { W "  none - all devices report OK" }
} catch {}

# ====================================================== 10. RELIABILITY
H "10. RELIABILITY  (last 7 days)"
S "Unexpected shutdowns / bugchecks"
try {
    # 41 = Kernel-Power (lost power / hard reset), 6008 = EventLog unexpected shutdown, 1001 = BugCheck (BSOD)
    $ev = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power','EventLog','Microsoft-Windows-WER-SystemErrorReporting'; Id=41,1001,6008; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 10 -ErrorAction SilentlyContinue)
    if ($ev.Count) { $ev | ForEach-Object { W "  $($_.TimeCreated)  id $($_.Id)  $(($_.Message -split "`n")[0])" } }
    else { W "  none - no crashes or unclean shutdowns" }
} catch { W "  none" }

S "Application crashes"
try {
    $ev = @(Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 10 -ErrorAction SilentlyContinue)
    if ($ev.Count) { $ev | ForEach-Object { W "  $($_.TimeCreated)  $(($_.Message -split "`n")[0])" } }
    else { W "  none" }
} catch { W "  none" }

S "Disk errors (last 30 days)"
try {
    $ev = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='disk','Ntfs','Microsoft-Windows-Ntfs','volmgr'; Level=1,2; StartTime=(Get-Date).AddDays(-30)} -MaxEvents 10 -ErrorAction SilentlyContinue)
    if ($ev.Count) { $ev | ForEach-Object { W "  $($_.TimeCreated)  $(($_.Message -split "`n")[0])   <<< possible failing drive" } }
    else { W "  none" }
} catch { W "  none" }

# ========================================================= 11. NETWORK
H "11. NETWORK"
try {
    Get-NetAdapter -ErrorAction Stop | Where-Object Status -eq 'Up' | ForEach-Object {
        # LinkSpeed is already a string with its unit ("1 Gbps", "866.7 Mbps"); do not strip the unit.
        W ("  {0,-30} {1,-12} {2,-12} driver {3}" -f $_.Name, $_.Status, $_.LinkSpeed, $_.DriverVersion)
    }
    W ""
    Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.ServerAddresses } | ForEach-Object {
        W "  DNS on $($_.InterfaceAlias): $($_.ServerAddresses -join ', ')"
    }
} catch { W "  (could not read)" }

# ============================================================ 12. APPS
H "12. INSTALLED SOFTWARE"
try {
    $apps = @()
    foreach ($p in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
                   'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
                   'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*') {
        $apps += Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and -not $_.SystemComponent }
    }
    $apps = @($apps | Sort-Object DisplayName -Unique)
    W "  Total desktop programs installed: $($apps.Count)"
    W ""
    W "  Largest 15 by reported size:"
    # EstimatedSize is stored in KB, so KB / 1KB = MB.
    $apps | Where-Object EstimatedSize | Sort-Object EstimatedSize -Descending |
        Select-Object -First 15 | ForEach-Object {
            W ("    {0,-52} {1,6} MB" -f $_.DisplayName, [math]::Round($_.EstimatedSize/1KB))
        }
} catch {}

# ============================================================== SAVE
$file = Join-Path ([Environment]::GetFolderPath('Desktop')) "windows-audit-$(Get-Date -Format 'yyyy-MM-dd').txt"
try {
    $out -join "`r`n" | Out-File -FilePath $file -Encoding UTF8 -ErrorAction Stop
} catch {
    $file = Join-Path $env:TEMP "windows-audit-$(Get-Date -Format 'yyyy-MM-dd').txt"
    $out -join "`r`n" | Out-File -FilePath $file -Encoding UTF8
}
Write-Host ""
Write-Host ("=" * 74) -ForegroundColor Cyan
Write-Host "  Report saved to: $file" -ForegroundColor Cyan
Write-Host "  Send that file back to Claude to go through it together." -ForegroundColor Cyan
Write-Host ("=" * 74) -ForegroundColor Cyan
