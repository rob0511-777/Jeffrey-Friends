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
