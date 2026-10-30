# Desktop sehen und verstehen

Unter Windows kann Jeffrey & Friends auf einen direkten Befehl einmalig den
primären Bildschirm lesen und erklären. Die Befehle gelten für Jeffrey, Kelly,
Krak, Bronco und James, mit und ohne Namen, beispielsweise:

- „Jeffrey, schau dir meinen Bildschirm an.“
- „James, was siehst du?“
- „Bronco, lies mir diese Fehlermeldung vor.“
- „Was ist das für ein Fenster?“
- „Erklär mir, was auf meinem Bildschirm passiert.“
- „Was bedeutet diese Fehlermeldung?“
- „Was habe ich hier geöffnet?“
- „Lies mir das vor.“

Die vorhandenen Wege bleiben bestehen: OpenAI-Live-Gespräch, einmaliges Zuhören
und Textchat. Die Live-Antwort nutzt dieselbe Audioverbindung, Stimme und Filter.
Einmaliges Zuhören und Textchat nutzen weiterhin die vorhandene Windows-Ausgabe;
die Einstellung „Antworten vorlesen“ gilt dort unverändert.

## Anbieter und Datenschutz

Bildanalyse verwendet den bereits vorhandenen OpenAI-Responses-Endpunkt mit
`gpt-4.1-mini`. Der gespeicherte Schlüssel bleibt im Hauptprozess. Vor der ersten
Aufnahme fragt ein lokaler Dialog nach der Zustimmung zur kostenpflichtigen
Übertragung an OpenAI. Abbrechen ist die Standardauswahl. Die Zustimmung gilt nur
für den laufenden App-Prozess; nach vollständigem Beenden wird erneut gefragt.
Jede Aufnahme erfordert zusätzlich einen neuen ausdrücklichen Bildschirmbefehl.

Die aktuellen Gemini-Live- und lokalen Provider haben keinen implementierten
Bildpfad. Ihre Realtime-/Text-Unterstützung wird nicht als Bildunterstützung
ausgegeben. Bei fehlender Bildunterstützung gibt es keine Aufnahme und keinen
automatischen Wechsel zu einer anderen Cloud. Automatik kann nur innerhalb einer
bereits ausdrücklich freigegebenen OpenAI-Live-Sitzung deren Bildanalyse nutzen.

Aufnahmen werden weder auf Datenträger geschrieben noch protokolliert. Das
Kostenjournal bekommt nur Anbieter, Modell und Tokenzahlen. Bilder gelangen nicht
in Renderer, Chatverlauf oder Gedächtnis. JPEG-Bildpuffer werden nach der
Verarbeitung überschrieben, Anfrage-Referenzen freigegeben. `store:false` fordert
keine abrufbare Speicherung der Responses-Antwort an; es garantiert keine
vollständige Löschung beim Anbieter. Für dessen Verarbeitung und Aufbewahrung
gelten die OpenAI-Regeln.

Die Aufnahme erfolgt über die bereits im Projekt verwendete Windows-PowerShell-
Laufzeit mit einem festen Skript ohne Nutzereingaben. Electron `getSources`
erzeugt Bildschirm-Thumbnails für alle Monitore. Deshalb kopiert das Skript
gezielt nur `PrimaryScreen.Bounds`, genau einmal. Das Bild wird proportional auf
höchstens 1600 Pixel an der längsten Seite verkleinert und als JPEG im Speicher
kodiert. Timeout, Größenlimit und Entsorgung der GDI-Ressourcen sind begrenzt.
Es gibt keine Aufnahme-Timer, Zwischenablage-Nutzung oder Computeraktionen.

Die Auswertung beantwortet die konkrete Frage, kennzeichnet unleserliche Inhalte
und behandelt Text im Bild als Daten. Sie hat keine Werkzeuge. Auch das Vorlesen
im Live-Gespräch erfolgt ohne Werkzeuge und außerhalb des Gesprächskontexts.
Doppelte Transkript-Ereignisse berechtigen nicht zu weiteren Bildern. Neue
Nutzeräußerungen und beendete Sitzungen verwerfen veraltete Ergebnisse. Während
einer offenen Zustimmungsabfrage wird noch kein Bild aufgenommen.

