# Sprachgesteuertes Koordinatennetz und Zustimmungen

Implementiert für Windows 11 auf dem Stand von Desktop Vision 2.0. PR #4 bleibt
unverändert; diese Erweiterung liegt in `feature/mouse-grid-consent` mit
`feature/desktop-vision-2` als Basis. Noch keine praktische Windows-Abnahme.

## Starten und bedienen

„Raster anzeigen“ im Steuerungsfenster startet den Koordinatenmodus. Ohne Cloud
geht auch „Einmal zuhören“ oder das Textfeld: „Jeffrey, zeig das Koordinatennetz“.
Ein erkanntes Startkommando im bestehenden OpenAI-Live-Gespräch wird lokal
weitergeleitet und dessen automatische KI-Antwort abgebrochen. Das Startkommando
wurde in diesem Fall bereits von der bestehenden Cloud-Spracherkennung transkribiert.
Gemini hat im bisherigen Kompatibilitätsmodus keine Nutzertranskripte; dort die
Oberfläche, Textfeld oder einmaliges Windows-Zuhören verwenden.

Während der Modus aktiv ist, wird Live geschlossen und sein Wakeword-Start
pausiert. Ein deutscher Windows-System.Speech-Erkenner hört lokal auf feste
Rasterbefehle, mit oder ohne Charaktername. Mikrofon und deutsche
Desktop-Spracherkennung müssen in Windows verfügbar sein. Alle fünf Namen bleiben
verwendbar. Keine Audioübertragung an KI-Anbieter für die anschließenden
Rasterbefehle, keine Bildschirmaufnahme. Spontane Kommentare und PC-Hinweise
pausieren wie im Live-Gespräch, damit die eigene Ausgabe den Rasterhörer nicht stört. Bei Erkennerfehler stoppt die Bewegung;
Oberflächen-Stopp und Textfeld bleiben benutzbar. Nach Installation einer fehlenden
Sprachkomponente den Modus beenden und neu starten.

| Befehl | Wirkung |
| --- | --- |
| „Jeffrey, A3“, „B4“, „Feld D2“ | Mittelpunkt des Feldes wählen und anfahren |
| „Berta 3“, „Cäsar 2“, „Delta 4“ | Buchstabieralternativen; auch Anton, Alpha, Bravo, Charlie, Dora |
| „D4 links oben“ | Mittelpunkt des linken oberen Viertels von D4 anfahren |
| „Links oben“, „rechts oben“, „links unten“, „rechts unten“ | Internes Viertel des aktuellen Zielbereichs wählen |
| „Nochmals links oben“ | Dasselbe Verfahren innerhalb des bereits gewählten Viertels |
| „Mitte“ | Mittelpunkt des aktuellen Zielbereichs anfahren |
| „Feld unterteilen“ | Gewählten Bereich erneut in A1–D5 unterteilen |
| „Zurück“ | Letzte Viertelung oder Rasterunterteilung zurücknehmen und vorheriges Ziel anfahren |
| „Raster neu starten“, „Koordinatennetz zurücksetzen“ | Vollständiger Monitor, Auswahl löschen |
| „Maus hierhin“ | Zuletzt gewähltes Ziel erneut anfahren |
| „Raster ausblenden“, „Raster 0 Prozent“ | Unsichtbar, Koordinatenmodus hört weiter lokal zu |
| „Raster 50 Prozent“ | Sichtbarkeit setzen, 0–100 als Zahl; auch z. B. „fünfzig“ |
| „Raster anzeigen“ | Sichtbar machen; bei 0 % auf 100 % setzen |
| „Stopp“, „Maus stoppen“, „Maus anhalten“ | Bewegung abbrechen, aktuelle Position behalten |
| „Koordinatennetz beenden“ | Bewegung stoppen, Overlay und lokalen Rasterhörer beenden |

