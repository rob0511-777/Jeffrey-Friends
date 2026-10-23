# Jeffrey & Friends

Jeffrey & Friends ist ein sprachgesteuerter Windows-11-Desktop-Assistent auf Basis von Electron, HTML, CSS und JavaScript.

Die Anwendung verbindet OpenAI Realtime über WebRTC mit drei unterschiedlichen Desktop-Charakteren:

- **Jeffrey** – freundlicher futuristischer Roboter
- **Kelly** – charmante, kompetente virtuelle Assistentin
- **Krak** – schelmischer grüner Fantasy-Kobold

Kelly und Krak besitzen ein lokales, audio-synchronisiertes 2D-Viseme-Rig. Die Mundbewegung wird am tatsächlich abgespielten WebRTC-Audio analysiert und mit deutschen Transkript-Visemen kombiniert. Die bisherige feste Mundbildfolge wurde entfernt. In Version 0.6.4 wurden zusätzlich künstliche Augen-Overlays entfernt, die gelegentlich als schwarze Balken sichtbar wurden.

## Funktionen

- OpenAI-Realtime-Sprachgespräche über WebRTC
- eigene Stimme und Persönlichkeit pro Charakter
- lokale Weckwörter und Sprachbefehle
- Aktiv-, Ruhe- und Schlafmodus
- transparente Desktop-Darstellung mit Hologramm-Effekten
- frei verschiebbare Position und einstellbare Größe
- Websuche, Chrome-/Idealo-Suche und geprüfte Windows-Aktionen
- PC-Status, optionale spontane Kommentare und lokales Gedächtnis
- geschützte API-Schlüsselablage mit Electron `safeStorage`

## Start unter Windows 11

1. Repository klonen oder als ZIP herunterladen.
2. Node.js LTS installieren.
3. `START-Windows.cmd` starten.
4. Im Steuerfenster den Charakter auswählen und **Live sprechen** anklicken.

Beim ersten Start installiert das Skript Electron automatisch über `npm install`.

Für die kostenfreie visuelle Simulation kann `VORSCHAU.html` geöffnet werden. Sie ist ausdrücklich als Simulation ohne echtes Audio gekennzeichnet.

## Entwicklung und Tests

```powershell
npm test
```

Der aktuelle Stand v0.6.4 besteht aus 86 automatischen Tests. Eine echte Realtime-Sprachprüfung muss zusätzlich manuell auf dem Ziel-PC erfolgen und kann API-Kosten verursachen.

## Technische Hinweise

Die aktuelle Lippen-Synchronisation ist eine audio-synchronisierte, transkriptgestützte Viseme-Schätzung und kein Studio-Forced-Alignment. Echte Augenanimation ist deaktiviert, bis getrennte Augen- und Lid-Assets verfügbar sind. Weitere Details stehen in [LIESMICH.md](LIESMICH.md) und [ANIMATION-ARCHITEKTUR.md](ANIMATION-ARCHITEKTUR.md).

API-Schlüssel, Benutzerprofile und lokale Gedächtnisdaten werden nicht im Repository gespeichert.
