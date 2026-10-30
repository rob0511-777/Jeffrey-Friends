# Desktop Vision 2.0 – Testnachweis

Basis: `main` mit PR #3 (`255916479077953230d4f3edc5641ca51326a5b3`).
Ausgeführt in Linux mit Node v24.19.0 am 30.10.2026.

```sh
node --test --test-isolation=none tests/*.test.cjs
```

Ergebnis: **321 Tests bestanden, 0 Fehler, 0 übersprungen, Exit 0**.
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