„Stopp“ wirkt auch während der Rasterinitialisierung. Bei Erkennung wird der
Stoppbefehl sofort an den laufenden nativen Bewegungsprozess geschickt; nach
Verarbeitung des Stopps erzeugt der Bewegungsalgorithmus keine weiteren Frames.
Die Ende-zu-Ende-Latenz der echten Spracherkennung muss unter Windows gemessen
werden. Die große Schaltfläche **Maus STOPP** ist unabhängig von Spracherkennung
bedienbar und per Tastatur erreichbar. „Stopp“ lässt den Modus aktiv; Schlaf,
Charakter-/Anbieterwechsel oder tatsächliches Beenden der App verlassen ihn.
Das Schließen der Einstellungen verbirgt weiterhin nur das Fenster; über das
Tray lässt es sich wieder öffnen. App-Ende erfolgt über „Beenden“ im Tray.

Keine Klicks, Doppelklicks, Drag-and-drop oder Scrollaktionen. Das Raster fängt
keine Mausinteraktionen ab und übernimmt keinen Fensterfokus. Zitate, Verneinungen
und angehängte Aktionen werden vom Parser nicht als gültige Mausbefehle freigegeben.
Eine eingeschränkte Sprachgrammatik kann Fehlhörer nicht vollständig ausschließen;
Stopp und Modus beenden bleiben die direkten Korrekturwege.

## Raster, Feinsteuerung und Einstellungen

Das Grundraster hat immer vier Reihen und fünf Spalten. Die gesamte native
Monitorfläche einschließlich Taskleiste wird lückenlos auf ganze Pixel aufgeteilt.
D4 auf einem Monitor mit 1920×1080 Pixeln ab (0,0) hat das Ziel (1344,945), sein
linkes oberes Viertel (1248,877). Rechts/unten ist die exklusive Rechteckgrenze.

Feinsteuerung viertelt nur intern: sichtbare Rasterlinien bleiben an ihrer Stelle.
„Feld unterteilen“ ändert hingegen das sichtbare Raster zum ausgewählten Bereich.
Die aktive Region wird gelb markiert, das Ziel als Punkt. Sobald die Rasterfläche
für Beschriftungen zu klein wäre, erscheint eine große A1–D5-Legende; der Rahmen
zeigt weiterhin die tatsächliche Region auf dem Desktop. Das ist eine Legende,
keine Vergrößerung oder Aufnahme von Bildschirminhalten.

Unter „Raster & Bewegung einstellen“:

- Sichtbarkeit 0–100 %, Vorgabe 100 %. Bei 0 % bleiben Modus und lokale Befehle aktiv.
  Der Wert wird gespeichert; explizites „Raster anzeigen“ macht ein unsichtbares
  Raster wieder sichtbar. Nach App-Start ist der Koordinatenmodus immer aus.
- Bewegungsgeschwindigkeit 200–3000 physische Pixel/Sekunde, Vorgabe 900. Dies ist
  die mittlere Richtgeschwindigkeit für neue Bewegungen; sanftes Beschleunigen und
  Abbremsen ergibt eine höhere Spitzengeschwindigkeit. Dauer 80 ms bis 60 s.
- Maximale Unterteilungstiefe 1–8, Vorgabe 4. Raster- und Viertelungsschritte zählen
  gemeinsam. Ein weiteres 4×5-Raster braucht mindestens 10×8 Pixel, Viertelung
  mindestens 4×4; kleinster resultierender Zielbereich ist 2×2 Pixel.
  Änderung der Tiefengrenze stoppt und setzt ein aktives Raster zurück.

Neue Ziele ersetzen laufende Bewegungen ausgehend von der dann tatsächlichen
Zeigerposition. Der native Prozess prüft den gewählten Monitor vor jedem Frame.
Fehlt er oder stimmen seine Grenzen nicht mehr, endet die Bewegung mit fester
Fehlermeldung. Ein von Windows begrenzter Zeiger wird nicht als „Ziel erreicht“
bestätigt. Physische Eingaben oder Cursor-Sperren anderer Anwendungen können die
Bewegung beeinflussen und sind unter Windows zu prüfen.

