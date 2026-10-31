# Desktop Vision 2.0 – Implementierung

Basis: `main`, `255916479077953230d4f3edc5641ca51326a5b3`, inklusive PR #3.
Branch: `feature/desktop-vision-2`. Kein Merge, Release oder Versionssprung.

- `voice-commands.js`: lokale vollständige Satzmuster; separate Bildschirm-,
  Auswahl-, Rückfrage- und Stoppabsichten. Kontext maximal 30 Sekunden und nur
  unmittelbar passend. Zitate vor Normalisierung ausschließen.
- `windows-desktop.cjs`, `scripts/desktop-native.ps1`, `track-foreground.ps1`,
  `desktop-snapshot.ps1`: ereignisbasierter HWND-Speicher; eigene Prozessfenster,
  Shell und minimierte Fenster ausgeschlossen. Geometrie erst auf Anforderung.
- `desktop-vision.cjs`, bestehendes `capture-primary-screen.ps1`: Zielauswahl vor
  Einwilligungsdialog; bestehende einzelne Aufnahme um physische Bounds ergänzt.
  Explizite unbekannte Ziele schlagen fehl; automatischer Fallback bleibt möglich.
- `scripts/read-selection.ps1`, `selected-text.cjs`: TextPattern.GetSelection,
  begrenzte Auswahl, ehrliche Nicht-Unterstützung; keine Eingaben oder Clipboard.
  Eigene Text-Zustimmung, Budget, keine Provider-Fallbacks, keine Werkzeuge.
- `comment-speech.cjs`, `main.cjs`, `realtime.js`: bestehende TTS für Auswahltexte,
  sequenzielle Abschnitte, Wiedergabebestätigung, Charakterfilter und Lip-Sync.
  Stoppen verwirft alte Ergebnisse und verhindert folgende Abschnitte.
- README und Desktop-Dokumentation enthalten Bedienung, Datenschutz, GDI-Zuordnung,
  Anbietergrenzen und die ausstehende Windows-Prüfliste.

Keine neuen Abhängigkeiten oder APIs. Bestehende Charakterprofile, Sprachfilter,
Wakewords, Providerimplementierungen, PC-/Browserfunktionen und Kostenerfassung
werden wiederverwendet. Auswahltexte werden nicht in Gedächtnis oder Logs geschrieben.

Bekannte Grenzen: native Windows- und Audiofunktion ungeprüft; GDI-Nummerierung
kann von Windows-Einstellungen abweichen; UIA nicht in jeder Anwendung verfügbar;
Gemini hat keinen passenden Auswahlpfad; Lokal/Offline benutzt Windows-Stimme.


## Windows-Bugfix: Anfrage-Lebensdauer

Nachweis am bisherigen Commit `2b3227d`: `user-speaking` erhöhte über
`stopTalking(true,false)` die `desktopEpoch` und löschte `lastDesktopRequest`.
`analyzeLiveDesktop.isCurrent` hing am zurückgesetzten Transkriptmarker. Im Renderer
wurden gleichzeitig Generation und Werkzeugblockade zurückgesetzt. Die originale
Fehlermeldung entstand an allen vier nachgestellten asynchronen Grenzen:
Monitor-Metadaten, Datenschutzdialog, Aufnahme und HTTP-Antwort.

- Hauptprozess: `activeDesktopRequest` hält die eigene Identität bis `finally`.
  Zwischenereignisse dürfen sie nicht widerrufen. Echte Abbruchwege erhöhen weiter
  die Generation und senden die gezielte Renderer-Abbruchnachricht. Absichtliche
  IPC-Abbrüche werden als `{cancelled:true}` bestätigt, ohne Handlerfehler.
- Renderer: Verarbeitung, ausstehende Vorleseanfrage und aktive Desktop-Antwort
  bleiben bei VAD/Zwischentranskripten geschützt. Expliziter Stopp verwirft Ergebnisse;
  verspätete `response.created` werden abgebrochen. `response.done` und Fehler lösen
  den Vorlesezustand auch bei fehlendem `response.created`. Abbruch pro Antwort nur
  einmal; Timerbereitschaft wird im Analyse-`finally` wiederhergestellt.
- Analysedienst: tatsächliche Verarbeitungsschritte als Status, requestgebundenes
  HTTP-AbortSignal bei echtem Abbruch. Keine zusätzlichen Aufnahmen oder Diagnoseinhalte.
