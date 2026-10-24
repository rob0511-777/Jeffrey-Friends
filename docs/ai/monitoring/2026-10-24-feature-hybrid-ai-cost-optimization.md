---
phase: monitoring
title: Monitoring & Observability
description: Define monitoring strategy, metrics, alerts, and incident response
---

# Hybrid-KI – lokale Beobachtbarkeit

## Angezeigte Kennzahlen

- aktiver Provider und Modell,
- geschätzte Kosten der Sitzung, des Tages und Monats,
- Monatsnutzung je Provider,
- getrennte, soweit bestimmbare Websuchkosten,
- Qualitätskennzeichen reported, estimated, mixed oder none,
- Budgetanteil und Schwellenwarnungen bei 50, 80 und 100 Prozent.

## Datenhaltung

Das lokale JSON-Journal speichert maximal 2000 normalisierte Nutzungsereignisse. Es enthält Zeit, Sitzung, Provider, Modell, Kategorie, Token-/Request-Zähler, Kostenschätzung und Preisversion. Prompts, Transkripte, Audio und Schlüssel werden nicht gespeichert. Strukturwidrige Datensätze werden verworfen.

## Fehlerbehandlung

Providerfehler werden der Oberfläche in begrenzter, schlüsselbereinigter Form gemeldet. Ein Fehler startet keinen anderen kostenpflichtigen Provider. Schlafen/Ausblenden beendet offene Cloudverbindungen. Wiederholte identische Gemini-Toolaufrufe werden dedupliziert.

## Reaktion

- Kostenabweichung: Preisstichtag prüfen, editierbare Preise aktualisieren und Anbieterrechnung separat vergleichen.
- Budgetüberschreitung: neue bezahlte Sitzungen lokal blockieren und zusätzlich serverseitige Anbieterlimits prüfen.
- Mikrofon bleibt aktiv: Sitzung stoppen/App beenden und Cleanup-Regressionssuite ausführen.
- Providerprotokoll ändert sich: Mock-Fixture aktualisieren, niemals still auf einen kostenpflichtigen Provider ausweichen.
