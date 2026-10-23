$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Speech
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $text = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($text)) { exit 0 }
    $voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $installed = @($voice.GetInstalledVoices() | Where-Object { $_.Enabled })
        $de = $installed | Where-Object { $_.VoiceInfo.Culture.Name -eq 'de-DE' } | Select-Object -First 1
        if ($null -ne $de) { $voice.SelectVoice($de.VoiceInfo.Name) }
        $voice.Rate = 0
        $voice.Speak($text)
    } finally { $voice.Dispose() }
} catch {
    Write-Output ('ERROR|' + ($_.Exception.Message -replace '[\r\n|]', ' '))
    exit 1
}
