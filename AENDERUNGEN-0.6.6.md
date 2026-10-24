# Jeffrey & Friends – Version 0.6.6 / Bronco Feinschliff

- `characters.cjs`: Bronco reagiert bewusst grantiger beim Ruf und bei Arbeitsaufträgen. Anweisungen bleiben sicher: erst handeln, dann kurz meckern; keine unwahren Erfolgsmeldungen.
- `realtime-service.cjs`: Bronco bekommt separate, deutlich rauere Stimm-Anweisungen statt der sonst eher freundlichen Standard-Stile. Realtime-Sprechtempo für Bronco 0,96.
- `bronco-voice.js`: optionaler, leichter lokaler Web-Audio-Effekt mit sanfter Sättigung für eine etwas rauere und blechernere Stimme. Wenn AudioContext nicht bereit ist, bleibt die Originalstimme aktiv.
- `realtime.js` / `main.cjs`: Auf den reinen lokalen Weckruf „Bronco“ reagiert Bronco nach erfolgter Verbindung mit einem kurzen genervten *gesprochenen* Gruß. Das benötigt eine sehr kurze normale Realtime-Antwort; Weckwort-Erkennung selbst bleibt kostenlos.
- `comment-speech.cjs`: bezahlte optionale spontane Kommentare bekommen ebenfalls Broncos passende raue Sprechanweisung.
- Jeffrey, Kelly und Krak sowie das bisherige Bronco-Bild inklusive Kieferanimation werden unverändert übernommen.
- Keine API-Schlüssel im Paket. `START-Windows.cmd` wie bisher.

**Hinweis:** Browser-Tests sind kein Ersatz für den Klangtest unter Windows. Lautstärke des neuen Audioeffekts bitte auf dem Zielrechner prüfen. Falls die Audioeffekt-Unterstützung fehlt, weicht die App auf den unveränderten Ton aus.
