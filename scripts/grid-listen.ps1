$ErrorActionPreference='Stop'
[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$engine=$null
try {
    $config=[Console]::In.ReadLine() | ConvertFrom-Json
    if ($config.commands.Count -gt 4000 -or $config.names.Count -gt 30) { throw 'Invalid grammar' }
    Add-Type -AssemblyName System.Speech
    $recognizer=[System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Where-Object {$_.Culture.Name -eq 'de-DE'} | Select-Object -First 1
    if ($null -eq $recognizer) { throw 'No German recognizer' }
    $engine=[System.Speech.Recognition.SpeechRecognitionEngine]::new($recognizer)
    $names=[System.Speech.Recognition.Choices]::new();$names.Add([string[]]$config.names)
    $namePart=[System.Speech.Recognition.GrammarBuilder]::new();$namePart.Culture=$recognizer.Culture;$namePart.Append($names)
    $please=[System.Speech.Recognition.GrammarBuilder]::new();$please.Culture=$recognizer.Culture;$please.Append('bitte')
    # Include explicit negations/reported speech so they can be rejected by the
    # deterministic parser instead of being silently reduced to a valid cell.
    $blocked=[System.Speech.Recognition.Choices]::new();$blocked.Add([string[]]@('nicht','bitte nicht','er sagte','wenn ich sage'))
    $blockedPart=[System.Speech.Recognition.GrammarBuilder]::new();$blockedPart.Culture=$recognizer.Culture;$blockedPart.Append($blocked)
    $commands=[System.Speech.Recognition.Choices]::new();$commands.Add([string[]]$config.commands)
    $builder=[System.Speech.Recognition.GrammarBuilder]::new();$builder.Culture=$recognizer.Culture
    $builder.Append($namePart,0,1);$builder.Append($please,0,1);$builder.Append($blockedPart,0,1);$builder.Append($commands)
    $engine.LoadGrammar([System.Speech.Recognition.Grammar]::new($builder))
    $engine.EndSilenceTimeout=[TimeSpan]::FromMilliseconds(180)
    $engine.EndSilenceTimeoutAmbiguous=[TimeSpan]::FromMilliseconds(300)
    $engine.SetInputToDefaultAudioDevice()
    Register-ObjectEvent -InputObject $engine -EventName SpeechRecognized -SourceIdentifier 'MouseGridSpeech' | Out-Null
    $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
    [Console]::Out.WriteLine('READY');[Console]::Out.Flush()
    while ($true) {
        $event=Wait-Event -SourceIdentifier 'MouseGridSpeech' -Timeout 1
        if ($null -eq $event) { continue }
        $result=$event.SourceEventArgs.Result
        $stop=$result.Text -match '^(?:(?:Jeffrey|Jeffry|Jeffri|Bronco|Bronko|Kelly|Kelli|Krak|Krack|James|Dscheims) )?(?:bitte )?(?:Stopp?|Stoppen|Maus stoppen|Maus anhalten|Hör auf|Brich ab|Abbrechen)$'
        if ($result.Confidence -ge 0.65 -or ($stop -and $result.Confidence -ge 0.45)) {
            [Console]::Out.WriteLine('TEXT|'+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($result.Text)))
            [Console]::Out.Flush()
        }
        Remove-Event -EventIdentifier $event.EventIdentifier
    }
} catch { [Console]::Out.WriteLine('ERROR|recognizer');[Console]::Out.Flush();exit 1 }
finally { if ($engine) { try{$engine.RecognizeAsyncCancel()}catch{};try{Unregister-Event -SourceIdentifier 'MouseGridSpeech'}catch{};$engine.Dispose() } }