## Monitore und DPI

Die vorhandene Desktop-Vision-Auswahl wird wiederverwendet: Monitor des aktuellen
bzw. zuletzt aktiven fremden Fensters, dann Mausmonitor, dann Hauptmonitor.
Die App-Fenster zählen nicht als Ziel. Explizit zum Beispiel:

- „Raster auf Monitor zwei“ oder „Zeig das Koordinatennetz auf Bildschirm eins“
- „Raster auf den linken Bildschirm“ / „Raster auf den rechten Monitor“
- „Raster auf den Bildschirm mit meiner Maus“

Nummern sind GDI-`DISPLAYn` und können von der Windows-Einstellungsanzeige abweichen.
Ein fehlender ausdrücklich gewählter Monitor wird nicht stillschweigend ersetzt.
Eine erneute explizite Monitorauswahl setzt Raster und Ziel zurück.

Native Rechtecke und Cursorziele verwenden physische Pixel, auch bei negativen
Ursprüngen und verschiedenen Skalierungen. Nur das Overlay wird mit Electrons
`screenToDipRect` in DIP umgerechnet; bloßes Dividieren durch einen DPI-Faktor
würde bei gemischter Skalierung die Ursprünge verfälschen. 16:9, 21:9, 32:9 und
Hochkant benötigen keine Sonderraster. Monitorwechsel, Hotplug, Auflösungs- oder
Skalierungsänderung beenden den Modus; danach ausdrücklich neu starten.

Ziele bleiben innerhalb des gewählten Monitors. Befindet sich der Zeiger vorher
auf einem anderen Monitor, führt die Bewegung vom tatsächlichen Start zum Ziel
über den virtuellen Desktop. Windows kann an Lücken zwischen Monitoren den Zeiger
begrenzen; dieser Übergang braucht einen echten Mehrmonitor-Test. Es gibt keinen
absichtlichen Sprung zum Rand des gewählten Monitors.

## Getrennte Cloud-Zustimmungen

Bildschirmaufnahme und markierter Text haben jeweils einen eigenen App-Dialog:

| Auswahl | Geltung |
| --- | --- |
| Abbrechen | Keine Übertragung, keine neue gespeicherte Freigabe |
| Einmal erlauben | Nur der konkrete Auftrag; Vorlesen umfasst dessen sequenzielle Audioabschnitte |
| Auf diesem Gerät dauerhaft erlauben | Weitere ausdrücklich angeforderte Aufträge derselben Datenart an OpenAI, auch nach App-Neustart |

Der Dialog benennt Datenart, OpenAI, mögliche vertrauliche Inhalte und API-Kosten,
vorübergehende Verarbeitung in der App sowie die Datenschutzregeln des Empfängers.
Abbrechen ist die Standardauswahl. Der Status wird versioniert im lokalen
`settings.json`-App-Profil gespeichert, ohne Inhalte oder Schlüssel. Bestehende
Prozessfreigaben und unbekannte Schema-Versionen werden nicht übernommen.

Widerruf unter **KI-ANBIETER & KOSTEN → Datenschutz → Bildschirm-/Text-Freigabe
widerrufen**. Nur die gewählte dauerhafte Freigabe wird entfernt; laufende
Desktop-/Textausgabe wird vorsorglich abgebrochen. Offene Dialogantworten können
einen zwischenzeitlichen Widerruf nicht überschreiben. Wenn Speichern fehlschlägt,
bleibt der Widerruf zur Laufzeit wirksam und die App meldet den Speicherfehler;
vor Neustart muss das Einstellungsprofil wieder beschreibbar sein. Dauerhafte
Zustimmung erlaubt eine Übertragung erst nach erfolgreichem Speichern.

