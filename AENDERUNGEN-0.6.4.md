# Änderungen in Jeffrey & Friends 0.6.4

## Behobener Darstellungsfehler

- `lip-sync-runtime.js`: Die künstlich erzeugten dunklen Augenlider wurden vollständig entfernt. Ohne getrennte Augen- und Lid-Assets konnten sie nicht zuverlässig auf den Porträts liegen und erschienen gelegentlich als schwarze Balken.
- `lip-sync.css`: Sämtliche Regeln und Keyframes der synthetischen Blinkebene wurden entfernt.
- `lip-sync.css`: Die Mund- und Kieferdeformation wurde deutlich reduziert. Dadurch bleiben Gesicht und Kopf beim Sprechen ruhiger.
- `tests/stage44.test.cjs`: Regressionstests verhindern, dass die fehlerhafte Augenüberlagerung zurückkehrt oder die Gesichtsdeformation wieder zu stark wird.

Eine echte Augenanimation bleibt aus, bis passende getrennte Augen- oder Lid-Assets verfügbar sind. Die Audioanalyse, Viseme-Zuordnung, Stimmen, Weckwörter und übrigen Funktionen wurden nicht verändert.
