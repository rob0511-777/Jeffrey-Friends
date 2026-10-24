---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Hybrid-KI und API-Kostenoptimierung

## Problem Statement

Jeffrey & Friends verwendet für hochwertige Sprachgespräche OpenAI Realtime. Das funktioniert zuverlässig, erzeugt aber laufende Cloud-Kosten. Günstigere oder lokale Alternativen sind bislang nicht als gleichwertig auswählbare, sicher gekapselte Anbieter integriert. Kosten und lokale Budgetgrenzen sind für den Nutzer außerdem nicht transparent.

Betroffen ist der einzelne Windows-Nutzer der Electron-Anwendung. Die vorhandenen Figuren, Stimmen, Animationen, Audiofilter und sicheren Windows-Werkzeuge sind produktiv und dürfen durch die Kostenoptimierung nicht verändert werden.

## Goals & Objectives

### Ziele

- Austauschbare KI-Anbieter unterhalb der bestehenden Charakteroberfläche: OpenAI, Gemini, lokal und automatisch.
- OpenAI bleibt der Standard- und Referenzmodus; seine bestehenden Stimmen und die lokalen Jeffrey-/Bronco-Audiofilter bleiben unverändert.
- Gemini Live wird als optionaler Sparmodus mit eigener sicherer Schlüsselablage angeboten. Abweichende Stimmen werden deutlich gekennzeichnet.
- Lokale OpenAI-kompatible Textserver (Ollama, LM Studio, llama.cpp) werden über Loopback-Adresse und Modellwahl unterstützt. Lokaler Text wird nicht als vollständige Realtime-Sprachlösung dargestellt.
- Kosten werden anhand gemeldeter Nutzung oder gekennzeichneter Schätzungen lokal erfasst und mit konfigurierbaren Preisen bewertet.
- Ein lokales Monatsbudget warnt bei 50 %, 80 % und 100 % und kann neue kostenpflichtige Gespräche blockieren.
- Automatik führt lokale Windows-Aktionen lokal aus und nutzt kostenpflichtige Anbieter niemals ohne vorherige Freigabe.

### Nicht-Ziele

- Keine Änderungen an Optik, Figuren, Animationen, Weckwörtern oder Charakterdesign.
- Keine Mehrsprachigkeitsinitiative und keine James-Korrekturen.
- Kein Austausch der vorhandenen OpenAI-Stimmen oder der lokalen Jeffrey-/Bronco-Effektketten.
- Kein serverseitiges Abrechnungssystem und keine Garantie, dass das lokale Budget das Anbieter-Konto begrenzt.
- Keine echten kostenpflichtigen API-Tests im Entwicklungsprozess.

## User Stories & Use Cases

- Als Nutzer wähle ich im Abschnitt „KI-Anbieter & Kosten“ den gewünschten Anbieter und sehe vor dem Gespräch dessen Modell und Kostenstatus.
- Als OpenAI-Nutzer erhalte ich das bisherige Verhalten einschließlich aller fünf Figuren, Stimmen, Werkzeuge und Audioeffekte.
- Als Gemini-Nutzer speichere ich meinen Schlüssel verschlüsselt im Windows-Benutzerprofil und sehe den Hinweis, dass die Stimmen von den OpenAI-Stimmen abweichen.
- Als Nutzer eines lokalen Servers konfiguriere ich eine Loopback-URL und ein Modell; bei nicht erreichbarem Server erhalte ich eine klare Fehlermeldung ohne stillen kostenpflichtigen Fallback.
- Als kostenbewusster Nutzer sehe ich Sitzungs-, Tages- und Monatsschätzungen sowie Nutzung nach Anbieter und separat die Websuche.
- Als Nutzer kann ich ein Monatsbudget setzen und neue kostenpflichtige Sitzungen bei Erreichen blockieren lassen.
- Als Automatik-Nutzer erlaube ich kostenpflichtige Fallbacks ausdrücklich; ein Anbieterwechsel findet nur zwischen Sitzungen statt.
- Beim Schlafmodus, Verschwinden oder nach 45 Sekunden Inaktivität werden Mikrofon und Cloud-Verbindung zuverlässig geschlossen.

### Relevante Randfälle

