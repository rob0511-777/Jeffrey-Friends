param([uint32]$OwnerPid, [long]$LastHandle=0, [switch]$DiagnosticOnly,
    [ValidateRange(0,15)][int]$DelaySeconds=0)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$script:supported=$false
$script:fault=$null
$script:selectionChecked=$false
$script:selectionFault=$false
$script:faultCount=0
$stage='initialize'
$operation='load-native'
function Record-Fault($where,$record,$operation='none',$route='none',$relevant=$false) {
    # Fixed metadata only: never expose Message, StackTrace, HWND, names or text.
    $cause=$record.Exception.GetBaseException()
    $code='provider-error'
    $kind='unknown'
    if ($where -eq 'initialize') { $code='initialization-failed' }
    elseif ($cause -is [System.UnauthorizedAccessException]) { $code='access-denied' }
    elseif ($cause.GetType().Name -eq 'ElementNotAvailableException') { $code='element-unavailable' }
    if ($record.FullyQualifiedErrorId -eq 'TypeNotFound') { $kind='type-not-found' }
    elseif ($cause -is [System.UnauthorizedAccessException]) { $kind='access-denied' }
    elseif ($cause -is [System.InvalidOperationException]) { $kind='invalid-operation' }
    elseif ($cause -is [System.ArgumentException]) { $kind='argument' }
    elseif ($cause -is [System.Runtime.InteropServices.COMException]) { $kind='com' }
    elseif ($cause.GetType().Name -eq 'ElementNotAvailableException') { $kind='element-unavailable' }
    elseif ($cause.GetType().Name -in @('MethodException','MethodInvocationException','PSInvalidCastException')) { $kind='binding' }
    $hresult='0x{0:X8}' -f ([uint32]([int64]$cause.HResult -band 4294967295L))
    $script:faultCount=[Math]::Min(99,$script:faultCount+1)
    if ($relevant) { $script:selectionFault=$true }
    # Prefer a failure on a known TextPattern over an unrelated metadata failure.
    if ($null -eq $script:fault -or ($relevant -and -not $script:fault.relevant)) {
        $script:fault=@{stage=$where;code=$code;operation=$operation;route=$route;failureKind=$kind;hresult=$hresult;relevant=$relevant}
    }
}
function Result($status,$text='',$route='none') {
    $codes=@{ok='none';empty='no-selection';unsupported='no-text-pattern';protected='password-field';'no-window'='no-window';ambiguous='multiple-selections';'too-long'='selection-limit';error='provider-error'}
    $diagnostic=@{stage='selection';code=$codes[$status];route=$route;operation='none';failureKind='none';hresult='0x00000000';ignoredErrors=0}
    if ($status -eq 'no-window') { $diagnostic.stage='target' }
    if ($script:fault) {
        if ($status -eq 'error' -or $status -in @('ok','empty')) {
            $diagnostic.stage=$script:fault.stage;$diagnostic.operation=$script:fault.operation
            $diagnostic.route=$script:fault.route;$diagnostic.failureKind=$script:fault.failureKind;$diagnostic.hresult=$script:fault.hresult
            if ($status -eq 'error') { $diagnostic.code=$script:fault.code }
            else { $diagnostic.code='partial-provider-error';$diagnostic.ignoredErrors=$script:faultCount }
        }
    }
    $result=@{status=$status;text=$text;diagnostic=$diagnostic}
    if ($DiagnosticOnly) {
        $result.text=''
        $result.runtime=@{psVersion=$PSVersionTable.PSVersion.ToString();edition=$PSVersionTable.PSEdition;apartment=[System.Threading.Thread]::CurrentThread.GetApartmentState().ToString();is64Bit=[Environment]::Is64BitProcess}
    }
    $result | ConvertTo-Json -Compress -Depth 4
}
function Read-Element($element,$route) {
    if ($null -eq $element) { return $null }
    $operation='current';$hasPattern=$false
    try {
        # Explicit getters make provider exceptions catchable instead of allowing
        # PowerShell's property adapter to silently substitute a null value.
        $info=$element.get_Current()
        if ($info.get_IsPassword() -or $info.get_IsOffscreen() -or $info.get_ProcessId() -eq $OwnerPid) { return $null }
        $pattern=$null
        $operation='try-get-current-pattern'
        if (-not $element.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern,[ref]$pattern)) { return $null }
        $hasPattern=$true
        $operation='supported-text-selection'
        if ($pattern.get_SupportedTextSelection() -eq [System.Windows.Automation.SupportedTextSelection]::None) { return $null }
        $script:supported=$true
        $operation='get-selection'
        # GetSelection may legitimately return null when there is no caret.
        $ranges=@($pattern.GetSelection() | Where-Object { $null -ne $_ })
        if ($ranges.Count -gt 8) { return @{status='too-long';text=''} }
        $parts=[System.Collections.Generic.List[string]]::new()
        foreach ($range in $ranges) {
            $operation='compare-endpoints'
            if ($range.CompareEndpoints([System.Windows.Automation.Text.TextPatternRangeEndpoint]::Start,$range,[System.Windows.Automation.Text.TextPatternRangeEndpoint]::End) -eq 0) { continue }
            $operation='get-text'
            $value=$range.GetText(24001)
            if ($value.Length -gt 24000) { return @{status='too-long';text=''} }
            if (-not [string]::IsNullOrWhiteSpace($value)) { $parts.Add($value) }
        }
        $value=[string]::Join("`n",$parts)
        if ($value.Length -gt 24000) { return @{status='too-long';text=''} }
        $script:selectionChecked=$true
        if ($value.Length -gt 0) { return @{status='ok';text=$value} }
    } catch { Record-Fault 'selection' $_ $operation $route $hasPattern }
    return $null
}
try {
    . (Join-Path $PSScriptRoot 'desktop-native.ps1')
    $operation='load-uia-types'
    Add-Type -AssemblyName UIAutomationTypes
    $operation='load-uia-client'
    Add-Type -AssemblyName UIAutomationClient
    if ($DiagnosticOnly -and $DelaySeconds -gt 0) { Start-Sleep -Seconds $DelaySeconds }
    $stage='target'
    $operation='target-window'
    $target=[DesktopNative]::Target($OwnerPid,$LastHandle)
    if ($target -eq [IntPtr]::Zero) { Result 'no-window';exit 0 }
    $operation='from-handle'
    $root=[System.Windows.Automation.AutomationElement]::FromHandle($target)
    $operation='current'
    if ($null -eq $root -or $root.get_Current().get_ProcessId() -eq $OwnerPid) { Result 'no-window';exit 0 }
    if ($root.get_Current().get_IsPassword()) { Result 'protected';exit 0 }
    # Try the actually focused control and its TextPattern ancestors first, but
    # only after proving the entire chain belongs to the selected target window.
    try {
        $chain=[System.Collections.Generic.List[System.Windows.Automation.AutomationElement]]::new()
        $operation='focused-element'
        $element=[System.Windows.Automation.AutomationElement]::get_FocusedElement()
        for ($depth=0;$null -ne $element -and $depth -lt 64;$depth++) {
            $operation='current'
            if ($element.get_Current().get_ProcessId() -eq $OwnerPid) { break }
            $chain.Add($element)
            $operation='compare-elements'
            if ([System.Windows.Automation.Automation]::Compare($element,$root)) {
                foreach ($candidate in $chain) {
                    $selection=Read-Element $candidate 'focus'
                    if ($selection) { Result $selection.status $selection.text 'focus';exit 0 }
                }
                break
            }
            $operation='get-parent'
            $element=[System.Windows.Automation.TreeWalker]::RawViewWalker.GetParent($element)
        }
    } catch { Record-Fault 'focus' $_ $operation 'focus' }
    $selection=Read-Element $root 'root'
    if ($selection) { Result $selection.status $selection.text 'root';exit 0 }
    $stage='condition'
    $operation='property-condition'
    # Explicit overload/Boolean binding avoids New-Object argument coercion in
    # Windows PowerShell. Never infer lack of support from a constructor failure.
    $condition=[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::IsTextPatternAvailableProperty,[bool]$true)
    $stage='enumerate'
    $operation='find-all'
    $elements=$root.FindAll([System.Windows.Automation.TreeScope]::Subtree,$condition)
    if ($elements.Count -gt 2000) {
        $script:fault=@{stage='enumerate';code='query-limit';operation='find-all';route='descendants';failureKind='none';hresult='0x00000000'};Result 'error';exit 0
    }
    $selections=[System.Collections.Generic.List[string]]::new()
    foreach ($element in $elements) {
        # An individual stale browser/Notepad element must not hide a usable one.
        $selection=Read-Element $element 'descendants'
        if ($selection -and $selection.status -eq 'too-long') { Result 'too-long' '' 'descendants';exit 0 }
        if ($selection -and -not $selections.Contains($selection.text)) { $selections.Add($selection.text) }
    }
    if ($selections.Count -eq 1) { Result 'ok' $selections[0] 'descendants' }
    elseif ($selections.Count -gt 1) { Result 'ambiguous' '' 'descendants' }
    elseif ($script:selectionFault) { Result 'error' }
    elseif ($script:selectionChecked) { Result 'empty' '' 'descendants' }
    elseif ($script:fault) { Result 'error' }
    elseif ($script:supported) { Result 'empty' '' 'descendants' }
    else { Result 'unsupported' }
} catch {
    Record-Fault $stage $_ $operation
    Result 'error'
}
