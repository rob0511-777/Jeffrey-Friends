$ErrorActionPreference='Stop'
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'physical-mouse.cs')
    [PhysicalMouse]::Run()
} catch { [Console]::Out.WriteLine('ERROR|startup');[Console]::Out.Flush();exit 1 }
