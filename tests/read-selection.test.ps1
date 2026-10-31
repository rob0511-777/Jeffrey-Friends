# Runs with Windows PowerShell 5.1 or PowerShell 7. Fake UIA, no real desktop.
$ErrorActionPreference='Stop'
$source=Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts/read-selection.ps1'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Windows.Automation.Text;
namespace System.Windows.Automation.Text {
 public enum TextPatternRangeEndpoint { Start, End }
 public class TextPatternRange {
  public string Text;public bool Caret;public TextPatternRange(string t,bool c){Text=t;Caret=c;}
  public int CompareEndpoints(TextPatternRangeEndpoint a,TextPatternRange b,TextPatternRangeEndpoint c){System.Windows.Automation.TestFailure.Check("compare-endpoints");return Caret?0:-1;}
  public string GetText(int max){System.Windows.Automation.TestFailure.Check("get-text");return Text.Substring(0,Math.Min(max,Text.Length));}
 }
}
namespace System.Windows.Automation {
 public enum TreeScope { Subtree } public enum SupportedTextSelection { None, Single, Multiple }
 public static class TestFailure {public static void Check(string op){if(AutomationElement.Scenario=="fail-"+op||(AutomationElement.Scenario=="priority-fault"&&op=="get-text"))throw new InvalidOperationException("DO_NOT_LOG_SELECTED_TEXT");}}
 public class AutomationProperty {}
 public class PropertyCondition {
  public PropertyCondition(AutomationProperty p, object v) {
   if(AutomationElement.Scenario=="condition-error")throw new InvalidOperationException("DO_NOT_LOG_SELECTED_TEXT");
   if(!(v is bool))throw new ArgumentException("Expected Boolean");
  }
 }
 public class ElementNotAvailableException:Exception {}
 public class Info { public bool IsPassword {get;set;}public bool IsOffscreen {get;set;}public int ProcessId {get;set;}public Info(){ProcessId=42;} }

