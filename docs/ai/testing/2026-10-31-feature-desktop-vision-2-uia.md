# UIA-Korrektur und KI-Modus-Platzierung – Testnachweis

Branch: ausschließlich `feature/desktop-vision-2`, PR #4.
Ausgangsstand: `6889f55`. Prüfung am 31.10.2026 unter Linux, Node v24.19.0,
zusätzlich portable PowerShell 7.4.7. Keine neuen App-Abhängigkeiten oder APIs.

## Nachgewiesene Fehler und Korrekturen

Der ursprüngliche PowerShell-Lesepfad ordnete jede Ausnahme `unsupported` zu.
Initialisierungs- und Condition-Fehler waren deshalb von fehlender UIA-Unterstützung
nicht unterscheidbar. Ein fehlerhaftes Kindelement verwarf den gesamten Suchlauf;
verdeckte Auswahlen konnten Mehrdeutigkeit erzeugen. Ein fokussiertes Element, das
nicht über den bisherigen Property-Filter gefunden wurde, wurde nicht gesondert
abgefragt. Diese Abläufe wurden am tatsächlichen PowerShell-Skript mit nachgebildeten
UIA-Typen reproduziert. Die genaue zuvor auf Windows aufgetretene Exception ist
wegen der alten Fehlerunterdrückung nicht bekannt; ein tatsächlich fehlerhafter
Windows-Konstruktor wird nicht als nachgewiesene Ursache behauptet.

