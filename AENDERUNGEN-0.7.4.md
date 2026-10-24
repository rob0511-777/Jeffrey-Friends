# Jeffrey & Friends 0.7.4 – Hybrid-KI und Kostenkontrolle

## Neu

- OpenAI bleibt der Qualitäts- und Referenzmodus mit den bestehenden Stimmen und lokalen Audiofiltern.
- Gemini Live steht als zusätzlicher Sparmodus mit eigener sicherer API-Schlüsselablage bereit.
- Lokale OpenAI-kompatible Textserver wie Ollama, LM Studio und llama.cpp können ohne Cloud-Textinferenz genutzt werden.
- Der Automatikmodus wählt einen freigegebenen Anbieter zwischen Sitzungen kostenbewusst aus und wechselt nicht mitten im Gespräch.
- Die Einstellungen zeigen Anbieter, Modell, Nutzung, Kostenschätzungen und getrennte Websuchkosten.
- Monatliches Software-Budget mit Warnungen bei 50, 80 und 100 Prozent sowie optionalem Stopp neuer kostenpflichtiger Gespräche.

## Stabilität und Sicherheit

- API-Schlüssel werden über Electrons geschützte Hauptprozess-Ablage gespeichert und nicht an den Renderer zurückgegeben.
- Die 45-Sekunden-Beendigung und das Schließen der Mikrofonverbindung beim Schlafen oder Verschwinden bleiben aktiv.
- Gemini-Live-Nachrichten akzeptieren die tatsächlich gelieferten Binärformate; Verbindungs- und Nutzungsfehler werden verständlich gemeldet.
- Wiederholte Anbieterbeschreibung nach jeder Bot-Antwort wurde behoben.
- Bronco behält seine raue Schrottplatz-Stimme und Jeffrey seine Computerstimme einschließlich der vorhandenen lokalen Audioeffekte.
- Kelly, Krak und James sowie Charakterauswahl, Weckwörter, Verschwinden-Befehle, Animationen und Windows-Werkzeuge bleiben erhalten.

## Wichtige Hinweise

- Angezeigte Kosten sind lokale Schätzungen auf Basis konfigurierbarer Preise und kein offizieller Rechnungssaldo des Anbieters.
- Ein lokales Software-Budget ist keine garantierte serverseitige Ausgabensperre; Nutzungsdaten können verzögert oder unvollständig eintreffen.
- Gemini-Free-Tier-Nutzung hängt von Googles jeweils aktuellen Limits und Kontoeinstellungen ab. Ohne eingerichtete Abrechnung kann keine Abbuchung erfolgen, Limits oder Dienstverfügbarkeit können sich dennoch ändern.
- Der Gemini-Live-Kompatibilitätsmodus verwendet bewusst ein minimales Sitzungs-Setup. Optionale Gemini-Tooldeklarationen und Transkriptionen sind dort derzeit nicht aktiviert; lokale Windows-Funktionen bleiben über die bestehende Anwendung verfügbar, soweit sie ohne diese Deklarationen ausgelöst werden.
- Ein lokales Textmodell ist keine vollständige Realtime-Sprachlösung. Fehlende Audiofunktionen werden in der Oberfläche ausgewiesen.

## Prüfung

- 139 automatisierte Tests für Providerwahl, sichere Schlüssel, Kosten und Budgets, Sitzungsende, Fehlerbehandlung, Automatikmodus, Charaktere und Audioregressionen.
- Syntaxprüfung der geänderten JavaScript- und CommonJS-Dateien.
- Secret-Suche und Git-Diff-Prüfung vor dem Release.
- Gemini Live wurde auf dem Ziel-Windows-PC mit einem eigenen Schlüssel erfolgreich manuell getestet.

## Einrichtung

Siehe [docs/HYBRID-AI-SETUP.md](docs/HYBRID-AI-SETUP.md).
