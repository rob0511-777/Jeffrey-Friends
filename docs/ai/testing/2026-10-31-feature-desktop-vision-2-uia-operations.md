# UIA-Operationen, Namespace-Korrektur und Zustimmung

Branch `feature/desktop-vision-2`, PR #4, Ausgangsstand `195d073`.
Linux-Ausführung am 31.10.2026: Node v24.19.0, portable PowerShell 7.4.7.
**Keine native Windows-Ausführung und kein echter Editor-/Browser-Test.**

> Historischer Nachweis für PR #4. Der darauf aufbauende Branch
> `feature/mouse-grid-consent` ändert die Auswahlmöglichkeiten der App-Zustimmung:
> „Einmal“ gilt je Anfrage, „dauerhaft“ überlebt Neustarts und ist widerrufbar.
> Aktueller Ablauf: [Maussteuerung und Zustimmungen](../../MAUSSTEUERUNG.md).
> UIA-Reihenfolge, Windows-Systemberechtigungen und Diagnoseverfahren bleiben erhalten.

## Nachgewiesene Ursache

Im bisherigen `CompareEndpoints`-Aufruf wurde
`System.Windows.Automation.TextPatternRangeEndpoint` verwendet. Richtig ist
`System.Windows.Automation.Text.TextPatternRangeEndpoint` aus UIAutomationTypes.
Siehe [Microsoft: TextPatternRangeEndpoint](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.text.textpatternrangeendpoint).
Die Typauflösung scheitert, sobald ein Auswahl-/Caret-Bereich verarbeitet wird,
bevor `CompareEndpoints` oder `GetText` erfolgreich arbeiten können. Der Catch
meldete das pauschal als `selection/provider-error`.

Die bisherige Nachbildung hatte denselben falschen Namespace und ließ diesen
Fehler durch. Nach Berichtigung des Testvertrags (kein falscher Alias vorhanden)
scheitern **12 von 18 Fällen** mit altem Enum-Verweis. Allein dessen Korrektur
macht diese **18 von 18 grün**. Das ist ein in PowerShell reproduzierter
API-Vertragsfehler, kein behaupteter Windows-Integrationstest.

Weiterer Vertragsfall: [GetSelection kann bei fehlendem Caret null liefern](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.textpattern.getselection).
Null-Bereiche wurden bisher wie echte Ranges angesprochen und konnten dadurch
zusätzliche Fehler erzeugen. Das ist korrigiert. Auch explizite Getter werden
verwendet, damit Provider-Ausnahmen bei Metadaten/SupportedTextSelection catchbar
bleiben und nicht durch die PowerShell-Property-Anpassung als Nullwert verschwinden.

## Operations- und Fehlerdiagnose

Die Rückmeldung trennt jetzt die konkreten Schritte:

| Operation | Bedeutung |
| --- | --- |
| `current` | Current-Metadaten einschließlich Passwort-/Offscreen-/Prozessprüfung |
| `try-get-current-pattern` | TextPattern abfragen |
| `supported-text-selection` | Auswahlunterstützung des TextPattern abfragen |
| `get-selection` | Auswahlbereiche ermitteln |
| `compare-endpoints` | echte Markierung von Caret unterscheiden, inklusive Enum-Auflösung |
| `get-text` | begrenzten Inhalt des ausgewählten Bereichs abrufen |

Initialisierung, Zielfenster, Fokusbaum, Condition und Enumeration haben eigene
Bezeichner. Fehlerklassen sind feste Werte (z. B. `type-not-found`, `binding`,
`invalid-operation`, `com`, `access-denied`, `element-unavailable`). Das HRESULT
wird nur als achtstelliger Hexwert weitergereicht. Kein Exception-Message,
StackTrace, Titel, Prozessname, Handle oder Auswahltext als Diagnose.

Fehler eines Elements verhindern keine anderweitig erfolgreiche Auswahl.
Irrelevante Metadaten-/Pattern-Suchfehler überstimmen keinen erfolgreich auf leer
geprüften Textbereich. Ein Fehler nach erkanntem TextPattern bleibt sichtbar,
wenn keine andere Auswahl lesbar ist; er erhält Vorrang vor früheren, nicht
zugeordneten Metadatenfehlern. So wird ein tatsächliches `GetText`-Problem nicht
von einem vorherigen Root-/Kindelementfehler verdeckt.

## Kleines Windows-Diagnoseverfahren

1. Den neuen Branchstand aus PR #4 verwenden. Windows-Editor öffnen und einen
   **unvertraulichen Testabsatz** eingeben. App und Editor mit normalen Benutzerrechten
   ausführen; für diesen Test keine automatische Rechteerhöhung verwenden.
2. Im Repository in einem PowerShell-Fenster genau diesen Aufruf starten:

   ```powershell
   powershell.exe -NoLogo -NoProfile -Mta -ExecutionPolicy Bypass -File .\scripts\read-selection.ps1 -OwnerPid $PID -DiagnosticOnly -DelaySeconds 5
   ```

3. Nach dem Start in den Editor wechseln und den Testabsatz mit der Maus markieren.
   Der Aufruf wartet nach Initialisierung fünf Sekunden und prüft dann das aktive
   Fenster genau einmal. Kein Strg+C, keine Zwischenablage und keine automatischen
   Tastatureingaben. Das Verfahren braucht keine laufende Jeffrey-Sprachsitzung.