- Fehlender, ungültiger oder nicht entschlüsselbarer API-Schlüssel.
- Lokaler Server ist offline, liefert kein Modell oder sendet ungültige Antworten.
- Provider-Fehler während einer Sitzung; die Sitzung wird sauber geschlossen und nicht automatisch kostenpflichtig wiederholt.
- Kostenmetadaten fehlen oder werden verspätet geliefert; die Oberfläche zeigt „geschätzt“ statt Scheingenauigkeit.
- Budgetgrenze wird während einer aktiven Sitzung erreicht; blockiert werden nur neue kostenpflichtige Sitzungen, die laufende Sitzung wird nicht abrupt abgeschnitten.
- Charakterwechsel beendet die aktive Audio-Sitzung, bevor die neue Figur verwendet wird.
- EEA-Nutzung von Gemini: Free-Tier-Verfügbarkeit und zulässige Nutzung dürfen nicht versprochen werden.

## Success Criteria

- Vier auswählbare Modi sind gespeichert, validiert und in der Oberfläche verständlich beschrieben.
- Provider-Manager und Anbieteradapter trennen Providerwahl von Charakterprofilen und Werkzeuglogik.
- OpenAI Realtime funktioniert über den bisherigen WebRTC-Pfad; `characters.cjs`, Bronco-/Jeffrey-Filter und Lip-Sync bleiben verhaltensgleich.
- Gemini-Schlüssel gelangt nie in Renderer-State, Logs oder Git; die Live-Verbindung wird im Hauptprozess aufgebaut.
- Der lokale Provider akzeptiert ausschließlich sichere Loopback-HTTP(S)-Adressen und führt keine Shell-Befehle aus.
- Nutzungseinträge unterscheiden `reported` und `estimated`; offizieller Rechnungssaldo wird ausdrücklich nicht behauptet.
- Budgetwarnungen sind monatlich dedupliziert und die optionale Sperre greift vor neuen kostenpflichtigen Sitzungen und Anfragen.
- Der bestehende 45-Sekunden-Timeout sowie Schlaf-/Ausblend-Cleanup bleiben aktiv.
- Alle bestehenden Tests und neue Tests für Provider, Schlüssel, Kosten, Budget, Cleanup, Automatik und Regression bestehen.
- Kein produktiver API-Aufruf wird durch Tests ausgelöst; externe Provider werden simuliert.

## Constraints & Assumptions

- Electron 45, CommonJS und bestehende IPC-Grenzen bleiben erhalten.
- Geheimnisse werden nur im Hauptprozess mit Electron `safeStorage` abgelegt; ohne verfügbare Verschlüsselung bleiben sie nur im Arbeitsspeicher.
- Die lokale Serveradresse ist in dieser Version auf `localhost`, `127.0.0.1` oder `[::1]` beschränkt, um SSRF und versehentliche externe Kosten zu vermeiden.
- Gemini Live verwendet die zum Implementierungszeitpunkt offizielle Live-WebSocket-API und PCM-Audio. Das Modell und die Preise sind konfigurierbar, weil Anbieter sie ändern können.
- Google weist für unbezahlte Dienste auf Datennutzung zur Produktverbesserung hin. Für EEA-/UK-/Schweiz-API-Clients gelten zusätzliche Paid-Service-Bedingungen; die Anwendung zeigt dies an und verspricht kein Free Tier.
- Gemini-Audio wird im Hauptprozess transportiert; Audioaufnahme/-wiedergabe bleibt im Renderer über enge, validierte IPC-Nachrichten. API-Schlüssel werden nicht an den Renderer gesendet.
- Lokale Sprachein- und -ausgabe bleibt von der lokalen Textinferenz getrennt. Ohne geeignete lokale Audio-Komponenten wird Textmodus angezeigt.
- Preisvoreinstellungen sind mit Datum versehen und bearbeitbar. Sie sind Kalkulationswerte, keine Anbieterrechnung.

## Quellenstand

Stand 24.10.2026, offizielle Dokumentation:

- Google Gemini Live: https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Google Gemini Preise: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms
- OpenAI Realtime Kostenoptimierung: https://developers.openai.com/api/docs/guides/voice-latency-cost
- OpenAI API-Preise: https://developers.openai.com/api/docs/pricing

## Questions & Open Items

Keine offenen Produktentscheidungen für die Implementierung. Die folgenden Einschränkungen werden dokumentiert und nicht stillschweigend aufgelöst:

- Exakte Gemini-Stimmengleichheit ist technisch nicht gegeben.
- Free-Tier-Zugang hängt von Konto, Region, Modell und aktuellen Google-Bedingungen ab.
- Anbieterpreise und Tokenabrechnung können sich ändern; der Nutzer muss Preiswerte prüfen.
- Ein lokales Budget ersetzt keine serverseitige Ausgabengrenze beim Anbieter.
