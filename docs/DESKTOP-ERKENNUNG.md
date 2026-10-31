# Desktop sehen und verstehen – Vision 2.0

Status: implementiert und mit automatisierten Mock-Tests geprüft. **Native
Windows-Funktionen, Fokuswechsel, reale Monitore, Sprache und Audio wurden in der
Linux-Umgebung nicht manuell verifiziert.** Kein Release-Nachweis.

## Bildschirm und Monitorauswahl

Für Jeffrey, Bronco, Kelly, Krak und James, mit oder ohne Namen:

- „Schau mal.“ / „Guck dir das an.“ / „Was siehst du gerade?“
- „Guck mal hier.“ / „Was ist in diesem Fenster?“
- „Was steht auf meinem Bildschirm?“ / „Kannst du die Fehlermeldung erkennen?“
- „Schau auf Bildschirm eins.“ / „Was ist auf Monitor zwei?“
- „Lies mir Bildschirm drei vor.“
- „Schau auf den linken Bildschirm.“ / „Guck auf den rechten Monitor.“
- „Schau auf den Bildschirm mit meiner Maus.“

Automatisch hat ein geeignetes aktives fremdes Anwendungsfenster Vorrang. Wenn
Jeffreys Einstellungen, Overlay oder Datenschutzdialog den Fokus übernehmen,
wird das zuletzt aktive geeignete fremde Fenster verwendet. Ist dieses geschlossen,
minimiert oder ungültig, folgt der Mausmonitor; danach der primäre Monitor.
Für die automatische Auswahl nicht verfügbare Windows-Metadaten führen ebenfalls
zum primären Monitor. Eine unbekannte explizite Nummer erzeugt einen Hinweis,
statt heimlich einen anderen Monitor aufzunehmen.

**Monitornummern sind GDI-Gerätenummern `\\.\DISPLAYn`, nicht garantiert die Zahlen
aus „Einstellungen → System → Anzeige“.** „Monitor zwei“ bezeichnet `DISPLAY2`.
Die Zuordnung kann nach Umstecken wechseln; Nummern müssen nicht lückenlos sein.
Links/rechts meint den kleinsten/größten physischen X-Ursprung; bei gleichem X
entscheidet die Y-Position von oben nach unten. Für gestapelte oder gespiegelte
Anzeigen sind Nummer oder Maus eindeutiger.

Die Fenstererkennung hält ausschließlich ein Fenster-Handle im Arbeitsspeicher
über Windows-Fokusereignisse (`SetWinEventHook`), ohne Titel, Auswahltexte oder
Pixel zu beobachten. Monitorgeometrie und Mausposition werden erst auf Befehl
abgefragt, vor einem Datenschutzdialog eingefroren und in physischen Pixeln
verwendet. Per-Monitor-DPI-Awareness und negative Koordinaten sind berücksichtigt.
Die bestehende Aufnahmefunktion kopiert genau einen Monitor, verkleinert das Bild
proportional auf maximal 1600 Pixel und kodiert JPEG im Speicher. Bei veränderter
Geometrie zwischen Auswahl und Aufnahme wird abgebrochen. Keine Hintergrundbilder,
Bilddateien, Aufnahme-Timer oder autonome Computeraktionen.

## Markierten Text lesen

- Vorlesen: „Lies mir das vor“, „Lies bitte den markierten Text“, „Kannst du das
  hier vorlesen?“ oder „Lies mir das Markierte vor“.
- Erklären: „Erklär mir das“, „Was bedeutet dieser Abschnitt?“ oder „Kannst du mir
  das verständlich erklären?“.
- Zusammenfassen: „Fasse das zusammen“, „Gib mir eine kurze Zusammenfassung“ oder
  „Worum geht es in dem markierten Text?“.
- Stoppen: „Stopp“, „Hör auf“, „Brich ab“ oder die Schaltfläche „Sprachausgabe
  stoppen“. Schlafmodus, Ausblenden, Charakterwechsel und Sitzungsende brechen
  laufende Aufträge ebenfalls ab. In Gemini beendet ein gesprochener Stopp die
  Live-Sitzung, da kein separater Audio-Abbruchpfad implementiert ist.

UI Automation liest ausschließlich nicht leere Auswahlbereiche von TextPattern
im geeigneten fremden Fenster. Ein Cursor ohne Auswahl zählt nicht als markierter
Text. Passwortfelder werden ausgelassen. Es werden keine Tastaturaktionen,
Strg+C, Zwischenablagezugriffe, Fokusänderungen oder Ersatz-Screenshots ausgeführt.
Es gibt keine Auswahlüberwachung und kein automatisches Vorlesen beim Markieren.

