---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Hybrid-KI – Implementierungsnachweis

## Struktur

- provider-manager.cjs: deterministische Auswahl und Provider-Lock je Sitzung.
- providers/gemini-live-provider.cjs: Gemini-Live-WebSocket, begrenztes PCM, Tool Calls, Usage und Deduplizierung.
- providers/local-provider.cjs: OpenAI-kompatibler lokaler Textprovider mit Loopback-Schutz.
- secure-keys.cjs: getrennte OpenAI-/Gemini-Schlüssel über Electron safeStorage.
- cost-tracker.cjs: reported/estimated Nutzung, Aggregation, Preise, Warnungen und Budgetblock.
- main.cjs/preload.cjs: schmale, sendergeprüfte IPC-Grenze; Schlüssel bleiben im Main-Prozess.
- realtime.js/renderer.js/index.html: Gemini-Audio, Kostenstatus und Einstellungen unterhalb der bestehenden Charakteroberfläche.

## Integrationsmuster

OpenAI bleibt der Qualitätsstandard und behält seinen WebRTC-Audiopfad. Gemini wird als unabhängiger Main-Prozess-Provider betrieben. Lokale Textinferenz erhält keinen Cloudfallback. Charakterprofile liefern Persönlichkeit, Stimme und lokale Filter, kennen aber keinen Provider. Der Automatikmodus entscheidet vor einer Sitzung und wechselt nicht während eines Gesprächs.

Die vorhandenen sicheren Werkzeuge für Websuche, Idealo, PC-Status, Webseiten und Windows-Programme werden wiederverwendet. Werkzeugnamen und Argumente sind begrenzt; Programmstarts benötigen weiterhin eine erkennbare direkte Nutzeranweisung.

## Fehler- und Ressourcenbehandlung

- Keine stillen Cross-Provider-Retries und keine parallelen Qualitätsanfragen.
- 45-Sekunden-Inaktivität und 15-Minuten-Maximum bleiben erhalten.
- Schlafen, Ausblenden, Charakter-/Providerwechsel und App-Ende schließen Audio/WebSocket.
- PCM, Texte, Werkzeugantworten, IDs und Kostenjournal sind größenbegrenzt.
- Doppelte Gemini-Tool-IDs werden nur einmal verarbeitet.
- Beschädigte oder manipulierte Kostenjournale werden beim Laden gefiltert.

## Sicherheit

Renderer kann Schlüssel setzen/löschen, aber niemals lesen. Gemini-Schlüssel steht nur in der Main-Prozess-WebSocket-URL und wird aus Fehlermeldungen entfernt. Lokale URLs dürfen keine Credentials, Query oder Fragmente enthalten. Das Kostenjournal speichert keine Prompts, Transkripte oder Secrets.

## Unveränderte Bestandteile

characters.cjs, bronco-voice.js, jeffrey-voice.js, Charakterassets und Animationsmodule wurden nicht geändert. Der Gemini-Ausgabestream wird durch dieselben vorhandenen lokalen Jeffrey-/Bronco-Effektfunktionen geführt; der OpenAI-Pfad blieb bestehen.
