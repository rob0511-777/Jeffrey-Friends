---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Hybrid-KI – Testergebnis

## Automatisierte Tests

- [x] Vier Modi, Settings-Migration und begrenzte Preise.
- [x] Providerwahl, Session-Lock, Auto-Freigabe und kein stiller Retry.
- [x] Verschlüsselte Schlüsselablage, Memory-Fallback und kein Renderer-Lesezugriff.
- [x] Lokale Loopback-URL, Modellliste, Chat, Fehler und kein Cloudfallback.
- [x] Gemini-Setup, PCM, Usage, Tool Calls, Deduplizierung, Fehler und Stop.
- [x] Kostenaggregation, Datenqualität, Websuche, Preisupdate, 50/80/100-Warnungen und Budgetblock.
- [x] Manipuliertes Kostenjournal wird ohne Absturz gefiltert.
- [x] OpenAI-/Gemini-Nutzung und 45-Sekunden-Cleanup.
- [x] Fünf Charaktere, Auswahl, Weck-/Verschwinden-Befehle und sichere Windows-Werkzeuge.
- [x] Jeffrey-/Bronco-Audioverarbeitung und übrige Audio-/Animationsregressionen.

Frischer Gesamtlauf am 24. Oktober 2026: npm test – 139/139 bestanden, 0 fehlgeschlagen.

Zusätzliche Prüfschritte:

- node --check für Main, Renderer, Realtime und neue Module.
- git diff --check.
- Secret-Suche nach typischen OpenAI-/Google-Schlüsseln.
- npm audit mit Schwelle critical.
- Electron-Startsmoke ohne API-Verbindung.

## Testdaten und Gebühren

Alle neuen Provider-Tests verwenden Fake-Fetch, Fake-WebSocket, eine deterministische Uhr und temporäre Journale. Es wurden keine echten API-Schlüssel und keine kostenpflichtigen API-Aufrufe verwendet.

## Manuell verbleibend

- OpenAI-Stimmen und Gemini-Live-Audio können auf dem Ziel-PC freiwillig mit eigenen Schlüsseln abgehört werden.
- Ein echter Ollama-/LM-Studio-/llama.cpp-Server kann gegen die dokumentierten Loopback-Adressen geprüft werden.
- Diese Prüfungen sind nicht automatisiert, weil Cloud-Audio Kosten verursachen kann und lokale Modelle nicht garantiert installiert sind.
