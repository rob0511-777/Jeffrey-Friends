param(
    [ValidateRange(0.30,0.90)]
    [double]$MinConfidence = 0.42,
    [ValidateSet('Jeffrey','Kelly','Krak')]
    [string]$WakeName = 'Jeffrey'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
    Add-Type -AssemblyName System.Speech
    $available = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
    $selected = $available | Where-Object { $_.Culture.Name -eq 'de-DE' } | Select-Object -First 1
    if ($null -eq $selected) {
        [Console]::Out.WriteLine('ERROR|Kein deutscher Windows-Desktop-Spracherkenner (System.Speech) installiert. Unter Windows Sprache > Deutsch > Sprachfunktionen pruefen.')
        exit 2
    }
    $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine -ArgumentList $selected
    try {
        $choices = New-Object System.Speech.Recognition.Choices
        # Nur den Namen und nahe deutsche Aussprachen akzeptieren.
        # Das Erkennungsvokabular bleibt absichtlich klein (weniger Fehlaktivierungen).
        if ($WakeName -eq 'Kelly') {
            $words = @('Kelly','Kelli','Kelley','Hallo Kelly','Hey Kelly','Hallo Kelli')
        } elseif ($WakeName -eq 'Krak') {
            $words = @('Krak','Krack','Krakk','Krag','Kraak','Crack','Hallo Krak','Hey Krak','Hallo Krack','Hallo Krag')
        } else {
            $words = @('Jeffrey','Jeffry','Jeffri','Jeffray','Jeffrei','Dscheffri','Dscheffrey','Tscheffri','Hallo Jeffrey','Hey Jeffrey','Hallo Jeffry','Hey Jeffry','Hallo Roboter','Hey Roboter')
        }
        $choices.Add([string[]]$words)
        $builder = New-Object System.Speech.Recognition.GrammarBuilder
        $builder.Culture = $selected.Culture
        $builder.Append($choices)
        $grammar = New-Object System.Speech.Recognition.Grammar -ArgumentList $builder
        $engine.LoadGrammar($grammar)
        # Bei nur 2-3 Silben früher abschließen, ohne auf eine lange Pause zu warten.
        try { $engine.EndSilenceTimeout = [TimeSpan]::FromMilliseconds(280) } catch {}
        try { $engine.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromMilliseconds(550) } catch {}
        $engine.SetInputToDefaultAudioDevice()
        Register-ObjectEvent -InputObject $engine -EventName SpeechRecognized -SourceIdentifier 'JeffreyWakeRecognized' | Out-Null
        Register-ObjectEvent -InputObject $engine -EventName SpeechRecognitionRejected -SourceIdentifier 'JeffreyWakeRejected' | Out-Null
        $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
        [Console]::Out.WriteLine('READY|' + $selected.Culture.Name)
        [Console]::Out.Flush()
        $lastMiss = [DateTime]::MinValue
        while ($true) {
            $ev = Wait-Event -Timeout 1
            if ($null -eq $ev) { continue }
            if ($ev.SourceIdentifier -eq 'JeffreyWakeRecognized') {
                $r = $ev.SourceEventArgs.Result
                if ($null -ne $r) {
                    $confidence = [Math]::Round($r.Confidence * 100)
                    if ($r.Confidence -ge $MinConfidence) {
                        [Console]::Out.WriteLine('WAKE|' + $confidence)
                    } else {
                        [Console]::Out.WriteLine('LOW|' + $confidence)
                    }
                }
            } elseif ($ev.SourceIdentifier -eq 'JeffreyWakeRejected') {
                # Diagnose: Windows hat Sprache gehoert, aber die Grammatik nicht erkannt.
                # Keine Aufzeichnung und keine Transkription dieser anderen Sprache.
                if (([DateTime]::UtcNow - $lastMiss).TotalSeconds -ge 6) {
                    [Console]::Out.WriteLine('MISS|')
                    $lastMiss = [DateTime]::UtcNow
                }
            }
            [Console]::Out.Flush()
            Remove-Event -EventIdentifier $ev.EventIdentifier
        }
    } finally {
        try { $engine.RecognizeAsyncCancel() } catch {}
        try { Unregister-Event -SourceIdentifier 'JeffreyWakeRecognized' } catch {}
        try { Unregister-Event -SourceIdentifier 'JeffreyWakeRejected' } catch {}
        $engine.Dispose()
    }
} catch {
    $msg = $_.Exception.Message -replace '[\r\n|]', ' '
    [Console]::Out.WriteLine("ERROR|$msg")
    [Console]::Out.Flush()
    exit 1
}