 public class TextPattern {
  public static object Pattern=new object();public SupportedTextSelection SupportedTextSelection {get{TestFailure.Check("supported-text-selection");return System.Windows.Automation.SupportedTextSelection.Single;}}
  public TextPatternRange[] Ranges;public TextPatternRange[] GetSelection(){TestFailure.Check("get-selection");return AutomationElement.Scenario=="null-selection"?null:Ranges;}
 }
 public class AutomationElement {
  public static string Scenario;public static AutomationProperty IsTextPatternAvailableProperty=new AutomationProperty();
  public static AutomationElement Root,Focus;private Info info=new Info();public bool FailCurrent;public Info Current {get{if(FailCurrent)throw new ElementNotAvailableException();if(Pattern!=null)TestFailure.Check("current");return info;}}public AutomationElement Parent;
  public TextPattern Pattern;public bool Fail;public static AutomationElement FocusedElement {get{return Focus;}}
  public static AutomationElement FromHandle(IntPtr h){return Root;}
  public bool TryGetCurrentPattern(object id,out object result){if(Fail)throw new ElementNotAvailableException();if(Pattern!=null)TestFailure.Check("try-get-current-pattern");result=Pattern;return result!=null;}
  public AutomationElement[] FindAll(TreeScope scope,PropertyCondition condition){return Candidates.ToArray();}
  public static List<AutomationElement> Candidates=new List<AutomationElement>();
  public static AutomationElement Item(string text,bool caret){return new AutomationElement{Pattern=new TextPattern{Ranges=new[]{new TextPatternRange(text,caret)}}};}
  public static void Setup(string scenario){
   Scenario=scenario;Root=new AutomationElement();Focus=null;Candidates.Clear();
   if(scenario=="unsupported"||scenario=="condition-error"||scenario=="init-error")return;
   var selected=Item("Unvertrauliche Testauswahl",false);selected.Parent=Root;
   if(scenario=="irrelevant-current-empty"){Candidates.Add(new AutomationElement{FailCurrent=true});Candidates.Add(Item("",true));return;}
   if(scenario=="irrelevant-pattern-empty"){Candidates.Add(new AutomationElement{Fail=true});Candidates.Add(Item("",true));return;}
   if(scenario=="priority-fault"){Candidates.Add(new AutomationElement{FailCurrent=true});Candidates.Add(selected);return;}
   if(scenario=="focus"){Focus=selected;return;}
   if(scenario=="focus-ancestor"){Focus=new AutomationElement{Parent=selected};return;}
   if(scenario=="focus-empty-fallback"){Focus=Item("",true);Focus.Parent=Root;Candidates.Add(selected);return;}
   if(scenario=="own-window"){Root.Current.ProcessId=999;Candidates.Add(selected);return;}
   if(scenario=="stale-only"){Candidates.Add(new AutomationElement{Fail=true});return;}
   if(scenario=="duplicate"){Candidates.Add(selected);Candidates.Add(Item("Unvertrauliche Testauswahl",false));return;}
   if(scenario=="ambiguous"){Candidates.Add(selected);Candidates.Add(Item("Andere Testauswahl",false));return;}
   if(scenario=="too-long"){Candidates.Add(Item(new string('a',24001),false));return;}
   if(scenario=="foreign-focus"){Focus=Item("FREMDE AUSWAHL",false);Candidates.Add(selected);return;}
   if(scenario=="own-focus"){Focus=Item("EIGENE AUSWAHL",false);Focus.Current.ProcessId=999;Candidates.Add(selected);return;}
   if(scenario=="stale-child"){Candidates.Add(new AutomationElement{Fail=true});Candidates.Add(selected);return;}
   if(scenario=="caret"){Candidates.Add(Item("",true));return;}
   if(scenario=="offscreen"){var hidden=Item("VERDECKTE AUSWAHL",false);hidden.Current.IsOffscreen=true;Candidates.Add(hidden);Candidates.Add(selected);return;}
   if(scenario=="password"){Root.Current.IsPassword=true;return;}
   Candidates.Add(selected);
  }
 }
 public class Automation {public static bool Compare(AutomationElement a,AutomationElement b){return Object.ReferenceEquals(a,b);}}
 public class TreeWalker {public static TreeWalker RawViewWalker=new TreeWalker();public AutomationElement GetParent(AutomationElement e){return e.Parent;}}
}
public static class DesktopNative {public static IntPtr Target(uint owner,long previous){return new IntPtr(123);}}
'@
$temp=Join-Path ([IO.Path]::GetTempPath()) ('jeffrey-uia-tests-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temp | Out-Null
Copy-Item $source (Join-Path $temp 'read-selection.ps1')
Set-Content (Join-Path $temp 'desktop-native.ps1') '# Mock metadata only.'
# Assemblies/types are already supplied by the fake implementation above.
function Add-Type { param($AssemblyName) if([System.Windows.Automation.AutomationElement]::Scenario -eq 'init-error'){throw 'DO_NOT_LOG_SELECTED_TEXT'} }
if([System.Windows.Automation.AutomationElement].Assembly.GetType('System.Windows.Automation.TextPatternRangeEndpoint')){throw 'Mock exposes wrong endpoint namespace'}
$failed=0;$passed=0
try {
 foreach($case in @(
  @('focus','ok'),@('descendants','ok'),@('foreign-focus','ok'),@('own-focus','ok'),
  @('stale-child','ok'),@('offscreen','ok'),@('caret','empty'),@('unsupported','unsupported'),
  @('condition-error','error'),@('init-error','error'),@('password','protected'),
  @('focus-ancestor','ok'),@('focus-empty-fallback','ok'),@('own-window','no-window'),
  @('stale-only','error'),@('duplicate','ok'),@('ambiguous','ambiguous'),@('too-long','too-long'),
  @('fail-current','error','current'),@('fail-try-get-current-pattern','error','try-get-current-pattern'),
  @('fail-supported-text-selection','error','supported-text-selection'),@('fail-get-selection','error','get-selection'),
  @('fail-compare-endpoints','error','compare-endpoints'),@('fail-get-text','error','get-text'),
  @('null-selection','empty'),@('irrelevant-current-empty','empty'),@('irrelevant-pattern-empty','empty'),@('priority-fault','error','get-text')
 )) {
  [System.Windows.Automation.AutomationElement]::Setup($case[0])
  try {
   $raw=& (Join-Path $temp 'read-selection.ps1') -OwnerPid 999 -LastHandle 123
   $result=($raw -join '') | ConvertFrom-Json
   if($result.status -ne $case[1]){throw ('Expected '+$case[1]+', got '+$result.status)}
   if($case[1] -eq 'ok' -and $result.text -ne 'Unvertrauliche Testauswahl'){throw 'Wrong target selection'}
   if($case[1] -ne 'ok' -and $result.text){throw 'Unexpected text on failure'}
   if($null -eq $result.diagnostic){throw 'Missing safe diagnostic'}
   if($case.Count -gt 2 -and $result.diagnostic.operation -ne $case[2]){throw ('Expected operation '+$case[2])}
   if($case.Count -gt 2 -and $result.diagnostic.hresult -notmatch '^0x[0-9A-F]{8}$'){throw 'Missing safe HRESULT'}
   if(($result.diagnostic | ConvertTo-Json -Compress) -match 'AUSWAHL|Testauswahl|DO_NOT_LOG'){throw 'Diagnostic leaked text'}
   $passed++;Write-Output ('PASS '+$case[0])
  }catch{$failed++;Write-Output ('FAIL '+$case[0]+': '+$_.Exception.Message)}
 }
 foreach($scenario in @('focus','fail-get-text')) {
  [System.Windows.Automation.AutomationElement]::Setup($scenario)
  try {
   $raw=(& (Join-Path $temp 'read-selection.ps1') -OwnerPid 999 -LastHandle 123 -DiagnosticOnly) -join ''
   $report=$raw | ConvertFrom-Json
   if($report.text -or $raw -match 'Testauswahl|DO_NOT_LOG|AUSWAHL'){throw 'Diagnostic-only mode leaked content'}
   if($null -eq $report.runtime -or $report.runtime.psVersion -notmatch '^\d+\.\d+'){throw 'Missing runtime metadata'}
   $passed++;Write-Output ('PASS diagnostic-only-'+$scenario)
  }catch{$failed++;Write-Output ('FAIL diagnostic-only-'+$scenario+': '+$_.Exception.Message)}
 }
 # Recreate the original wrong namespace against a faithful API contract.
 $copy=Join-Path $temp 'read-selection.ps1'
 $fixed=[IO.File]::ReadAllText($copy)
 try {
  [IO.File]::WriteAllText($copy,$fixed.Replace('System.Windows.Automation.Text.TextPatternRangeEndpoint','System.Windows.Automation.TextPatternRangeEndpoint'))
  [System.Windows.Automation.AutomationElement]::Setup('focus')
  $raw=(& $copy -OwnerPid 999 -LastHandle 123 -DiagnosticOnly) -join ''
  $report=$raw | ConvertFrom-Json
  if($report.status -ne 'error' -or $report.diagnostic.operation -ne 'compare-endpoints' -or $report.diagnostic.failureKind -ne 'type-not-found'){throw 'Wrong namespace not identified precisely'}
  if($report.text -or $raw -match 'Testauswahl|DO_NOT_LOG'){throw 'Namespace diagnostic leaked text'}
  $passed++;Write-Output 'PASS original-namespace-diagnosis'
 }catch{$failed++;Write-Output ('FAIL original-namespace-diagnosis: '+$_.Exception.Message)}
 finally{[IO.File]::WriteAllText($copy,$fixed)}
} finally { Remove-Item $temp -Recurse -Force }
Write-Output ("Results: $passed passed, $failed failed (mock UIA; not Windows verification)")
if($failed -gt 0){exit 1}
