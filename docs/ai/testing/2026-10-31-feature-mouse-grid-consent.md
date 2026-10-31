# Koordinatennetz und dauerhafte Zustimmungen – Testnachweis

Branch `feature/mouse-grid-consent`, Basis `feature/desktop-vision-2` auf
`178277ebc7fee8b103dda4b58e1d077360844bac`. PR #4 ist offen und ungemergt;
keine Änderung an seinem Branch oder seiner Beschreibung. Neuer gestapelter PR.

Ausführung: Linux am 31.10.2026, Node v24.19.0, portable PowerShell 7.4.7.
**Keine reale Windows-Ausführung, keine echten Cursor-/Mikrofon-/Monitorprüfungen,
keine kostenpflichtigen Live-API-Aufrufe.**

## Implementierung und betroffene Dateien

| Bereich | Dateien |
| --- | --- |
| Ganzzahlige Raster-/Regionsberechnung | `mouse-grid.cjs` |
| Parser und geschlossene Sprachgrammatik | `mouse-commands.js` |
| Modus, Auswahl, Unterteilung, Sichtbarkeit und Abbruch | `mouse-control.cjs` |
| Physische Windows-Bewegung, Ersetzen und Stopp | `windows-mouse.cjs`, `scripts/move-pointer.ps1`, `scripts/physical-mouse.cs` |
| Lokaler Windows-Rasterhörer | `grid-listener.cjs`, `scripts/grid-listen.ps1` |
| Durchklickbares Overlay, DIP-Grenzen, große Legende | `grid-overlay.cjs`, `mouse-grid.html`, `mouse-grid.css`, `mouse-grid-renderer.js`, `mouse-grid-preload.cjs` |
| Zustimmungen, normalisierte persistente Einstellungen | `privacy-consent.cjs`, `settings.cjs` |
| Integration, Mikrofonwechsel, Werkzeug-/Senderprüfung | `main.cjs`, `preload.cjs`, `realtime.js` |
| Bestehendes Steuerungsfenster und Einstellungen | `index.html`, `renderer.js`, `style.css` |
| Zustimmung je konkretem Auftrag statt Dienst-Cache | `desktop-vision.cjs`, `selected-text.cjs` |
| Physische Metadaten bei bereits gesetztem Prozess-DPI-Kontext | `scripts/desktop-native.ps1` |
| Neue Tests | `tests/mouse-grid.test.cjs`, `tests/mouse-commands.test.cjs`, `tests/mouse-control.test.cjs`, `tests/windows-mouse.test.cjs`, `tests/grid-listener.test.cjs`, `tests/grid-overlay.test.cjs`, `tests/mouse-grid-renderer.test.cjs`, `tests/mouse-integration.test.cjs`, `tests/privacy-consent.test.cjs`, `tests/mouse-settings.test.cjs`, `tests/mouse-motion.test.ps1` |
| Angepasste Regressionen | `tests/desktop-integration.test.cjs`, `tests/desktop-vision.test.cjs`, `tests/selected-text.test.cjs`, `tests/settings.test.cjs` |
| Dokumentation | `README.md`, `docs/MAUSSTEUERUNG.md`, `docs/DESKTOP-ERKENNUNG.md`, `docs/HYBRID-AI-SETUP.md`, dieser Nachweis; historischer UIA-Nachweis erhält Verweis auf neue Zustimmungsregeln |

Die einzige KI-Auswahl samt Optionen, Charaktere, Stimmen, Filter, Wakeword-Grammatik,
45-Sekunden-Idle-Dauer und geeignete Provider bleiben erhalten. Der neue lokale
Rasterhörer besitzt nur im ausdrücklich gestarteten Modus das Mikrofon; Live,
Live-Codewortstart und spontane Ausgaben pausieren dabei. Es gibt keine
KI-Mauswerkzeuge, neuen Abhängigkeiten, Zwischenablage- oder Klickfunktionen.

## Automatisierte Ergebnisse

```sh
node --test --test-isolation=none tests/*.test.cjs
```

**434 Tests bestanden, 0 Fehler, Exit 0.** Die Isolation wurde wegen der
Linux-Sandbox gewählt; `npm test` verwendet auf einem normalen Windows-System
weiterhin den vorhandenen Testbefehl. Der Basisstand enthielt 358 Node-Tests.

Nachweise umfassen:

- Lückenloses 4×5-Raster für 16:9, 21:9, 32:9 und Hochkant, auch mit negativen
  Ursprüngen; native Pixel bleiben unskaliert, nur Overlaygrenzen gehen durch
  Electrons DIP-Konvertierung. Diese Konvertierung wird mit einem Stub geprüft.
- Zellmitte, interne Viertel ohne Änderung sichtbarer Geometrie, wiederholte
  Rasterunterteilung, Zurück/Neustart sowie Tiefen- und Pixelgrenzen.
- Alle fünf Namen, B/C/D und Buchstabieralternativen, Monitorwahl, Sichtbarkeit
  einschließlich 0 %, Ablehnung von Negationen, Zitaten, Zusatzaktionen und Klicks.
  Alle **2.137** geschlossenen Grammatikphrasen passieren denselben Parser.
  Der neue PowerShell-Helfer bleibt ASCII; Unicode-Ausdrücke im Stopp-Regex
  verwenden Escapes. Damit verfälscht das ANSI-Quellencoding von Windows PowerShell
  5.1 den Ausdruck „Hör auf“ nicht. Grammatikphrasen kommen als UTF-8-JSON.
