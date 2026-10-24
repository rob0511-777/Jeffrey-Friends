# Jeffrey & Friends v0.7.1 – Bronco bewegt seine Haende nur beim Sprechen

- **Bronco:** Seine beiden Haende bewegen sich nur waehrend tatsaechlich hoerbarer Live-Sprachausgabe. Beim Zuhören und in Sprechpausen bleiben sie ruhig.
- Die Handbewegung basiert auf dem bestehenden Audio-Ausgabe-Signal aus `lip-sync-runtime.js`. Ein kurzer 420-ms-Nachlauf verhindert hektisches Stoppen zwischen Silben.
- Andere Charaktere, Kopfbewegung, Zigarre, Stimme, Mikrofonsteuerung, Weckworte, API und Charakterwechsel bleiben unveraendert.
- Geaenderte Dateien: `style.css`, `lip-sync-runtime.js`, `package.json`, `package-lock.json`.
- Testen: Bronco aufrufen, beim stillen Zuhören Haende pruefen, dann sprechen lassen, wieder schweigen lassen. Jeffrey/Kelly/Krak unveraendert pruefen.
- Hinweis: Der vorhandene Audio-Analyser verarbeitet OpenAI-Live-Sprachausgabe. Fuer andere Sprachausgabewege (z. B. Windows-Kommentare) wird die Animation hier nicht gesondert aktiviert.
