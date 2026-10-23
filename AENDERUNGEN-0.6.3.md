# Änderungen in Jeffrey & Friends 0.6.3

## Neue Animation

- `lip-sync.js`: reiner, getesteter Viseme-Kern für deutsche Textfragmente, akustische Klassifikation, Stille-Erkennung und sichere Pose-Daten.
- `lip-sync-runtime.js`: Web-Audio-Analyse des WebRTC-Ausgabestreams, weiche Ebenenmischung, Kieferdeformation, Blinkebene, Fensterübertragung und Cleanup.
- `lip-sync.css`: Darstellung des Mund-Rigs, weiche Übergänge, lokales Kiefer-Transform und visuelle Teststeuerung.
- `realtime.js`: direkte Übergabe von Audio-Stream und Transkriptereignissen an den Lip-Sync-Kern; Cleanup beim Sitzungsende.
- `renderer.js`: feste 115-ms-Mundsequenz entfernt. Kopf- und Handanimationen bleiben unabhängig.
- `index.html`: Stufe 4.3, neue lokale Skripte und Styles sowie aktualisierter Bedienhinweis.

## Kelly und Krak

- Alle fünf vorhandenen Munddateien bleiben unverändert und werden als gleich große Ebenen verwendet.
- Die pixelgleichen Neutralframes sind korrekt als Lippenverschluss zugeordnet: Kelly Frame 2, Krak Frame 3.
- Die stärksten vorhandenen Deformationen dienen als offene `AA`-Form: Kelly Frame 4, Krak Frame 0.
- Hände bleiben getrennte Ebenen und behalten Winken, Zeigen, Denken und Gesprächsgesten.

## Tests und Vorschau

- Neue Tests: `tests/lip-sync.test.cjs`, `tests/lip-sync-runtime.test.cjs`, `tests/realtime-lip-sync-integration.test.cjs`, `tests/rig-map.test.cjs` und `tests/stage43.test.cjs`.
- `VORSCHAU.html` öffnet die interaktive Vorschau mit Kelly-/Krak-Auswahl, Einzelvisemes und einer kurzen simulierten Sequenz.
- Die Simulation nutzt kein OpenAI-Audio und verursacht keine API-Kosten.

## Unverändert erhalten

OpenAI Realtime, Figurenstimmen und Persönlichkeiten, Weckwörter, Verabschiedung, 45-Sekunden-Abschaltung, Modi, Größe und Position, Einstellungen, Hologramm, Browser-/Idealo-Funktionen, begrenzte Windows-Aktionen, PC-Status, Kommentare, lokales Gedächtnis und geschützte Schlüsselablage bleiben bestehen.