- Native Prozessadapter mit Fake-Streams: nur letztes Startziel wird gesendet,
  STOP verwirft Warteschlange, Ersetzen, Zielprüfung, Prozessende und Verwerfen
  verspäteter „Ziel erreicht“-Meldungen nach neuem Ziel oder Stopp.
- Modus aktiv bei ausgeblendetem Raster, Hotplug-Ausgang, Stopp und Topologieänderung während ausstehender
  Monitorauswahl, keine Bewegung außerhalb eines ausdrücklich aktivierten Modus.
- Tatsächlicher Main-/Realtime-Code in VM: frischer expliziter Befehl und passender
  IPC-Absender erforderlich; lokale Text-/Live-Befehle, keine KI-Readout-Anfrage,
  doppelte Transkripte, Abbruch alter und verspäteter KI-Antworten, Sleep/Charakter-
  Abbruch, UI-Stopp und gezielter Datenschutz-Widerruf.
- Overlay-Renderer mit DOM-Nachbildung: 20 Beschriftungen, Sichtbarkeit,
  unveränderte Rastergeometrie bei Viertelung, große Legende bei kleiner Region.
  Das ist keine visuelle Windows-Abnahme.
- Einmal exakt je Anfrage; getrennte dauerhafte Freigaben über neuen Dienst-/App-
  Zustand; unbekannte Versionen und Empfänger werden nicht geerbt; Widerruf,
  Widerruf bei offenem Dialog, Abbruch und fehlgeschlagenes Speichern.
- Durchgängige Bildanfragen über den echten 45.000-ms-Idle-Callback mit Fake-Timern:
  drei erneute Sitzungen fragen bei Einmal erneut; Dauerhaft braucht nur den ersten
  Dialog und überlebt einen neu aufgebauten App-Zustand. Widerruf verhindert die
  nächste Aufnahme. Bestehende zusätzliche VAD-/Transkript-Regressionen bleiben grün.
- Bisherige UIA-, Aufnahme-/Monitor-, TTS-, Provider-, Charakter-, Sprachfilter-,
  Kosten- und Wakeword-Regressionen bleiben grün.

```powershell
powershell.exe -NoLogo -NoProfile -File tests/mouse-motion.test.ps1
powershell.exe -NoLogo -NoProfile -Mta -File tests/read-selection.test.ps1
```

Hier mit `pwsh` unter Linux ausgeführt:

- Bewegungsalgorithmus erfolgreich, C# mit Sprachversion 5 kompiliert: monotone
  Interpolation und Ziel, negative Koordinaten, keine Frames nach Stop-Rückkehr,
  neues Ziel ersetzt altes, ungültiger Monitor erzeugt keine Bewegung, begrenzter
  Zeiger meldet Fehler statt falschem Erfolg. **Injizierte Betriebssystemgrenzen,
  keine Aufrufe von user32, keine reale Mausbewegung.**
- Bestehende UIA-Simulation: **31 bestanden, 0 Fehler, Exit 0**. Einschließlich
  Diagnose des richtigen fehlschlagenden UIA-Aufrufs und redigierter Ausgabe.
- Syntax aller 92 JavaScript-Dateien geprüft. Vier neue/betroffene PowerShell-
  Dateien erfolgreich geparst; nativer Metadaten-C#-Block ebenfalls mit Sprachversion 5
  kompiliert. Keine native API ausgeführt. Windows PowerShell 5.1 selbst ist hier
  nicht verfügbar; Syntax-/C#-Prüfungen ersetzen keinen solchen Lauf.
- `git diff --check` erfolgreich. Neue native Helfer enthalten keine Klick-,
  Tastatur-, Zwischenablage-, Screenshot- oder Dateiprotokollierungsfunktionen.
  Diagnostik verwendet feste Statuscodes/-texte; kein privater Inhalt, Titel,
  Transkript oder Schlüssel wird protokolliert.

Testentwicklung begann mit fehlenden Modulen und roten Raster-/Parser-/Consent-
Tests. Weitere rote Fälle deckten Null-Prozent-Sichtbarkeit, Prozessadapter,
Modus-/IPC-Anbindung und die neue Einmal-Semantik gegenüber den alten Dienst-Caches
ab. Danach Implementierung und vollständige grüne Regression. Die Tests führen
Produktionscode mit simulierten Grenzen aus; sie behaupten keine native Windows-
Funktionsfähigkeit. Eine zusätzliche Linux-Chromium-Vorschau lieferte wegen
Renderer-/Sandbox-Problemen kein auswertbares Bild; keine visuelle Freigabe behauptet.

## Offene Windows-Abnahme

Kopierbare Bedienung und vollständige Prüfliste:
[MAUSSTEUERUNG.md](../../MAUSSTEUERUNG.md#windows-abnahme-noch-offen).

Besonders nötig: Windows PowerShell 5.1, tatsächliche System.Speech-Grammatik und
Stopp-Latenz, Mikrofonübergabe, physische Cursor-APIs, DPI-/Mehrmonitor-Abgleich,
Monitorlücken/Hotplug, Fokus/Klickdurchlässigkeit und Lesbarkeit. Alle drei
Zustimmungsoptionen mit echter App-Datei, Neustart, Widerruf, offenem Dialog und
Speicherfehler prüfen. Danach Desktop-/Textauswahl sowie alle fünf Stimmen und
normale OpenAI-/Gemini-/lokale Gespräche einschließlich echter 45-Sekunden-Pausen.

Kein Merge, Release, Repository-Rename oder Deployment.
