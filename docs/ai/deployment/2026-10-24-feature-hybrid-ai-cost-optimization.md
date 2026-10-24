---
phase: deployment
title: Deployment Strategy
description: Define deployment process, infrastructure, and release procedures
---

# Hybrid-KI – Auslieferung

Jeffrey & Friends bleibt eine lokale Electron-Windows-Anwendung. Es gibt keine Servermigration. Einstellungen, verschlüsselte Schlüssel und das Kostenjournal liegen im Electron-Benutzerprofil und werden nicht mit dem Repository ausgeliefert.

## Release-Gates

1. npm ci und npm test müssen grün sein.
2. Syntax-, Diff-, Secret- und Dependency-Audit müssen grün sein.
3. Charakter-/Audio-Dateien dürfen keinen Diff enthalten.
4. Optionaler manueller Audio-Smoke-Test nur mit ausdrücklicher Kostenfreigabe.
5. Erst nach Nutzerfreigabe committen, pushen und veröffentlichen.

## Konfiguration

OpenAI ist Standard. Gemini, Local und Auto sind Opt-in. Preise und lokales Monatsbudget werden im Einstellungsdialog gesetzt. API-Schlüssel werden ausschließlich über die App in safeStorage geschrieben; keine .env-Datei oder fest codierten Schlüssel ausliefern.

## Rollback

Der gesamte Stand bleibt isoliert auf feature/hybrid-ai-cost-optimization. Bis zur Freigabe ist main unverändert. Ein Rollback besteht darin, die Feature-Arbeit nicht zu mergen; Benutzerdaten oder andere Repositories werden dadurch nicht verändert.

## Veröffentlichungsstatus

Kein Commit, kein Push, kein Merge und kein Release wurden durch diesen Auftrag ausgelöst. Der Branch ist lokal für Review und freiwillige Ziel-PC-Smoke-Tests vorbereitet.