Es gibt weiterhin keine Hintergrundaufnahme oder Textüberwachung. Ein neuer
expliziter Bildschirm-/Textbefehl ist immer erforderlich. Empfängerwechsel erbt
keine Freigabe; derzeit besitzt nur OpenAI den passenden Cloud-Auswahlpfad.
Lokal/Offline braucht keine Cloud-Zustimmung. Gemini bleibt ohne geeigneten
Bild-/Auswahl-/TTS-Pfad, ohne automatischen Anbieterwechsel. Die UIA-Auswahl wird
vor einem Text-Cloud-Dialog ausgelesen: bei UIA-Fehler gibt es keinen solchen
Dialog und keine Übertragung. Windows-UAC, SmartScreen und Mikrofonrechte sind
unabhängige Systemberechtigungen und ersetzen keine App-Zustimmung.

Temporäre Bildpuffer, begrenzte Audioabschnitte und bestehende Löschpfade bleiben
erhalten. Keine Diagnose protokolliert Inhalte, Titel, Transkripte oder API-Schlüssel.
Allgemeine Chat-Nachrichten bleiben wie bisher flüchtig im Chat; direkte
Rasterbefehle werden nicht in den KI-Chat oder das Gedächtnis aufgenommen.

## Windows-Abnahme (noch offen)

1. Windows 11 und Windows PowerShell 5.1 als normaler Benutzer, deutscher
   Desktop-Spracherkenner und Mikrofon: Modus per Oberfläche, einmaligem Zuhören
   und OpenAI-Live-Befehl starten. Alle fünf Namen, B/C/D und Buchstabieralternativen
   in ruhiger Umgebung und bei Hintergrundgeräuschen prüfen. Keine zusätzlichen
   API-Verbindungen im Koordinatenmodus; nach Ende Wakeword und normales Gespräch.
2. 16:9, Ultrawide, Super-Ultrawide, Hochkant sowie links/oberhalb liegende Monitore
   bei 100/125/150/200 % Skalierung: Raster, Zielpunkt und physische Zeigerposition
   vergleichen. Monitore mit Zwischenräumen, Taskleisten, Größenwechsel und Hotplug.
3. D4 → links oben → nochmals links oben → rechts unten; sichtbare Linien müssen
   stehen bleiben. Mehrere „Feld unterteilen“-Schritte, große Legende, Zurück,
   Neustart sowie Tiefen-/Pixelgrenzen prüfen. Keine Klicks oder Fokusänderungen.
4. Langsame/lange Bewegung, neue Ziele rasch hintereinander, „Stopp“ und UI-Stopp
   während Bewegung und Initialisierung. Zeiger muss stehen bleiben, kein altes
   Ziel nachlaufen. Schlaf, Charakter-/Anbieterwechsel, App-Ende, fehlender Erkenner,
   gesperrter Desktop und Cursor-Sperren anderer Apps prüfen. Sprach-Stopp-Latenz messen.
5. Sichtbarkeit 100/50/0 %, weiter bewegen bei 0 %, anzeigen, ausblenden, Modus
   beenden; Einstellungen und Sichtbarkeit nach App-Neustart prüfen.
6. Jeweils Bildschirm/Text: Abbrechen, Einmal und Dauerhaft; wiederholte Aufträge
   nach drei echten 45-Sekunden-Disconnects und vollständigem Neustart. Einmal muss
   erneut fragen, dauerhaft nicht. Widerruf, Widerruf bei offenem Dialog, nicht
   beschreibbares Profil und Empfängerwechsel prüfen. Ohne expliziten Auftrag
   keine Aufnahme, kein Auslesen und kein Transfer.
7. Desktop Vision inklusive Monitorwahl, Editor-/Browser-UIA und Vorlesen erneut
   prüfen. Stimmen, Filter, Charaktere, einzelner KI-Modus und normale
   OpenAI-/Gemini-/lokale Gespräche dürfen keine Regression zeigen.

Automatisierte Prüfungen und Grenzen:
[Testnachweis](ai/testing/2026-10-31-feature-mouse-grid-consent.md).
