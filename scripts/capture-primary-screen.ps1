# One explicit request, one selected-screen copy; no files, clipboard or input actions.
param([int]$X=0, [int]$Y=0, [int]$Width=0, [int]$Height=0)
$ErrorActionPreference = 'Stop'
$bitmap = $null
$graphics = $null
$scaled = $null
$scaledGraphics = $null
$stream = $null
$parameters = $null
$bytes = $null
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    # Physical pixels also on monitors with Windows display scaling enabled.
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    [DesktopNative]::EnableDpi()
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    if ($Width -gt 0 -and $Height -gt 0) {
        $bounds = New-Object System.Drawing.Rectangle($X,$Y,$Width,$Height)
        # Refuse stale coordinates after hotplug; never copy an arbitrary desktop rectangle.
        $matches = @([System.Windows.Forms.Screen]::AllScreens | Where-Object { $_.Bounds.Equals($bounds) })
        if ($matches.Count -ne 1) { throw 'Target display changed' }
    }
    if ($bounds.Width -le 0 -or $bounds.Height -le 0) { throw 'No primary screen' }
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $ratio = [Math]::Min(1.0, 1600.0 / [Math]::Max($bounds.Width, $bounds.Height))
    $width = [Math]::Max(1, [int]($bounds.Width * $ratio))
    $height = [Math]::Max(1, [int]($bounds.Height * $ratio))
    $scaled = New-Object System.Drawing.Bitmap($width, $height)
    $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaled)
    $scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scaledGraphics.DrawImage($bitmap, 0, 0, $width, $height)
    $stream = New-Object System.IO.MemoryStream
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
    $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)
    $scaled.Save($stream, $codec, $parameters)
    $bytes = $stream.ToArray()
    [Console]::Out.Write([Convert]::ToBase64String($bytes))
} catch {
    # Do not expose desktop data or native error details through stderr.
    [Console]::Error.Write('Screen capture unavailable.')
    exit 1
} finally {
    if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
    if ($stream) { [Array]::Clear($stream.GetBuffer(), 0, [int]$stream.Length); $stream.Dispose() }
    if ($parameters) { $parameters.Dispose() }
    if ($scaledGraphics) { $scaledGraphics.Dispose() }
    if ($scaled) { $scaled.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
}