4. Danach ins PowerShell-Fenster zurückkehren. Die JSON-Ausgabe enthält Status,
   feste Diagnosewerte sowie PowerShell-Version/Edition, Apartment und Bitness.
   **Mit `-DiagnosticOnly` bleibt `text` auch bei Erfolg leer.** Der Schalter muss
   im Aufruf stehen: Der normale interne App-Leseweg ohne ihn liefert die Auswahl
   an den Hauptprozess und ist nicht zum Ausgeben in der Konsole gedacht.
5. Für weitere Analyse nur dieses Diagnose-JSON mitteilen. Keine Texte, Bilder,
   Fenstertitel oder Roh-Stacktraces senden. Bleibt ein nativer Aufruf hängen,
   das Diagnosefenster schließen und den Stillstand melden; nicht wiederholt
   mit privaten Inhalten testen.

Der Diagnosepfad ruft dieselben UIA-Operationen einschließlich `GetText` lokal auf,
verwirft aber den Text vor der Ausgabe. Er liest keine API-Schlüssel, erstellt
keinen Screenshot, schreibt keinen Diagnose-/Textbericht auf Datenträger und
hat keinen Cloudpfad. `-ExecutionPolicy Bypass` entspricht dem bestehenden
prozesslokalen App-Aufruf und ändert keine dauerhafte Richtlinie; es ist keine
UAC-Freigabe und keine Zustimmung zur Datenübertragung.

Bei weiterem Fehler sollte jetzt z. B. `operation: "get-text"` mit Fehlerklasse
und HRESULT erscheinen. Der ursprüngliche falsche Namespace wird in einem eigenen
Regressionstest exakt als `compare-endpoints` / `type-not-found` identifiziert.

## Warum die Genehmigungsanfrage ausbleibt

`createSelectedText.execute` führt zuerst `readSelection` aus. Bei UIA-Fehler oder
fehlender Auswahl kehrt es vor dem Cloudpfad zurück. Daher erscheint in diesem
Fall erwartungsgemäß **kein App-Dialog**, und es wird weder übertragen noch eine
neue Zustimmung gespeichert. Erst nach erfolgreichem Auslesen, geeignetem Anbieter,
Schlüssel und Budget wird vor der ersten OpenAI-Text-/TTS-Übertragung gefragt.

Der App-Dialog heißt „[Charakter] – Textauswahl übertragen?“. Bereits erteilte
Zustimmung bleibt im gleichen App-Dienst über weitere Aufträge/Sitzungen erhalten;
nach vollständigem App-Neustart wird erneut gefragt. Ablehnung wird nicht als
Zustimmung gespeichert. Bildschirm-Zustimmung ist separat. Lokal/Offline hat
keine solche Cloud-Übertragung und verlangt deshalb keine Cloudzustimmung.

Eine Windows-Systemmeldung (z. B. UAC, SmartScreen, Mikrofonzugriff) ist davon
unabhängig. Der UIA-Code enthält keinen System-Genehmigungsdialog und keine
Rechteerhöhung. Welche frühere Meldung beobachtet wurde, ist ohne Bezeichnung
nicht belegbar. Eine Windows-Freigabe zählt niemals als App-Cloud-Zustimmung.
Das lokale Diagnoseverfahren löst keinen Cloud-Dialog aus, weil es nichts sendet.
**Der bestehende Zustimmungsablauf wurde nicht verändert oder umgangen.**

## Automatisierte Validierung

```sh
node --test --test-isolation=none tests/*.test.cjs
```

**358 bestanden, 0 Fehler, Exit 0.** Neue Fälle prüfen Operation/HRESULT-Weitergabe,
Redaktion fremder Diagnosewerte, UIA-Fehler ohne Dialog/Übertragung, spätere
Zustimmung nach erfolgreicher Auswahl, Wiederverwendung im Prozess, Neustart und
Ablehnung mit erneutem Versuch. Keine kostenpflichtigen Live-API-Aufrufe.

```powershell
powershell.exe -NoLogo -NoProfile -Mta -File tests/read-selection.test.ps1
# In der Linux-Prüfumgebung mit PowerShell 7:
pwsh -NoLogo -NoProfile -File tests/read-selection.test.ps1
```

**31 bestanden, 0 Fehler, Exit 0** mit Fake-UIA unter PowerShell 7.4.7. Die sechs
Leseoperationen werden einzeln mit Fehlern versehen. Weitere Fälle: Null-Auswahl,
irrelevante Metadaten-/Pattern-Fehler, Priorität eines echten TextPattern-Fehlers,
reine Diagnose ohne Text sowie erneute gezielte Einfügung des falschen Namespace.
Der Testtyp-Vertrag verwendet nun die richtigen .NET-Namespace-/Property-Signaturen.

Zusätzliche Gegenprobe mit allen drei betroffenen Produktionsdateien exakt auf
`195d073`: **25/31 PowerShell-Fälle schlagen fehl (Exit 1)**. Von sechs gezielt
gewählten Node-Fällen schlagen die beiden neuen Operationsdiagnosen fehl; die
vier Zustimmungsfälle bestehen bereits am alten Stand. Das bestätigt, dass die
Dialog-Reihenfolge nicht umgebaut werden musste. Danach wurden die Korrekturen
vollständig wiederhergestellt und 358/358 Node- sowie 31/31 PowerShell-Fälle erneut
erfolgreich ausgeführt. Syntax-/Diff-Prüfungen sind ebenfalls erfolgreich.

Windows PowerShell 5.1 wurde auf verwendete API/Syntax geprüft, hier aber nicht
ausgeführt. Nach der Korrektur bleiben echte Editor-/Browser-Auswahl, Fokuscache,
GetText mit nativen Providern und der App-Dialog nach erfolgreichem Auslesen unter
Windows 11 zu prüfen. Die 31 Simulationen sind dafür kein Ersatz.
