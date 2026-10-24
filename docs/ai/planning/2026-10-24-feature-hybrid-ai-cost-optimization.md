---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Hybrid-KI und API-Kostenoptimierung – Umsetzungsplan

## Milestones

- [x] M1: Ausgangszustand, Worktree, Anforderungen und Architektur abgesichert.
- [x] M2: Provider-, Schlüssel-, Kosten- und Budgetkern testgetrieben implementiert.
- [x] M3: Gemini/Local/OpenAI in Main/IPC integriert.
- [x] M4: Einstellungs- und Kostenoberfläche integriert.
- [x] M5: Regression, Sicherheitsreview und Dokumentation abgeschlossen.

## Erledigte Arbeitspakete

- [x] F1–F4: Branch/Worktree, Baseline, Architektur und Settings-Migration.
- [x] K1–K4: Provider Manager, sichere Schlüssel, Cost Tracker/Budget und lokaler Provider.
- [x] P1–P5: OpenAI-Nutzung, Gemini Live, begrenzte PCM-Brücke sowie Session-Cleanup.
- [x] U1–U4: Vier Modi, Konfiguration, Kostenansicht und deterministische Automatik.
- [x] V1–V5: 136 Tests, Audio-/Figuren-Diff, Sicherheitsreview und Dokumentation.

## Abhängigkeiten und bewusste Grenzen

- Automatisierte Tests verwenden ausschließlich Fake-Fetch/Fake-WebSocket; keine echten oder kostenpflichtigen Cloudtests.
- Preisdefaults tragen einen Stichtag und sind editierbar.
- Das lokale Budget ist eine Client-Schutzfunktion, kein Anbieter-Rechnungslimit.
- AI DevKit erwartet technisch einen Bindestrich-Branch. Der vom Nutzer verlangte Branch feature/hybrid-ai-cost-optimization bleibt maßgeblich; deshalb ist nur dieser eine Feature-Lint-Hinweis offen.

## Risikobehandlung

- Audio: OpenAI-Pfad nicht ersetzt; bestehende Jeffrey-/Bronco-Filterdateien unverändert und per Regressionstest geschützt.
- Secrets: ausschließlich Main/safeStorage; Status als Boolean; Fehlerredaktion und Secret-Scan.
- SSRF: lokale Modelle nur über validierte Loopback-Adressen.
- Kosten: Datenqualität sichtbar, editierbare Preise, getrennte Websuche, Budgetprüfung unmittelbar vor neuen bezahlten Sitzungen.
- Doppelte Aktionen: Provider-Session-Lock und Gemini-Toolaufruf-Deduplizierung.

## Status

Implementierung und lokale Verifikation abgeschlossen. Änderungen verbleiben ungepusht im Entwicklungsbranch. Reale Audio-Smoke-Tests sind optional und benötigen eine separate ausdrückliche Kostenfreigabe.
