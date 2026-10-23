# Animationsarchitektur Stufe 4.3

## Ausgangsproblem

Version 0.6.2 setzte fünf Lippenbilder in einer festen Folge alle 115 ms. Der Start erfolgte bei `response.created`, das Ende bei `response.done`. Beide Realtime-Ereignisse beschreiben die Antwortgenerierung und nicht den Zeitpunkt, an dem das Audio tatsächlich am Lautsprecher anliegt. Dadurch lief der Mund vor oder hinter dem Ton und zeigte zufällige Formen. Ein Bildwechsel ersetzte außerdem den vorherigen Frame hart, statt mehrere Formen weich zu mischen.

## Gewählte Technik

Kelly und Krak verwenden weiterhin ihre freigegebenen 2D-Game-Porträts. Kopf, Hände und Mund-Rig sind getrennte Ebenen. Die fünf vorhandenen Mundbilder werden gleichzeitig geladen und per Deckkraft überblendet. Eine kleine lokale Deformation verschiebt und skaliert ausschließlich den Mundbereich als Kieferbewegung; der Kopf bleibt stabil.

Die Synchronisation hängt direkt am empfangenen WebRTC-Ausgabestream:

1. `realtime.js` übergibt den tatsächlich abgespielten `MediaStream` an `lip-sync-runtime.js`.
2. Ein lokaler Web-Audio-`AnalyserNode` misst Pegel sowie tiefe, mittlere und hohe Frequenzanteile ungefähr alle 32 ms.
3. Laufende `response.output_audio_transcript.delta`-Fragmente werden lokal in deutsche Viseme-Gruppen umgewandelt.
4. Hörbares Audio verbraucht diese Visemes mit Mindesthaltezeit; fehlen Textfragmente, entscheidet das Frequenzbild zwischen Rundung, Spreizung, Öffnung und Reibelaut.
5. Unterhalb der Stille-Schwelle schließt der Mund nach 80 ms. `response.done` beendet die Mundbewegung nicht vorzeitig.
6. Ein `BroadcastChannel` überträgt nur kleine, begrenzte Pose-Daten vom Steuerfenster zum Desktop-Overlay. Es entsteht kein zweiter Wiedergabestream.

## Augenanimation

Die früher ergänzte CSS-Blinkebene bestand nur aus dunklen Ellipsen über dem fertigen Porträt. Sie konnte bei Skalierung und Bewegung verrutschen und wurde in v0.6.4 vollständig entfernt. Glaubwürdiges Blinzeln erfordert getrennte Augen- oder Lid-Assets beziehungsweise ein echtes Gesichts-Rig.

## Technische Grenze

OpenAI Realtime liefert über diesen WebRTC-Pfad keine verlässlichen Phonem-Zeitstempel. Stufe 4.3 ist deshalb eine audio-synchronisierte, transkriptgestützte Viseme-Schätzung und keine Studio-Forced-Alignment-Lösung. Sie ist deutlich näher am hörbaren Signal als die feste Bildfolge und verwendet mehr als den Lautstärkepegel, kann aber ähnlich klingende Laute nicht in jedem Satz perfekt unterscheiden.

Echte Phonem-Zeitcodes würden zukünftig entweder zeitmarkierte Serverdaten oder ein zusätzliches lokales Sprachmodell erfordern. Beides wurde bewusst nicht ergänzt, um Cloud-Kosten, Modell-Downloads und dauerhafte Hintergrundlast zu vermeiden.

## Ressourcen und Sicherheit

- Pro Live-Sitzung existiert höchstens ein Analysekontext.
- Beim Beenden werden Animation-Frame, Audioquelle, Analyser und `AudioContext` freigegeben.
- API-Schlüssel, Windows-Aktionsfreigaben und bestehende IPC-Grenzen bleiben unverändert.
- Der visuelle Test in `VORSCHAU.html` trägt ausdrücklich die Kennzeichnung „SIMULATION – kein echtes Audio“.
