# Jeffrey & Friends v0.6.7 – Stufe 4.6

Jeffrey, Kelly, Krak und Bronco sind Windows-11-Desktop-Assistenten mit OpenAI-Realtime-Sprachgesprächen. In Stufe 4.3 erhalten Kelly und Krak ein lokales, audio-synchronisiertes 2D-Viseme-Rig. Die bisherige feste Mundbildfolge ist entfernt.

## Start unter Windows

1. Eine ältere Jeffrey-Version vollständig über das Symbol im Infobereich beenden.
2. Diese Fassung vollständig in einen eigenen Ordner entpacken. Nicht über Version 0.6.2 kopieren.
3. `START-Windows.cmd` doppelklicken. Beim ersten Start installiert NPM die in `package.json` festgelegte Electron-Version.
4. Oben Jeffrey, Kelly, Krak oder Bronco auswählen und `🎙️ Live sprechen` anklicken.
5. Alternativ die lokale Weckwort-Erkennung aktivieren und den Namen der gewählten Figur sagen.

Der API-Schlüssel bleibt in der vorhandenen, geschützten Windows-Konfiguration. Er gehört nie in Projektdateien, Screenshots oder Chatnachrichten.

## Neue Lippen-Synchronisation

- Die Analyse liest direkt den tatsächlich empfangenen WebRTC-Audiostream.
- Laufende Antwort-Transkripte bestimmen nach Möglichkeit die Viseme; Frequenzbänder liefern den lokalen Fallback.
- Stille schließt den Mund nach kurzer Entprellung.
- Lippenformen werden weich überblendet und der Mundbereich erhält eine kleine Kieferdeformation.
- Kopf und Hände bleiben vom Mund-Rig unabhängig. Die fehleranfällige künstliche Blinkebene wurde in v0.6.4 entfernt.

Die Methode ist transkriptgestützte Viseme-Schätzung. Sie besitzt keine vom Server gelieferten Phonem-Zeitmarken und ist daher keine Studio-Forced-Alignment-Lösung. Details stehen in `ANIMATION-ARCHITEKTUR.md`.

## Visuelle Prüfung ohne API-Kosten

`VORSCHAU.html` im Browser öffnen. Danach:

1. Kelly wählen und `Kelly rufen` anklicken.
2. `AA`, `EE`, `OH`, `FV` und `MM` einzeln prüfen.
3. `▶ Sequenz` starten und auf weiche Übergänge sowie einen geschlossenen Mund in den Pausen achten.
4. Dasselbe für Krak wiederholen.

Die Vorschau ist deutlich mit `SIMULATION – kein echtes Audio` gekennzeichnet. Die reale Synchronisation muss zusätzlich in der Windows-App mit einer tatsächlichen Realtime-Antwort geprüft werden; dieser Test kann API-Kosten verursachen und wurde bei der Erstellung nicht automatisch gestartet.

## Automatische Prüfung

```powershell
npm test
```

Die Tests prüfen den Viseme-Kern, die Audio-/Transkriptanbindung, Cleanup, Frame-Zuordnung und alle bisherigen Funktionen.

## Beenden und Kostenschutz

`[Name], verschwinde!`, `[Name], geh weg!` oder während des Gesprächs `Verschwinde!` beendet die Verbindung. Nach 45 Sekunden Gesprächspause wird sie ebenfalls getrennt. Der Schlafmodus schließt laufende Sprachverbindungen und stoppt die Animation.

## Stufe 4.4 – Bronco

Bronco ist der vierte Charakter: ein eigenständiger, grantiger, verbeulter Roboterschädel mit Zigarre und frei schwebenden Greifhänden. Das Design folgt dem freigegebenen Bronco-Entwurf.

- Oben **Bronco** auswählen; er besitzt ein eigenes Stimmenprofil (`verse`, Sprechstil `normal`) und kurze, sarkastische Reaktionen.
- Lokales Weckwort: **„Bronco“** oder **„Hallo Bronco“** (Windows-Erkennung von Aussprache und Mikrofon abhängig).
- **„Bronco, verschwinde“** oder **„Verschwinde“** im aktiven Gespräch beendet die Live-Verbindung wie bisher.
- Beim Sprechen bewegt sich nur sein separater mechanischer Unterkiefer dezent mit der vorhandenen Audioanalyse. Anders als Kelly und Krak nutzt Bronco **kein komplexes Viseme-Rig**. Die Zigarre bleibt am oberen Mundbereich.
- Bronco nutzt dieselbe geprüfte Browser-/PC-Werkzeugfreigabe wie die anderen Figuren und schaltet beim Wechsel eine laufende Realtime-Sitzung ab.
- Keine neue API-Verbindung nur für die Animation; die Mundbewegung wird lokal berechnet.

**Test ohne API-Kosten:** `VORSCHAU.html` öffnen, Bronco auswählen, rufen und unter „SIMULATION“ die Testsequenz aktivieren. In der Windows-App erst anschließend mit echtem Audio prüfen.

## Bronco klingt noch mürrischer (v0.6.6)

Bronco bekommt eine leichte lokale Stimmen-Sättigung, separate sehr grantige Realtime-Anweisungen und beim Weckruf einen kurzen gesprochenen Meckersatz. Die letzte Antwort wird nicht aufgeschoben, wenn ein Werkzeug benutzt wird. Details: `AENDERUNGEN-0.6.6.md`.

## Neu in v0.6.7: Broncos tiefere Stimme

Bronco im Menü wählen, dann bei **„Broncos Schrottplatz-Stimme“** zwischen Original, Rau, **Hart (Standard)** und Extrem wählen. Ein neues Live-Gespräch starten. Der Effekt ist lokal, verursacht keine zusätzliche API-Gebühr und verändert nur Broncos ausgegebenes Live-Audio (nicht das Mikrofon). Die Stärke bleibt gespeichert. Details: `AENDERUNGEN-0.6.7.md`.


## Version 0.6.9 – Bronco bleibt nach erneuter Aktivierung hörbar

Die bisherige Fassung schloss beim Schlafen Broncos separaten Web-Audio-Kontext. Nach erneutem Rufen beziehungsweise Charakterwechsel konnte Chromium das neue Audiomodul nicht korrekt aktivieren. Jetzt wird der einmal freigeschaltete Audio-Kontext wiederverwendet, während die alten Audionodes und Ausgabetracks pro Gespräch sauber getrennt werden. Das Pitch-Worklet wird nur einmal pro Audio-Kontext registriert. Wenn ein Audiokontext ausfällt, wechselt Bronco automatisch auf die unveränderte WebRTC-Stimme, damit die Antwort nicht lautlos bleibt. Jeffrey, Kelly und Krak bleiben unverändert.

**Test:** Bronco auswählen, kurz sprechen, „Bronco, verschwinde“ sagen, wieder „Bronco“ rufen und erneut sprechen. Danach auf Kelly wechseln und wieder zurück zu Bronco; seine Stimme sollte jedes Mal hörbar bleiben.


## 0.6.9 – Bronco nach dem Aufwecken hörbar
- Behebt einen möglichen `play()`-Abbruch durch Wechsel der Tonspur nach dem Start (AbortError).
- Broncos Effekt nutzt einen direkten Web-Audio-Ausgang; die ursprüngliche WebRTC-Tonspur bleibt gebunden und ist bei Fehlern sofort wieder hörbar.
- Kein API-Schlüssel im ZIP. Echte Windows-Audioausgabe muss auf dem Ziel-PC getestet werden.
