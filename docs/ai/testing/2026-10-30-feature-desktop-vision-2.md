# Desktop Vision 2.0 – Testnachweis

Basis: `main` mit PR #3 (`255916479077953230d4f3edc5641ca51326a5b3`).
Ausgeführt in Linux mit Node v24.19.0 am 30.10.2026.

```sh
node --test --test-isolation=none tests/*.test.cjs
```

Ergebnis: **342 Tests bestanden, 0 Fehler, 0 übersprungen, Exit 0**.
`--test-isolation=none` wird verwendet, da der Standardaufruf mit Test-Subprozessen
in dieser eingeschränkten Ausführungsumgebung ohne verwertbare Kindprozessausgabe
scheitert. Alle Tests wurden gemeinsam ohne Subprozess-Isolation ausgeführt.
Keine bezahlten Live-API-Aufrufe; Mock-Transport, Mock-Windows und Mock-Audio.

Neue/geänderte Tests:

- `desktop-intents.test.cjs`: natürliche Bildschirm-/Auswahlsätze für alle Figuren,
  explizite Ziele, Höflichkeit, Namensvarianten, Verneinung, Zitate und Kurzkontext.
- `desktop-target.test.cjs`: Fenster-vor-Maus-vor-Primär, Nummern, links/rechts,
  negative Koordinaten, physische Geometrie bei gemischter DPI, Ziel vor Dialog,
  Ausfall des Metadatenzugriffs und erweiterter bestehender Capture-Aufruf.
- `windows-desktop.test.cjs`: Handle-Ereignisse ohne Auswahlzugriff,
  explizite UIA-Anfrage, Fehlerredaktion, Nicht-Windows und statischer Lesevertrag.
- `selected-text.test.cjs`: UIA-Auswahl/leer/nicht unterstützt/mehrdeutig/zu lang,
  Vorlesen ohne Bild-/Text-KI, Text als Daten ohne Werkzeuge, Zustimmung, Budget,
  Anbietergrenzen, lokale Erklärung, Abbruch und geschützte Fehlermeldungen.
- `selection-speech.test.cjs`: bestehender TTS-Endpunkt mit unverändertem Text und
  Charakterstimme; Abbruch vor Anforderung.
- `desktop-integration.test.cjs`: IPC, einmaliges Lesen, keine Folge-Text-KI beim
  Auswahlvorlesen, Filter/Mundanimation mit Fake-Audio, vollständige lange Ausgabe,
  Stopp/Ausblenden, Kontextverlust und Gemini-Einschränkungen.
- `desktop-vision.test.cjs`: alte Erwartungen an „Lies mir das vor“ und die
  Beschränkung auf den Primärmonitor an den neuen Auftrag angepasst.

Die bisherigen Suiten für Charaktere, Stimme, Wakewords, Animationen, Realtime,
Gemini, lokale KI, Browser/PC, Gedächtnis und Kosten laufen mit. Zusätzlich wurden
JavaScript-Syntax und `git diff --check` geprüft. Kein Build-Skript im Projekt;
keine Abhängigkeitsänderungen und kein erforderlicher Installationsschritt für
die Node-Tests.

## Regression des Windows-Abbruchs

Neue Regressionen in `desktop-integration.test.cjs` verwenden den echten
`createDesktopVision`-Dienst mit kontrollierbaren OS-/HTTP-Grenzen. Die originale
Freigabe-Fehlermeldung wurde jeweils nach Monitorermittlung, Zustimmung, Aufnahme
und HTTP-Antwort durch dazwischenliegende VAD-/Transkript-Ereignisse reproduziert.
Hauptprozess-Autorisierung und Renderer-Generation werden zusätzlich getrennt geprüft.

Gegenprobe: Produktionsdateien vorübergehend exakt auf `2b3227d` gesetzt und
anschließend garantiert wiederhergestellt. Von 13 ausgewählten Regressionstests
schlugen **11 fehl (Exit 1)**. Danach mit korrigiertem Code die gesamte Suite:
**342 bestanden, 0 Fehler, Exit 0**. Rohdaten dieser Tests sind ausschließlich
unvertrauliche Testkonstanten; keine Live-API-Anfragen.

Weitere Fälle: Stopp-Schaltfläche/Sprachstopp, Schlafmodus, Sitzungsende und
Charakterwechsel trotz Zwischenereignissen; keine nachträgliche Fehlerausgabe bei
Stopp; verspätete Sprachantwort, `response.done` ohne vorheriges `response.created`,
mehrfache Stopp-Signale und normaler nächster Satz auch ohne vorheriges VAD.
Der Dienst wird nach einem über AbortSignal abgebrochenen HTTP-Aufruf erneut
verwendet; die nächste Frage wird erfolgreich beantwortet.

Drei wiederholte Sitzungen lösen jeweils den echten Renderer-Idle-Callback über
Fake-Timer aus: Timerdauer exakt **45.000 ms**, danach geschlossene Sitzung,
anschließend derselbe Bildschirmbefehl. Ergebnis: drei Aufnahmen/Analysen, nur
eine Zustimmung. Ein neuer App-/Dienstzustand fragt erneut. Damit ist die bereits
korrekte Prozess-Lebensdauer der Zustimmung geschützt; reale 45-Sekunden-Wartezeiten
unter Windows werden durch Fake-Timer nicht als manuell bestanden gewertet.

Status-Reihenfolge wird an den tatsächlichen Aufnahme-/HTTP-Grenzen geprüft,
inklusive Rückkehr zur Bereitschaft nach Fehler/Abbruch. Es wurden keine zusätzlichen
Logs mit Bildinhalt, Transkript oder Schlüssel eingeführt. Charakter-, Voice-,
Gemini- und lokale Provider-Suiten laufen weiterhin vollständig mit.

## Ausstehend: Windows manuell

Keine der folgenden Prüfungen wurde als bestanden gewertet:

- echte TextPattern-Verfügbarkeit in Browser, Mail, Editor und PDF-Reader;
- richtiges vorheriges Fenster nach Fokus auf Overlay/Einstellungen/Dialog;
- Monitore mit unterschiedlichen Auflösungen, DPI und negativen Ursprüngen;
- GDI-Nummern, Links/Rechts/Maus, Hotplug und Fallbacks;
- echte Stimme aller fünf Figuren, Jeffrey-/Bronco-Filter, Mund-/Handanimation;
- Zustimmung, Berechtigungen, gesperrte/elevierte Apps, Netzwerk/Budget und Stopp;
- unveränderte Bedienung von Wakewords, Browser-/PC- und Providerfunktionen.

Die vollständige ausführbare Prüfliste steht in `docs/DESKTOP-ERKENNUNG.md`.


Für die Windows-Bugfix-Abnahme zusätzlich: während jeder Verarbeitungsetappe und
beim Vorlesen Rauschen/erneute Sprache auslösen; danach erfolgreiche Antwort und
normales Gespräch prüfen. Dieselbe Frage nach mindestens drei echten
45-Sekunden-Disconnects wiederholen, dann App vollständig neu starten und erneuten
Datenschutzdialog prüfen. Echte Abbrüche an denselben Etappen testen und
sicherstellen, dass weder Folgeaufnahme noch verspätete Antwort erfolgt.
