param([uint32]$OwnerPid, [long]$LastHandle=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
try {
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    [DesktopNative]::EnableDpi()
    $monitors=@([System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
        $number=0
        if ($_.DeviceName -match 'DISPLAY(\d+)$') { $number=[int]$Matches[1] }
        @{id=$_.DeviceName;number=$number;primary=$_.Primary;bounds=@{x=$_.Bounds.X;y=$_.Bounds.Y;width=$_.Bounds.Width;height=$_.Bounds.Height}}
    })
    $target=[DesktopNative]::Target($OwnerPid,$LastHandle)
    $window=$null
    if ($target -ne [IntPtr]::Zero) { $window=@{handle=$target.ToInt64().ToString();monitor=[System.Windows.Forms.Screen]::FromHandle($target).DeviceName} }
    $cursor=[System.Windows.Forms.Cursor]::Position
    @{monitors=$monitors;window=$window;cursor=@{x=$cursor.X;y=$cursor.Y}} | ConvertTo-Json -Depth 6 -Compress
} catch { [Console]::Error.Write('Desktop metadata unavailable.');exit 1 }
