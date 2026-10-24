# Jeffrey v0.6.6 – Prüfprotokoll

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


## Stufe 4.4: Bronco

- 88/88 Node.js-Tests erfolgreich.
- 4. Charakter inklusive eigenem gespeicherten Stimmenprofil und Windows-Weckwort im Code geprüft.
- Getrennte Kopf-, Hand- und Kieferbilder als Vorschau zusammengesetzt.
- Kein echter Windows-Audio-/Mikrofontest und kein vollständiger Browser-/Electron-Lauf möglich.

## Stufe 4.5 – rauerer und grantigerer Bronco

- 93/93 Node-Tests erfolgreich (`node --test tests/*.test.cjs`).
- Neue Tests für Bronco-Stimmanweisungen, genervtes Begrüßungsverhalten, Web-Audio-Sättigung und unveränderte Stimmen der anderen Figuren.
- Stimmfilter und gesprochene Begrüßung sind nur für Bronco aktiv.
- Manueller Klangtest unter Windows mit API-Schlüssel ist noch erforderlich; durch einen echten Live-Test können geringe API-Kosten anfallen.


## Stufe 4.6 – tiefere, härtere Bronco-Stimme (v0.6.7)

- 97 automatisierte Tests erfolgreich, inklusive Grenzprüfung der Filtereinstellung und Simulation einer gesenkten Sinus-Tonhöhe.
- Neue lokale AudioWorklet-Verarbeitung und ScriptProcessor-Fallback syntaxgeprüft.
- **Kein echter Windows-Klangtest durchgeführt**: Die subjektive Härte, Tonqualität und der AudioWorklet-Zugriff müssen auf dem Zielrechner geprüft werden.
- Kein API-Schlüssel und keine kostenpflichtige Realtime-Sitzung bei der Paketprüfung verwendet.


## Version 0.6.9
Gezielter Test: `node --test tests/stage48.test.cjs`. Komplette Testsuite: `npm test`. Weiterhin echten Wechsel Bronco → Schlafmodus → Bronco sowie Bronco → Kelly → Bronco am Windows-PC prüfen.
