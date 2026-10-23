# Jeffrey v0.6.4 – Prüfprotokoll

## Automatisch bestätigt

- 86 Node.js-Tests bestanden, einschließlich aller bisherigen Sprach-, Figuren-, Sicherheits-, Gedächtnis-, Browser- und PC-Funktionen.
- JavaScript-Syntax von `lip-sync.js`, `lip-sync-runtime.js`, `preview-state-v5.js`, `renderer.js` und `realtime.js` geprüft.
- Feste `lipSequence` und der 115-ms-Bildwechsel sind entfernt.
- Der echte WebRTC-Ausgabestream wird über `createMediaStreamSource` analysiert.
- Audiopegel und drei Frequenzbereiche steuern die Pose; Transkript-Deltas liefern vorrangige Visemes.
- Pausen ergeben `sil` mit Lippen- und Kieferwert 0.
- Analyse-RAF, Audioquelle, Analyser und AudioContext werden beim Sitzungsende freigegeben.
- Neutralframes wurden per Pixelvergleich identifiziert: Kelly 2, Krak 3. Offene AA-Frames: Kelly 4, Krak 0.
- Keine zusätzliche Cloud-Abhängigkeit und kein neuer kostenpflichtiger API-Aufruf.

## Visuelle Prüfung

- `VORSCHAU.html` enthält eine interaktive, ausdrücklich als Simulation markierte Prüfleiste.
- Kelly und Krak können getrennt gewählt werden; alle Viseme sowie eine kurze Sequenz sind abrufbar.
- Die deterministische Vorschau verwendet dieselben reduzierten Transformationswerte wie die Laufzeit. Der Regressionstest bestätigt zusätzlich, dass keine künstlichen Augen-Elemente mehr im DOM erzeugt werden.

## Noch manuell auf dem Ziel-PC zu prüfen

- Tatsächliche Realtime-Sprachantwort mit hörbarer Windows-Ausgabe.
- Subjektive Lippenwirkung bei mehreren deutschen Sätzen und beiden Stimmen.
- Augenbewegungen bleiben deaktiviert, bis getrennte Augen- oder Lid-Assets vorhanden sind; dadurch können keine künstlichen schwarzen Augenbalken mehr entstehen.
- Mikrofon, Weckwort und Audioausgabe unter den lokalen Windows-Datenschutzeinstellungen.

Keine kostenpflichtige OpenAI-Sprachsitzung wurde während der automatischen Prüfung gestartet.