Browser, Editoren, E-Mail-Programme und PDF-Reader funktionieren nur, soweit sie
TextPattern-Auswahlen bereitstellen. Beispielsweise können gescannte PDFs,
Canvas-Inhalte, geschützte/elevierte Fenster oder deaktivierte Accessibility
unzugänglich sein. Mehrere unterschiedliche Auswahlen werden als mehrdeutig
abgelehnt. UIA-Aufrufe sind zeitlich begrenzt. Maximal 24.000 Zeichen, für die
bestehende lokale Textmodell-Schnittstelle maximal 3.500 Zeichen; bei Überschreitung
wird um einen kürzeren Abschnitt gebeten. Kein heimliches Abschneiden.

Ohne Auswahl folgt: „Ich sehe gerade keinen markierten Text. Soll ich stattdessen
deinen Bildschirm untersuchen?“ Erst ein neuer ausdrücklicher Bildschirmbefehl
(z. B. „Schau auf meinen Bildschirm“) erteilt Aufnahmeerlaubnis. Ein bloßes „Ja“
wird nicht als Aufnahmebefehl interpretiert.

„Was steht da?“ wird nur direkt nach einer erfolgreichen passenden Bildschirm-
oder Auswahlaktion und innerhalb von 30 Sekunden entsprechend zugeordnet. Eine
andere bestätigte Nutzeräußerung außerhalb einer laufenden Desktop-Verarbeitung,
Stopp oder ein Sitzungswechsel löscht den Kontext. Sonst
fragt die App lokal nach. Ganze Äußerungen werden deterministisch erkannt;
Großschreibung, gebräuchliche Namensvarianten und Höflichkeit sind berücksichtigt.
Zitate, Verneinungen, hypothetische Sätze und angehängte Aktionen sind keine
Erlaubnis. Es gibt keine Cloudanfrage zur Befehlsinterpretation.

## Korrektur der Windows-Textauswahl (31.10.2026)

Der bisherige äußere PowerShell-`catch` meldete sämtliche technischen Ausnahmen
als `unsupported`. Dadurch konnte ein Initialisierungs-, Condition-, Fenster- oder
Providerfehler die irreführende Meldung „keine geeignete Textauswahl“ erzeugen.
Die ursprüngliche konkrete Windows-Ausnahme lässt sich aus dieser alten Meldung
nicht rekonstruieren; ein tatsächlicher Fehler im Windows-`PropertyCondition`-
Konstruktor wurde in der Linux-Umgebung nicht nachgewiesen.

Der korrigierte Leseprozess verwendet einen eigenen MTA-PowerShell-Aufruf, lädt
UIAutomationTypes/Client ausdrücklich und erzeugt `PropertyCondition` über den
expliziten Konstruktor mit typisiertem Boolean. Zuerst wird das fokussierte Element
mit seinen TextPattern-Vorfahren untersucht, jedoch nur, wenn die Vorfahrenkette
zum zuvor ausgewählten Fremdfenster führt. Jeffreys eigene Fenster und fremde
Fokusbäume werden ausgeschlossen. Hat Jeffrey den Fokus übernommen, bleibt die
Suche im gespeicherten Fremdfenster möglich, ohne den Fokus zurückzuverschieben.

Erst danach folgt die begrenzte Suche nach sichtbaren TextPattern-Elementen im
Zielfenster. Ein einzelnes veraltetes oder fehlerhaftes Kindelement verhindert
nicht mehr das Lesen einer anderen zugänglichen Auswahl. Verdeckte Elemente
(z. B. aus inaktiven Bereichen), Passwortfelder und eigene Prozessfenster werden
nicht gelesen. Doppelte identische Auswahlbereiche werden zusammengeführt;
verschiedene zugängliche Auswahlen bleiben ohne eindeutigen Fokus mehrdeutig.
Ein Caret ohne Textmarkierung ist weiterhin keine Auswahl. Es gibt kein Strg+C,
keine Zwischenablage, keine simulierten Eingaben und keinen Ersatz-Screenshot.

Diagnostik enthält ausschließlich feste Werte für **Schritt**, **Code** und
**Suchweg**. Zum Beispiel:

- `initialize/initialization-failed`: technische UIA-Initialisierung fehlgeschlagen.
- `condition/provider-error`: Condition-Erzeugung technisch fehlgeschlagen.
- `selection/element-unavailable`: UIA-Element während des Zugriffs verschwunden.
- `transport/timeout`: der begrenzte Windows-Prozessaufruf dauerte zu lange.
- `no-text-pattern`: der abgeschlossene Suchlauf fand tatsächlich keinen geeigneten
  TextPattern-Zugang; `no-selection` bezeichnet dagegen fehlende Markierung.