- Zustimmung blieb bereits korrekt im Dienst des App-Prozesses gespeichert und
  wird nicht an Sprachsitzungen gekoppelt. Tests schützen Sitzungswechsel/Neustart.

`IDLE_MS=45000`, das 15-Minuten-Limit, Charaktere, Stimmen, Filter sowie die
Providerimplementierungen bleiben unverändert. Keine neuen Funktionen oder APIs.


## 31.10.2026: UIA-Lesepfad und KI-Modus-Platzierung

`scripts/read-selection.ps1` unterscheidet technische Fehler, fehlendes TextPattern,
leere Auswahl, Passwortschutz und Limits. UIA-Initialisierung und Condition-Binding
sind ausdrücklich typisiert; der Aufruf nutzt MTA. Fokus samt Vorfahren wird nur
nach Zugehörigkeitsprüfung zum Ziel gelesen; danach Root und sichtbare Nachfahren.
Fehler einzelner Elemente werden isoliert. Diagnose enthält feste Schritt-/Code-/
Suchwegwerte ohne Text, Fensternamen, Handles oder rohe Exceptions.
`windows-desktop.cjs` begrenzt diese Felder und unterscheidet Prozessfehler/Timeout.
`selected-text.cjs` zeigt technische Fehler getrennt von Nicht-Unterstützung an.
Kein Clipboard, keine Eingaben oder Screenshot-Fallbacks hinzugefügt.

Das vorhandene `ai-provider`-Select samt Label wurde in `index.html` als einzige
Auswahl direkt unter `quick-live` verschoben; ein lokaler CSS-Abstand hält den
Bereich kompakt. `renderer.js`, Optionswerte und Speicherpfad bleiben unverändert.
Der bestehende Anbieterwechsel beendet zusätzlich separates Vorlesen über
`stopTalking()`. Verbindungsschluss für OpenAI/Gemini bleibt erhalten.

Nachweis: 351 Node-Tests und 18 ausführbare PowerShell-/Fake-UIA-Fälle unter Linux.
Echte Windows-UIA, Windows PowerShell 5.1 und visuelle Windows-Abnahme stehen aus.
Details: `docs/ai/testing/2026-10-31-feature-desktop-vision-2-uia.md`.


## 31.10.2026: genauer Operationsfehler und Zustimmungsabgrenzung

Nachgewiesen: Der Endpoint-Enum-Verweis fehlte um den Namespace-Teil `.Text`.
Der korrigierte Fake-API-Vertrag führt mit altem Verweis zu 12/18 Fehlern und mit
alleiniger Namespace-Korrektur zu 18/18 erfolgreichen Fällen. Die Simulation
enthält den falschen Alias ausdrücklich nicht mehr.

Jede Leseoperation bekommt einen festen Bezeichner, Fehlerklasse und HRESULT.
Explizite Getter machen Current-/SupportedTextSelection-Ausnahmen catchbar.
Null-Auswahlen und irrelevante Metadatenfehler überstimmen keinen erfolgreich
leeren Bereich; bekannte TextPattern-Fehler werden bei fehlender anderer Auswahl
weiterhin ehrlich gemeldet. `-DiagnosticOnly -DelaySeconds 5` erlaubt lokale
Windows-Diagnose ohne Textausgabe und ohne Cloudpfad. JavaScript begrenzt neue
Diagnosefelder auf feste Werte; keine rohen Fehlermeldungen oder Fensterdaten.

Der Zustimmungsablauf wurde nicht verändert: lokale UIA zuerst, erst danach bei
geeignetem Anbieter/Schlüssel/Budget gegebenenfalls einmalige App-Cloud-Zustimmung.
Ein UIA-Fehler erreicht den Dialog nicht. Windows-Systemdialoge sind hiervon
unabhängig und ersetzen die App-Zustimmung nicht. Zusätzliche Tests sichern diese
Reihenfolge, Prozess-Lebensdauer, Ablehnung und erneuten Versuch ab.

Nachweis: 358 Node-Tests und 31 PowerShell-/Fake-UIA-Fälle unter Linux.
Reale Windows-11-/PowerShell-5.1-/Editor-Prüfung bleibt offen; Verfahren und
Grenzen stehen in `docs/ai/testing/2026-10-31-feature-desktop-vision-2-uia-operations.md`.
