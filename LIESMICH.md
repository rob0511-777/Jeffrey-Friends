# Jeffrey & Friends v0.6.4 – Stufe 4.3

Jeffrey, Kelly und Krak sind Windows-11-Desktop-Assistenten mit OpenAI-Realtime-Sprachgesprächen. In Stufe 4.3 erhalten Kelly und Krak ein lokales, audio-synchronisiertes 2D-Viseme-Rig. Die bisherige feste Mundbildfolge ist entfernt.

## Start unter Windows

1. Eine ältere Jeffrey-Version vollständig über das Symbol im Infobereich beenden.
2. Diese Fassung vollständig in einen eigenen Ordner entpacken. Nicht über Version 0.6.2 kopieren.
3. `START-Windows.cmd` doppelklicken. Beim ersten Start installiert NPM die in `package.json` festgelegte Electron-Version.
4. Oben Kelly, Krak oder Jeffrey auswählen und `🎙️ Live sprechen` anklicken.
5. Alternativ die lokale Weckwort-Erkennung aktivieren und den Namen der gewählten Figur sagen.

Der API-Schlüssel bleibt in der vorhandenen, geschützten Windows-Konfiguration. Er gehört nie in Projektdateien, Screenshots oder Chatnachrichten.

## Neue Lippen-Synchronisation

- Die Analyse liest direkt den tatsächlich empfangenen WebRTC-Audiostream.
- Laufende Antwort-Transkripte bestimmen nach Möglichkeit die Viseme; Frequenzbänder liefern den lokalen Fallback.
- Stille schließt den Mund nach kurzer Entprellung.
- Lippenformen werden weich überblendet und der Mundbereich erhält eine kleine Kieferdeformation.
- Kopf und Hände bleiben vom Mund-Rig unabhängig. Die fehleranfällige künstliche Blinkebene wurde in v0.6.4 entfernt.

Die Methode ist transkriptgestützte Viseme-Schätzung. Sie besitzt keine vom Server gelieferten Phonem-Zeitmarken und ist daher keine Studio-Forced-Alignment-Lösung. Details stehen in `ANIMATION-ARCHITEKTUR.md`.

## Visuelle Prüfung ohne API-Kosten

`VORSCHAU.html` im Browser öffnen. Danach:

1. Kelly wählen und `Kelly rufen` anklicken.
2. `AA`, `EE`, `OH`, `FV` und `MM` einzeln prüfen.
3. `▶ Sequenz` starten und auf weiche Übergänge sowie einen geschlossenen Mund in den Pausen achten.
4. Dasselbe für Krak wiederholen.

Die Vorschau ist deutlich mit `SIMULATION – kein echtes Audio` gekennzeichnet. Die reale Synchronisation muss zusätzlich in der Windows-App mit einer tatsächlichen Realtime-Antwort geprüft werden; dieser Test kann API-Kosten verursachen und wurde bei der Erstellung nicht automatisch gestartet.

## Automatische Prüfung

```powershell
npm test
```

Die Tests prüfen den Viseme-Kern, die Audio-/Transkriptanbindung, Cleanup, Frame-Zuordnung und alle bisherigen Funktionen.

## Beenden und Kostenschutz

`[Name], verschwinde!`, `[Name], geh weg!` oder während des Gesprächs `Verschwinde!` beendet die Verbindung. Nach 45 Sekunden Gesprächspause wird sie ebenfalls getrennt. Der Schlafmodus schließt laufende Sprachverbindungen und stoppt die Animation.