Die App unterscheidet technische Fehler sichtbar von „nicht unterstützt“.
Diagnosefelder werden im Hauptprozess auf feste erlaubte Werte begrenzt; rohe
Fehlermeldungen/Stacktraces, Fenstertitel, Prozessnamen, Handles, ausgewählte Texte
und API-Schlüssel werden nicht als Diagnostik weitergereicht oder protokolliert.
Bei Fehlern enthalten Rückgaben keinen ausgewählten Text. Bei Erfolg darf die
Auswahl ausschließlich den bestehenden geschützten Vorlese-/Auswertungspfad nutzen.

Automatisierte PowerShell-Tests mit Fake-UIA zeigen die Korrektur für Fokus,
TextPattern-Vorfahren, zuvor aktives Fenster, fehlerhafte Kindelemente, verdeckte
Elemente, Grenzen und Diagnose. **Echter Windows-Editor und Browser unter Windows
11 sowie Windows PowerShell 5.1 sind noch manuell zu prüfen.** Nicht jede Anwendung
stellt geeignete UIA-Schnittstellen bereit; Unterstützung wird nicht erfunden.
Die ursprüngliche Fehlermeldung ist deshalb kein Beleg dafür, dass Windows-Editor
oder ein bestimmter Browser prinzipiell ungeeignet wäre.

## Anbieter, Sprache, Kosten und Datenschutz

| Aktion | OpenAI | Lokal / Offline | Gemini Live |
| --- | --- | --- | --- |
| Bildschirm | Bestehendes `gpt-4.1-mini`, nach Bild-Zustimmung | Nicht unterstützt | Nicht unterstützt |
| Auswahl vorlesen | Bestehendes `gpt-4o-mini-tts`, Charakterstimme | Vorhandene Windows-Stimme | Keine geeignete identische Vorleseschnittstelle |
| Auswahl erklären / zusammenfassen | Bestehendes `gpt-4.1-mini` | Gewähltes lokales Textmodell; Offline ohne Modell nicht unterstützt | Kein geeigneter Textpfad |

Kein automatischer kostenpflichtiger Providerwechsel. Automatik wird für neue
Auswahlaufgaben nicht als Cloudfreigabe behandelt; eine bereits freigegebene aktive
OpenAI-Sitzung kann ihren festgelegten Anbieter nutzen. Anbieter ohne geeigneten
Pfad melden die Einschränkung ehrlich.

Vorlesen überträgt nur ausgewählten Text an die vorhandene TTS-Schnittstelle und
startet keine Text- oder Bildanalyse. Bis zu 600 Zeichen pro Abschnitt werden
nacheinander vollständig verarbeitet, mit Budget- und Abbruchprüfung vor jedem
weiteren Abschnitt. Die gewählte OpenAI-Charakterstimme, Sprechvorgaben,
Jeffrey-/Bronco-Audiofilter und die vorhandene Mundanimation werden wiederverwendet.
Lokal/Offline bleibt die bisherige Windows-Sprachausgabe. Die Vorleseaufforderung
selbst gilt auch bei ausgeschaltetem „Antworten vorlesen“. Diese Einstellung gilt
weiterhin für allgemeine Antworten sowie Erklärungen im Textchat.

Die erste Bildübertragung pro App-Start benötigt die bestehende Bild-Zustimmung.
Textauswahl benötigt eine **gesonderte** lokale Zustimmung vor der ersten
OpenAI-Übertragung für TTS, Erklärung oder Zusammenfassung. Beide Dialoge erklären
Kosten und vertrauliche Inhalte; Abbrechen ist Standard. Zustimmung gilt nur bis
zum vollständigen Beenden der App. Lokale Auswahlverarbeitung verlangt keine
Cloudzustimmung. Bei Ablehnung oder Budgetblockade keine entsprechende Übertragung.

Die Auswahl gelangt nicht in Gedächtnis oder dauerhafte Logs. Direkt vorgelesener
Rohtext wird auch nicht in den Chat geschrieben. Nur Audioabschnitte werden zur
Wiedergabe an das eigene Einstellungsfenster gegeben, ohne Rohtext. Referenzen
werden nach Verarbeitung freigegeben, Bild- und native stdout-Puffer nach Gebrauch
überschrieben; unveränderliche JavaScript-/PowerShell-Strings können nicht sicher
aus dem Prozessspeicher gelöscht werden. Bei Erklärung/Zusammenfassung erhält das
Textmodell den ausgewählten Text als Daten ohne Werkzeuge oder Gesprächshistorie.
Auch die Live-Vorleseantwort verwendet keine Werkzeuge. Anweisungen im Inhalt
berechtigen nie zu Programmstarts, Maus-/Tastatureingaben oder Dateiaktionen.

