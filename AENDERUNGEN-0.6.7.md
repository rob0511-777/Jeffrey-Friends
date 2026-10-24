# Jeffrey & Friends v0.6.7 – Bronco bekommt eine wirklich tiefere Stimme

## Warum die bisherige Stimme zu weich klang

`bronco-voice.js` hat in Version 0.6.6 noch 76 % der originalen weichen Stimme direkt zur Ausgabe gemischt. Außerdem gab es lediglich etwas EQ und Verzerrung, **keine echte Tonhöhenänderung**.

## Änderungen

- `bronco-voice.js`: kräftiger, regelbarer lokaler Audio-Effekt. Tiefenanhebung, Präsenz, Sättigung, Dynamikbegrenzung. Nur für Bronco und nur für die Wiedergabe des Realtime-Audiostreams.
- `bronco-pitch-worklet.js`: neuer Echtzeit-Tonhöhenverschieber. Er verwendet zwei überblendete Leseköpfe im Audiopuffer, um die Tonhöhe ohne Änderung des Gesprächstempos zu senken. Chromium-Fallback über ScriptProcessor; wenn beides nicht funktioniert, greift zumindest ein kräftiger rauer Filter. Die Filter-Sprache kann bei extremen Einstellungen bewusst robotisch/rau klingen.
- `settings.cjs`, `preload.cjs`, `main.cjs`, `renderer.js`, `index.html`, `realtime.js`: Einstellbarer Bronco-Effekt: Original, Rau, Hart (Standard), Extrem. Auswahl bleibt gespeichert und gilt ab dem nächsten Live-Gespräch; nur für Bronco sichtbar. Eine neue Stimme (`ash`) lässt sich außerdem alternativ ausprobieren.
- `realtime-service.cjs`/`comment-speech.cjs`: präzisere kratzige, tiefe Stimmregeln; spontane TTS-Kommentare verwenden weiter ihre TTS-Ausgabe (ohne den neuen Live-Pitch-Filter).
- Jeffrey, Kelly, Krak, Grafik, Weckwort, Sicherheit, Browsersteuerung, Kostenlimit und Animation unverändert.

## Einrichten

1. Bisherige Version **vollständig beenden**. ZIP in **neuen** Ordner `D:\Jeffrey-v067` entpacken, nicht den alten Projektordner überschreiben.
2. `START-Windows.cmd` starten, oben Bronco auswählen.
3. Unten bei den Live-Stimmen ist nun „**Broncos Schrottplatz-Stimme**“ sichtbar. Beginne mit **Hart**. Falls nicht hart genug: **Extrem**. Falls zu stark: **Rau**.
4. Ein neues Live-Gespräch starten. Die Verarbeitung wirkt nur auf **Broncos eigene Sprachausgabe**, **nicht auf dein Mikrofon** und **nicht auf andere Figuren**.
5. Browser-App kann kurz melden, ob die tiefere Tonhöhe aktiviert wurde oder nur der Rauheitsfilter.

## Tests & Grenzen

`node --test tests/*.test.cjs`: 97 automatische Tests bestanden. Ein künstlicher 440-Hz-Sinus wird beim Worklet-Test messbar nach unten verschoben. **Der tatsächliche Klang unter Windows wurde nicht akustisch getestet**, und wie „hart“ die Stimme wirkt, ist subjektiv. AudioWorklet und ScriptProcessor sind lokale Browsertechnik; zusätzliche API-Anfragen werden durch den Filter nicht verursacht.

**Sicherheit:** Keine automatischen API-Tests; Zugangsdaten werden weder gelesen noch mitgeliefert.