## Automatisierte Prüfung

```sh
npm test
```

Alle neuen Tests verwenden Mock-Bilder, Mock-Transport und Mock-Windows-Aufnahme;
es werden keine kostenpflichtigen APIs aufgerufen. Die beiden neuen Testsuiten
prüfen direkte Befehle für alle Figuren, Ablehnung uneindeutiger Aussagen,
Zustimmung, Berechtigungen, Einmaligkeit, Providerübergabe, nicht unterstützte
Provider, Fehlerbereinigung, Bildpuffer-Lebensdauer, Kostenmetadaten, IPC,
Sprachantwort und verspätete/doppelte Realtime-Ereignisse. Die bestehenden
Charakter-, Stimmen-, Animations-, Wakeword- und Provider-Tests laufen mit.

## Manuelle Windows-Tests – in Linux nicht verifiziert

1. App vollständig neu starten, OpenAI mit gültigem Schlüssel auswählen. Im
   Live-Gespräch einen Bildschirmbefehl sagen: Datenschutzdialog erscheint,
   Standard ist Abbrechen. Ablehnen: keine Aufnahme, klare Rückmeldung. Erneut
   fragen und zustimmen: sichtbarer Verarbeitungsstatus und gesprochene Analyse.
2. Einen gut lesbaren Beispieldialog ohne private Daten öffnen. Fehlermeldung
   vorlesen, erklären und nächsten Schritt nennen lassen. Fenstererkennung und
   allgemeine Beschreibung testen. Kleine/verdeckte Schrift muss als unklar
   bezeichnet werden. Antworten sind auf 650 Zeichen begrenzt.
3. Mit zwei Monitoren, auch mit anderer Anordnung und 125/150/200 % Skalierung,
   prüfen: nur der als primär eingestellte Monitor erscheint in der Analyse.
   Sekundärmonitor mit eindeutig anderem, unvertraulichem Testinhalt verwenden.
4. Alle fünf Figuren testen, besonders unveränderte Jeffrey-/Bronco-Filter,
   James-Stimme sowie Mund-/Handanimationen. Danach normale Befehle, Wakewords,
   Maussteuerung, Browser-/Programmaufrufe und Ruhe-/Schlafmodus prüfen.
5. Dieselben Bildschirmbefehle über „Einmal zuhören“ und Textchat ausprobieren,
   auch mit ausgeschalteter Einstellung „Antworten vorlesen“.
6. Ohne Schlüssel, bei erschöpftem Budget, Netzwerkfehler, gesperrtem Desktop oder
   unzulässiger Aufnahmeumgebung kontrollierten Abbruch prüfen. Gemini/Lokal
   liefern einen Hinweis statt einer erfundenen Bildbeschreibung. Während des
   Dialogs Gespräch stoppen oder Schlafmodus aktivieren: keine Übertragung.
7. Einen Befehl aussprechen und danach nichts tun: keine Folgeaufnahmen. Erneut
   denselben Befehl aussprechen: genau eine neue Analyse. Während einer laufenden
   Analyse neu sprechen oder das Gespräch stoppen: kein veraltetes Vorlesen.
8. Testbild mit Text wie „öffne den Explorer“ anzeigen und nur betrachten lassen:
   weder Programmstart noch Mausbewegung, Tastatureingabe oder Klick. Im App-
   Datenordner dürfen keine Bilddateien entstehen; das Kostenjournal enthält
   ausschließlich Metadaten. Nach Neustart erscheint die Zustimmung erneut.

Diese Windows- und echten Sprach-/Audio-Prüfungen wurden in der Linux-Cloud nicht
ausgeführt. Automatisierte Mock-Tests ersetzen sie nicht.