Kostenjournal: ausschließlich Modell/Anbieter, Einheiten und Kostenmetadaten.
TTS-Kosten sind eine grobe, vorsorgliche lokale Schätzung von 15 EUR pro Million
Zeichen, bereits vor jedem begonnenen Abschnitt gezählt, keine Anbieterrechnung.
Auch fehlgeschlagene begonnene TTS-Anfragen können kostenpflichtig sein.
Textanalyse verwendet gemeldete Tokenzahlen. Monatsbudget und Budgetblockade
bleiben wirksam. Bereits erfolgte Übertragungen lassen sich durch Stopp nicht
zurückholen; spätere Abschnitte und veraltete Ausgaben werden unterdrückt.

`store:false` wird für Responses verwendet. Das garantiert keine vollständige
Löschung beim Anbieter. Für Cloudverarbeitung und Aufbewahrung gelten die
OpenAI-Regeln. Vor der Zustimmung sensible Inhalte schließen bzw. abwählen.

## Windows-Bugfix: unerwartete Abbrüche

Die Fehlermeldung „Bildschirmaufnahme nicht freigegeben oder Anfrage nicht mehr
aktiv“ ließ sich ohne Windows mit dem echten Analyse-Dienst reproduzieren: Ein
zusätzliches `speech_started`-Ereignis erhöhte im Hauptprozess die Abbruchgeneration
und löschte `lastDesktopRequest`. Die Gültigkeitsprüfung der noch laufenden Anfrage
hing an genau diesem letzten Transkript. Zugleich änderte der Renderer
`desktopGeneration` und setzte `desktopBlocked` zurück. Selbst harmloses Rauschen
konnte daher nach Monitorermittlung, Zustimmung, Aufnahme oder HTTP-Antwort die
Freigabe entziehen oder die fertige Antwort verwerfen.

Jetzt besitzt die laufende Anfrage eine eigene, einmalig freigegebene Identität,
unabhängig von späteren Transkripten. VAD- und Zwischenereignisse, fehlgeschlagene
Transkriptionen sowie weitere nicht abbrechende Transkripte während Verarbeitung
oder Desktop-Sprachantwort starten weder eine weitere Aufnahme noch Werkzeuge
und widerrufen die Anfrage nicht. Bitte für einen absichtlichen Abbruch ausdrücklich
„Stopp“ sagen oder eine der genannten Abbruchmöglichkeiten verwenden.

Stopp-Schaltfläche, gesprochener Stopp, Schlafmodus, Ausblenden, Sitzungsende und
Charakterwechsel verwerfen laufende Ergebnisse weiterhin. Während einer laufenden
HTTP-Anfrage wird ein echter Abbruch zusätzlich über deren AbortSignal umgesetzt.
Eine bereits erfolgte Übertragung wird dadurch nicht zurückgeholt. Absichtliche
Abbrüche werden über IPC als Abbruch bestätigt und nicht als Fehler-Sprachantwort
oder Electron-Handlerfehler weitergereicht. Verspätete Sprachantworten nach Stopp
werden verworfen; derselbe Antwort-Abbruch wird nicht mehrfach gesendet.

Die bestehende Bild-Zustimmung bleibt im einmal pro App-Prozess angelegten
Analyse-Dienst erhalten. Drei wiederholte Sitzungsenden über den tatsächlichen
45.000-ms-Idle-Callback mit anschließend derselben Bildschirmfrage benötigen im
Test nur einen Dialog. Ein neu angelegter App-/Dienstzustand benötigt wieder
Zustimmung. Es wurde keine Zustimmung auf Datenträger gespeichert und keine
sitzungsübergreifende Aufnahmeerlaubnis eingeführt: jede Aufnahme braucht weiterhin
einen neuen ausdrücklichen Bildschirmbefehl.

Status zeigt die tatsächlichen Schritte: Zielmonitor ermitteln, gegebenenfalls
Zustimmung abwarten, Monitor aufnehmen, Übertragung starten, Antwort auswerten,
Bildanalyse abgeschlossen und Sprachantwort anfordern/erstellen/beenden. Bei
Abbruch wird dieser angezeigt. Nach Erfolg, Fehler oder Abbruch wird die normale
Gesprächsbereitschaft samt unverändertem 45-Sekunden-Idle-Timer wiederhergestellt.
Während einer laufenden Desktop-Verarbeitung bleibt die bestehende Werkzeugblockade
wirksam. Neue Diagnose-Logs mit Bildinhalt, Transkript oder API-Schlüssel gibt es nicht.