Der API-Abgleich mit dem [Microsoft-WPF-Referenzcode](https://github.com/dotnet/wpf/blob/main/src/Microsoft.DotNet.Wpf/src/UIAutomation/UIAutomationClient/System/Windows/Automation/Automation.cs)
bestätigt `Automation.Compare(AutomationElement, AutomationElement)` für die
Zugehörigkeitsprüfung. Der Fake-Vertrag liegt auf derselben Klasse; dadurch
schlugen zwei Fokusfälle bei einer zwischenzeitlich falsch zugeordneten Methode
fehl und bestehen nach Korrektur. Die TextPattern-Property und
`TryGetCurrentPattern` wurden ebenfalls am offiziellen Referenzcode geprüft.

Jetzt: MTA-Leseprozess, ausdrückliche Assemblies/typisierte PropertyCondition,
Fokus-/Vorfahrenpfad innerhalb des richtigen Fremdfensters, danach Root/visible
Subtree. Eigene/fremde Fokusbäume, Passwortfelder und verdeckte Elemente werden
nicht gelesen. Fehler einzelner Elemente werden isoliert. Technische Fehler
bekommen eigene Status-/Diagnosecodes; diese werden auf feste Werte begrenzt.
Keine Textinhalte, Titel, Handles oder rohe Exception-Details als Diagnostik.

Die einzige bestehende KI-Modus-Auswahl wurde mit gleicher ID und identischen
Optionen direkt hinter den gesamten Direkt-Sprechen-Kasten verschoben. Schlüssel,
Kosten, lokale Modellfelder und andere Einstellungen bleiben im Anbieterbereich.
Aktive OpenAI-/Gemini-Verbindungen werden beim Wechsel geschlossen. Ein zusätzlich
reproduzierter Fall – separates Windows-Vorlesen lief beim Wechsel weiter – wird
über den bestehenden Stopppfad beendet.

## Automatisierte Ergebnisse

```sh
node --test --test-isolation=none tests/*.test.cjs
```

**351 Tests bestanden, 0 Fehler, Exit 0.** Keine bezahlten Live-API-Aufrufe.
Neue Node-Fälle prüfen sichere Diagnosewerte, Timeout statt Unsupported,
Fehlerrückmeldung ohne Textübertragung, MTA nur für UIA, genau eine unveränderte
Auswahl an der gewünschten Stelle und sichere OpenAI-/Gemini-/Windows-Ausgabe-
Beendigung beim Wechsel. Bestehende Monitor-, Aufnahme-, Datenschutz-, Abbruch-,
Charakter-, Stimmen-, Filter-, Wakeword- und Provider-Suiten laufen mit.
JavaScript-Syntax und `git diff --check` ebenfalls erfolgreich.

PowerShell-Vertragstest, z. B. unter Windows:

```powershell
powershell.exe -NoLogo -NoProfile -Mta -File tests/read-selection.test.ps1
# Mit PowerShell 7:
pwsh -NoLogo -NoProfile -File tests/read-selection.test.ps1
```

**18 Fälle bestanden, 0 Fehler, Exit 0** mit PowerShell 7.4.7 unter Linux.
Die Tests führen den echten Lese-Skriptcode mit Fake-UIA und Fake-Zielfenster aus:
Fokus, Vorfahren, leere Fokusauswahl mit Fallback, eigenes/fremdes Fenster,
Root/Nachfahren, veraltete Elemente, verdeckte Auswahl, Caret, Unsupported,
Initialisierungs-/Condition-Fehler, Passwortschutz, Duplikate, Mehrdeutigkeit und
Längenlimit. Sie greifen niemals auf echten Desktop oder echte Markierungen zu.
Diese 18 Fälle sind zusätzlich zur Node-Suite, nicht darin enthalten.

Gegenprobe: sechs Produktionsdateien vorübergehend exakt auf `6889f55` gesetzt
und danach garantiert wiederhergestellt. **18/18 PowerShell-Fälle und 7/7 gezielt
gewählte Node-Regressionen schlagen am alten Stand fehl (je Exit 1).** Anschließend
erneut 351/351 Node- und 18/18 PowerShell-Fälle mit Korrektur erfolgreich.

HTML-Struktur/IDs/Optionen sind automatisiert geprüft. Eine verlässliche visuelle
Abnahme der Fensterabmessungen war mit dem vorhandenen Linux-Headless-Electron
nicht möglich; die Windows-Darstellung wird nicht als bestanden gemeldet.

## Offene manuelle Windows-11-Prüfung

1. Im Windows-Editor einen unvertraulichen Abschnitt markieren und den Befehl
   sprechen. Auswahl bei aktivem Editor und nach Fokus auf Jeffrey prüfen.
   Dasselbe in unterstütztem Edge/Chrome bzw. anderen Browsern mit zugänglichem
   TextPattern wiederholen. Absatz-/Teilwortauswahl und Nicht-ASCII-Zeichen testen.
2. Fokus auf anderes Fenster, eigene Einstellungen und Overlay: ausschließlich die
   Auswahl im passenden Fremdfenster lesen. Keine Auswahl, Caret, Passwortfeld,
   inaktiver Tab, mehrere Markierungen und geschlossene/veraltete Elemente prüfen.
3. Native UIA mit Windows PowerShell 5.1 prüfen. Bei technischem Fehler den festen
   Code (z. B. `initialize/initialization-failed` oder `condition/provider-error`)
   melden; keine vertraulichen Inhalte oder Roh-Stacktraces weitergeben.
4. Im Steuerungsfenster bei üblicher Auflösung und 100/125/150/200 % DPI prüfen:
   genau ein KI-Modus-Feld direkt unter dem kompletten Direkt-Sprechen-Kasten,
   kompakt, lesbar und per Tastatur bedienbar. Schlüssel/Kosten bleiben unten.
5. Alle vier Modi wählen, App neu starten, gespeicherte Auswahl kontrollieren.
   Während OpenAI-/Gemini-Gespräch, Verbindungsaufbau und separatem Vorlesen wechseln:
   alte Ausgabe/Verbindung beendet, kein ungewollter Neustart, nächster Start nutzt
   gewählten Anbieter. Lokal/Automatik mit bisherigen Grenzen prüfen.
6. Bildschirm-/Monitorauswahl, Zustimmung, Abbruch, 45-Sekunden-Disconnect sowie
   alle fünf Charaktere, Stimmen, Audiofilter und Wakewords auf Regression prüfen.

Keine dieser echten Windows-Prüfungen wurde unter Linux als bestanden gewertet.
Kein Merge nach `main`, keine Veröffentlichung.
