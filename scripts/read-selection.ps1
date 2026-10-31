param([uint32]$OwnerPid, [long]$LastHandle=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$script:supported=$false
$script:fault=$null
$stage='initialize'
function Record-Fault($where,$exception) {
    # Fixed metadata only: never expose Message, StackTrace, HWND, names or text.
    $cause=$exception.GetBaseException()
    $code='provider-error'
    if ($where -eq 'initialize') { $code='initialization-failed' }
    elseif ($cause -is [System.UnauthorizedAccessException]) { $code='access-denied' }
    elseif ($cause.GetType().Name -eq 'ElementNotAvailableException') { $code='element-unavailable' }
    if ($null -eq $script:fault) { $script:fault=@{stage=$where;code=$code} }
}
function Result($status,$text='',$route='none') {
    $codes=@{ok='none';empty='no-selection';unsupported='no-text-pattern';protected='password-field';'no-window'='no-window';ambiguous='multiple-selections';'too-long'='selection-limit';error='provider-error'}
    $diagnostic=@{stage='selection';code=$codes[$status];route=$route}
    if ($status -eq 'no-window') { $diagnostic.stage='target' }
    if ($script:fault) {
        if ($status -eq 'error') { $diagnostic.stage=$script:fault.stage;$diagnostic.code=$script:fault.code }
        elseif ($status -eq 'ok') { $diagnostic.code='partial-provider-error' }
    }
    @{status=$status;text=$text;diagnostic=$diagnostic} | ConvertTo-Json -Compress
}
function Read-Element($element) {
    if ($null -eq $element) { return $null }
    try {
        $info=$element.Current
        if ($info.IsPassword -or $info.IsOffscreen -or $info.ProcessId -eq $OwnerPid) { return $null }
        $pattern=$null
        if (-not $element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern,[ref]$pattern)) { return $null }
        if ($pattern.SupportedTextSelection -eq [System.Windows.Automation.SupportedTextSelection]::None) { return $null }
        $script:supported=$true
        $ranges=@($pattern.GetSelection())
        if ($ranges.Count -gt 8) { return @{status='too-long';text=''} }
        $parts=[System.Collections.Generic.List[string]]::new()
        foreach ($range in $ranges) {
            if ($range.CompareEndpoints([System.Windows.Automation.TextPatternRangeEndpoint]::Start,$range,[System.Windows.Automation.TextPatternRangeEndpoint]::End) -eq 0) { continue }
            $value=$range.GetText(24001)
            if ($value.Length -gt 24000) { return @{status='too-long';text=''} }
            if (-not [string]::IsNullOrWhiteSpace($value)) { $parts.Add($value) }
        }
        $value=[string]::Join("`n",$parts)
        if ($value.Length -gt 24000) { return @{status='too-long';text=''} }
        if ($value.Length -gt 0) { return @{status='ok';text=$value} }
    } catch { Record-Fault 'selection' $_.Exception }
    return $null
}
try {
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    Add-Type -AssemblyName UIAutomationTypes
    Add-Type -AssemblyName UIAutomationClient
    $stage='target'
    $target=[DesktopNative]::Target($OwnerPid,$LastHandle)
    if ($target -eq [IntPtr]::Zero) { Result 'no-window';exit 0 }
    $root=[System.Windows.Automation.AutomationElement]::FromHandle($target)
    if ($null -eq $root -or $root.Current.ProcessId -eq $OwnerPid) { Result 'no-window';exit 0 }
    if ($root.Current.IsPassword) { Result 'protected';exit 0 }
    # Try the actually focused control and its TextPattern ancestors first, but
    # only after proving the entire chain belongs to the selected target window.
    try {
        $chain=[System.Collections.Generic.List[System.Windows.Automation.AutomationElement]]::new()
        $element=[System.Windows.Automation.AutomationElement]::FocusedElement
        for ($depth=0;$null -ne $element -and $depth -lt 64;$depth++) {
            if ($element.Current.ProcessId -eq $OwnerPid) { break }
            $chain.Add($element)
            if ([System.Windows.Automation.Automation]::Compare($element,$root)) {
                foreach ($candidate in $chain) {
                    $selection=Read-Element $candidate
                    if ($selection) { Result $selection.status $selection.text 'focus';exit 0 }
                }
                break
            }
            $element=[System.Windows.Automation.TreeWalker]::RawViewWalker.GetParent($element)
        }
    } catch { Record-Fault 'focus' $_.Exception }
    $selection=Read-Element $root
    if ($selection) { Result $selection.status $selection.text 'root';exit 0 }
    $stage='condition'
    # Explicit overload/Boolean binding avoids New-Object argument coercion in
    # Windows PowerShell. Never infer lack of support from a constructor failure.
    $condition=[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::IsTextPatternAvailableProperty,[bool]$true)
    $stage='enumerate'
    $elements=$root.FindAll([System.Windows.Automation.TreeScope]::Subtree,$condition)
    if ($elements.Count -gt 2000) {
        $script:fault=@{stage='enumerate';code='query-limit'};Result 'error';exit 0
    }
    $selections=[System.Collections.Generic.List[string]]::new()
    foreach ($element in $elements) {
        # An individual stale browser/Notepad element must not hide a usable one.
        $selection=Read-Element $element
        if ($selection -and $selection.status -eq 'too-long') { Result 'too-long' '' 'descendants';exit 0 }
        if ($selection -and -not $selections.Contains($selection.text)) { $selections.Add($selection.text) }
    }
    if ($selections.Count -eq 1) { Result 'ok' $selections[0] 'descendants' }
    elseif ($selections.Count -gt 1) { Result 'ambiguous' '' 'descendants' }
    elseif ($script:fault) { Result 'error' }
    elseif ($script:supported) { Result 'empty' '' 'descendants' }
    else { Result 'unsupported' }
} catch {
    Record-Fault $stage $_.Exception
    Result 'error'
}
