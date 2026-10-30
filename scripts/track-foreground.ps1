param([uint32]$OwnerPid)
$ErrorActionPreference='Stop'
try {
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    $hook=[DesktopNative]::Observe($OwnerPid)
    if ($hook -eq [IntPtr]::Zero) { exit 1 }
    try { [System.Windows.Forms.Application]::Run() }
    finally { [void][DesktopNative]::UnhookWinEvent($hook) }
} catch { exit 1 }
