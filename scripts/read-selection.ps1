param([uint32]$OwnerPid, [long]$LastHandle=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
function Result($status,$text='') { @{status=$status;text=$text} | ConvertTo-Json -Compress }
try {
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    $target=[DesktopNative]::Target($OwnerPid,$LastHandle)
    if ($target -eq [IntPtr]::Zero) { Result 'no-window';exit 0 }
    $root=[System.Windows.Automation.AutomationElement]::FromHandle($target)
    if ($null -eq $root -or $root.Current.IsPassword) { Result 'unsupported';exit 0 }
    $condition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::IsTextPatternAvailableProperty,$true)
    $elements=$root.FindAll([System.Windows.Automation.TreeScope]::Subtree,$condition)
    if ($elements.Count -gt 2000) { Result 'unsupported';exit 0 }
    $selections=New-Object 'System.Collections.Generic.List[string]'
    $supported=$false
    foreach ($element in $elements) {
        if ($element.Current.IsPassword -or $element.Current.ProcessId -eq $OwnerPid) { continue }
        $pattern=$null
        if (-not $element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern,[ref]$pattern)) { continue }
        if ($pattern.SupportedTextSelection -eq [System.Windows.Automation.SupportedTextSelection]::None) { continue }
        $supported=$true
        $ranges=$pattern.GetSelection()
        if ($ranges.Count -gt 8) { Result 'too-long';exit 0 }
        $parts=New-Object 'System.Collections.Generic.List[string]'
        foreach ($range in $ranges) {
            # Degenerate caret ranges are not selections.
            if ($range.CompareEndpoints([System.Windows.Automation.TextPatternRangeEndpoint]::Start,$range,[System.Windows.Automation.TextPatternRangeEndpoint]::End) -eq 0) { continue }
            $value=$range.GetText(24001)
            if ($value.Length -gt 24000) { Result 'too-long';exit 0 }
            if (-not [string]::IsNullOrWhiteSpace($value)) { $parts.Add($value) }
        }
        $value=[string]::Join("`n",$parts)
        if ($value.Length -gt 24000) { Result 'too-long';exit 0 }
        if ($value.Length -gt 0 -and -not $selections.Contains($value)) { $selections.Add($value) }
    }
    if ($selections.Count -eq 1) { Result 'ok' $selections[0] }
    elseif ($selections.Count -gt 1) { Result 'ambiguous' }
    elseif ($supported) { Result 'empty' }
    else { Result 'unsupported' }
} catch { Result 'unsupported' }
