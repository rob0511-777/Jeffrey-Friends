# Hybrid-KI und Kostenkontrolle einrichten

Die einzige vorhandene Auswahl **KI-Modus** befindet sich direkt unter dem
vollständigen Kasten **DIREKT SPRECHEN**. Optionen und Speicherung bleiben
unverändert. API-Schlüssel, Kostenanzeigen und weitere Einstellungen bleiben
unter **KI-ANBIETER & KOSTEN**. Ein Wechsel stoppt aktive OpenAI-/Gemini-Verbindungen
und separat laufendes Vorlesen; es wird kein zweiter Gesprächsweg gestartet.


Stand der Preisannahmen: 24. Oktober 2026. Die in der App hinterlegten Preise sind editierbare Rechenwerte, keine Live-Preisliste und kein Rechnungssaldo.

## Die vier Modi

### OpenAI – Qualität

Dies ist der Standard- und Referenzmodus. Er verwendet den bestehenden OpenAI-Realtime-Pfad. Die bisherigen Stimmen sowie die lokalen Audioeffekte von Jeffrey und Bronco bleiben unverändert. Den OpenAI-Schlüssel im Einstellungsfenster speichern; der Renderer erhält nur den Status „vorhanden/nicht vorhanden“.

### Gemini – Sparmodus

Dieser Modus verwendet die Gemini Live API für Sprachsitzungen. Seit der Google-Umstellung können neue Authorization Keys mit AQ. beginnen; ältere AIza-Standard-Keys werden ebenfalls akzeptiert. Die Gemini-Stimmen unterscheiden sich hörbar von den OpenAI-Originalstimmen; die App weist darauf hin. Charakterpersönlichkeit und die geprüften Windows-Werkzeuge bleiben verfügbar.

1. In Google AI Studio einen API-Schlüssel erstellen. Neue Authorization Keys können mit AQ. beginnen; Details stehen in der [offiziellen Google-Schlüsseldokumentation](https://ai.google.dev/gemini-api/docs/api-key).
2. In Jeffrey & Friends Gemini auswählen, Schlüssel speichern und ein unterstütztes Live-Modell eintragen.
3. Vor dem Einsatz die aktuellen Limits und Bedingungen prüfen.

Es gibt keine Zusage unbegrenzter Gratisnutzung. Free-Tier-Verfügbarkeit, Regionen, Modelle und Limits können sich ändern. Bei unbezahlten Google-Diensten können Daten gemäß den jeweils geltenden Bedingungen zur Produktverbesserung verwendet werden; keine vertraulichen Inhalte übertragen. Für Nutzer im EWR, der Schweiz und dem Vereinigten Königreich gelten bei kostenpflichtigen Diensten zusätzliche regionale Vertragsanforderungen.

Offizielle Quellen:

- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Gemini API Preise und Free Tier](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API Nutzungsbedingungen](https://ai.google.dev/gemini-api/terms)

### Lokal – Offline

Der lokale Modus spricht eine OpenAI-kompatible Loopback-Schnittstelle an. Er akzeptiert ausschließlich localhost, 127.0.0.1 oder ::1 und sendet keine Anfrage an einen Cloud-Fallback.

Typische Adressen:

- Ollama: http://127.0.0.1:11434/v1
- LM Studio: http://127.0.0.1:1234/v1
- llama.cpp server: http://127.0.0.1:8080/v1

Den lokalen Server zuerst starten, dann „Modelle laden“ wählen und ein Modell auswählen. Dieser Modus stellt Textinferenz bereit. Ein lokales Textmodell ist keine vollständige Realtime-Sprachlösung; Mikrofoneingabe und natürliche Charakterstimmen werden nicht vorgetäuscht. Vorhandene lokale Sprachausgabe kann Text separat vorlesen, erreicht aber nicht die OpenAI-Stimmenqualität.

### Automatisch – Kosten optimieren

Einfache Textaufgaben gehen bevorzugt an das lokale Modell. Lokale Windows-Funktionen bleiben lokal. Der Provider wird während einer laufenden Sprachsitzung nicht gewechselt. Kostenpflichtige OpenAI- oder Gemini-Audiositzungen sind im Automatikmodus erst erlaubt, wenn „kostenpflichtigen Audio-Fallback erlauben“ ausdrücklich aktiviert wurde. Es gibt keinen parallelen Mehrfachaufruf zur Qualitätsauswahl.

## Kosten und Budget

Die Anzeige unterscheidet gemeldete und geschätzte Nutzung. Sie zeigt Sitzung, Tag, Monat, Anbieter und gesondert erfassbare Websuche. Preise können in den Einstellungen geändert werden. Für nicht gemeldete Nutzung verwendet die App nachvollziehbare Schätzungen und zeigt keine Scheinpräzision als Anbieterrechnung an.

Ein Monatsbudget kann Warnungen bei 50, 80 und 100 Prozent auslösen. Optional werden neue kostenpflichtige Sitzungen ab 100 Prozent blockiert. Bereits laufende Sitzungen werden nicht mitten im Gespräch getrennt. Das lokale Budget ist keine serverseitige Ausgabensperre: verzögerte oder unvollständige Nutzungsdaten können zu Abweichungen führen. Zusätzlich sollten beim Anbieter eigene Limits gesetzt werden.

OpenAI-Quellen:

- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [OpenAI Realtime Guide](https://platform.openai.com/docs/guides/realtime)

## Datenschutz und Schlüssel

- Schlüssel werden im Electron-Hauptprozess mit safeStorage verschlüsselt abgelegt.
- Wenn Betriebssystemverschlüsselung nicht verfügbar ist, bleiben neue Schlüssel nur im Arbeitsspeicher.
- Schlüssel werden nicht an den Renderer zurückgegeben, nicht protokolliert und nicht im Kostenjournal gespeichert.
- Das Kostenjournal enthält nur technische Nutzungszähler, Anbieter, Modell, Zeit und Kostenschätzung; keine Prompts oder Transkripte.
- Schlafmodus, Ausblenden, Charakterwechsel und Beenden schließen aktive Cloud-Mikrofonverbindungen.

## Validierungsstand

Alle automatischen Provider-Tests arbeiten mit simulierten Antworten. Es wurden keine echten oder kostenpflichtigen OpenAI-/Gemini-Tests ausgeführt. Vor einer Veröffentlichung sind freiwillige manuelle Audio-Smoke-Tests mit eigenen Schlüsseln empfehlenswert.

## Koordinatenmodus und Datenschutzfreigaben

Der neue Windows-Koordinatenmodus pausiert Live und dessen Codewort-Start, während
ein deutscher System.Speech-Erkenner lokal feste Rasterbefehle verarbeitet.
Keine KI-Mauswerkzeuge, zusätzlichen Sprachdienste oder API-Kosten für diese
Rasterbefehle. Beim Beenden kehrt die bisherige Wakeword-Erkennung zurück;
normale Live-Sitzungen behalten ihre 45-Sekunden-Kostenbegrenzung.
Gemini hat im bestehenden Kompatibilitätsmodus keine Nutzertranskripte; zum
Rasterstart Oberfläche, Textfeld oder einmaliges Windows-Zuhören verwenden.

Bildschirm- und Textfreigabe können nun getrennt für OpenAI dauerhaft im lokalen
App-Profil gespeichert und im Datenschutzbereich widerrufen werden. „Einmal“ gilt
für genau eine Anfrage. Ein anderer Empfänger erbt diese Freigaben nicht.
[Bedienung und Windows-Prüfliste](MAUSSTEUERUNG.md).
