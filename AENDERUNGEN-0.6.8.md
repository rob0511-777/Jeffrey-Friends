# Jeffrey & Friends 0.6.8 – Bronco-Tonfehler beim Wiederaufruf

- `bronco-voice.js`: Wiederverwendbarer `AudioContext` statt Schließen nach jedem Gespräch. Alle Verbindungen eines beendeten Effekts werden getrennt; die ausgehende Effektspur wird gestoppt. Der gemeinsame Audio-Kontext wird nur beim endgültigen Schließen der Steuerungs-App freigegeben.
- `bronco-voice.js`: Einmaliges Registrieren des Pitch-Worklets pro Audio-Kontext; wiederholte Registrierung konnte beim zweiten Start fehlschlagen.
- `realtime.js`: Fällt der lokale Effekt aus oder ist seine Engine nicht mehr aktiv, wird automatisch auf den unveränderten WebRTC-Ton zurückgeschaltet, anstatt Bronco stumm zu schalten. Health-Timer wird bei jeder Gesprächsbeendigung abgeräumt.
- `tests/stage47.test.cjs`: Regressionstests für zweimaliges Aufwecken, Wiederverwendung des Audio-Kontexts, Worklet-Registrierung und Fallback.
- Keine Änderungen an OpenAI-API-Schlüssel, Kosten, anderen Figuren, Animationen oder Sicherheitsregeln.

*Wichtig:* Automatisierte Tests mit gemockter Audio-Engine prüfen die Logik. Die tatsächliche Windows-Audioausgabe wurde hier nicht ausgeführt und muss mit einem Sprachtest unter Windows validiert werden.