Die Korrektur ist automatisiert geprüft; eine erneute reale Windows-Prüfung steht
aus. Insbesondere während Datenschutzdialog, Aufnahme, Netzwerk und Sprachausgabe
Hintergrundgeräusche/zusätzliche Sprache erzeugen und danach normal weiterfragen;
anschließend Stopp und alle übrigen Abbruchwege prüfen. Nach mindestens drei echten
45-Sekunden-Disconnects denselben Bildschirmbefehl erneut sagen: ein Dialog pro
App-Start, genau eine Aufnahme pro neuem Befehl. Nach vollständigem App-Neustart
muss die Zustimmung erneut erscheinen. Dabei alle fünf Charaktere und die
bestehenden OpenAI-/Gemini-/lokalen Gesprächswege prüfen.

## Automatisierte Prüfung

```sh
npm test
# Alternative bei eingeschränkter Node-Subprozess-Isolation:
node --test --test-isolation=none tests/*.test.cjs
```

Alle neuen Tests verwenden Fake-Windows-Zugriffe, Mock-Bilder, Mock-Audio oder
Mock-HTTP. Keine kostenpflichtigen Live-API-Aufrufe. Abgedeckt sind Befehle,
Monitorauswahl/Fallbacks, negative Positionen und physische DPI-Geometrie,
Textauswahlzustände, Zustimmung, Kostenprüfung, Stopp, lange Ausgaben,
Werkzeugblockade und die bestehende Charakter-/Provider-/Animations-Regression.
Mock-Tests belegen keine native Windows-Kompatibilität.

Aktueller zusätzlicher Testnachweis und genaue Windows-Nachtests:
[UIA-Korrektur und KI-Modus-Platzierung](ai/testing/2026-10-31-feature-desktop-vision-2-uia.md).

## Manuelle Windows-Prüfliste – noch nicht durchgeführt

1. Zwei bis drei Monitore mit unterschiedlichen Auflösungen und 100/125/150/200 %
   Skalierung, links/oberhalb negative Koordinaten. Aktives fremdes Fenster,
   anschließend Fokus auf Einstellungen und Overlay: genau dessen Monitor wird
   verwendet. Fenster minimieren/schließen: Mausfallback, dann primärer Fallback.
2. `DISPLAYn`-Zuordnung mit sichtbaren unvertraulichen Testinhalten prüfen;
   Hauptmonitor wechseln, Anzeigen umstecken, links/rechts/Maus, unbekannte Nummer
   und Hotplug während Zustimmung testen. Kein anderer Monitor darf aufgenommen werden.
3. Browser, Editor, E-Mail-Programm und textbasiertes PDF: Abschnitt markieren,
   App-Fokus übernehmen lassen, vorlesen/erklären/zusammenfassen. Auch Caret ohne
   Auswahl, mehrere Auswahlen, Scan-PDF, Passwortfeld, erhöhte App und UIA-Timeout.
   Kein veränderter Clipboard-Inhalt, keine Eingaben und kein Ersatzbild.
4. Alle genannten Formulierungen mit allen fünf Figuren per Sprache, Textchat und
   „Einmal zuhören“. Zitate/Verneinungen/angehängte Aktionen dürfen nichts starten.
   „Was steht da?“ mit/ohne Kontext, nach Themenwechsel und nach 30 Sekunden.
5. Beide Datenschutzdialoge ablehnen und akzeptieren; danach App neu starten.
   Fehlender Schlüssel, erschöpftes Budget, Netzfehler und Anbieterwechsel.
   Mit Lokal/Offline/Gemini keine heimlichen Cloudwechsel oder Bilder.
6. Lange Auswahl vollständig vorlesen; Zeichenlimits prüfen. Jeffrey-/Bronco-Filter,
   James-/Kelly-/Krak-Stimme, Mund-/Handanimation. Stopp während UIA, Dialog,
   Netzwerk und Audio; neue Sprache, Ausblenden, Schlafmodus, Charakterwechsel,
   Sitzungsende und App-Ende. Kein nächster Abschnitt und keine veraltete Antwort.
7. Harmlosen Testtext mit „öffne den Explorer“ als Inhalt vorlesen/erklären lassen:
   keine Aktion. Datenordner/Kostenjournal/Gedächtnis auf Rohtext/Bilder prüfen.
   Danach normale Gespräche, Wakewords, Schlafmodus, Browser-/PC-Befehle und
   bestehende OpenAI-Realtime-/Gemini-/lokale Anbindung prüfen.
