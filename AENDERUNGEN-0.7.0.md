# Jeffrey & Friends 0.7.0 – Jeffrey klingt nach Computer

- Nur Jeffrey: eigene lokal gefilterte Realtime-Stimme (aus / leicht / blechern / robotisch). Standard: **Blechern**.
- Leicht erhoehte Tonlage durch neuen `jeffrey-pitch-worklet.js`, alternativer ScriptProcessor bei Worklet-Problemen; Frequenzgang, milde Verzerrung und Kompressor.
- Separater AudioContext mit direkter Lautsprecherausgabe und Fallback auf den Originalton, damit ein erneuter Weckruf nicht stumm bleibt.
- Jeffreys Antworten sind nun direkter, kompetenter, trockener und weniger ueberschwaenglich. Andere Charakterprompts unveraendert.
- **Unveraendert:** `bronco-voice.js`, `bronco-pitch-worklet.js`, alle Bronco-Voreinstellungen und Charakterassets, Kelly/Krak und alle Sicherheitsgrenzen.
- Die Filter gelten fuer **Live-Gespraeche**; die separate Stimme fuer spontane Kommentare wird weiterhin von deren bisherigem Ausgabepfad erzeugt.
- Keine zusaetzlichen OpenAI-API-Aufrufe durch den Filter; Live-Gespraeche kosten wie gehabt.

## Testen unter Windows
1. Vorherige Version ueber das Tray beenden.
2. Neue ZIP entpacken, `START-Windows.cmd` ausfuehren.
3. Jeffrey waehlen. Beim Stimmen-Menue **Jeffreys Computerstimme → Blechern** auswaehlen; gilt ab naechstem Live-Gespraech.
4. Jeffrey mehrmals wecken, verschwinden lassen und erneut wecken. Ton muss jedes Mal da sein.
5. Dann **Robotisch** probieren. Bei unangenehmem Klangeffekt **Leicht** waehlen.
6. Bronco auswaehlen und wiederholt rufen: seine hervorragende tiefe Stimme muss unveraendert klingen.

Hinweis: Automatische Tests pruefen Logik und Soundrouting, nicht die subjektive Tonqualitaet auf Lautsprechern.
