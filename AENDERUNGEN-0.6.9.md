# Jeffrey v0.6.9 – Bronco-Audioausgabe

Problem: `Audiowiedergabe blockiert` und Stille nach Aufwecken oder Charakterwechsel.

Ursache: Die App startete die Wiedergabe der WebRTC-Tonspur und wechselte kurz danach `audio.srcObject` auf die gefilterte Tonspur. Dadurch konnte die noch laufende `play()`-Operation mit `AbortError` fehlschlagen. Die allgemeine Fehlermeldung verwies irrtümlich auf Windows.

Lösung:
- `realtime.js`: WebRTC-Tonspur für die gesamte Sitzung stabil binden, HTML-Audio bei Bronco stummschalten, aber nicht austauschen. Unterscheiden zwischen abgebrochenem Abspielversuch und tatsächlichem Ausgabeproblem. Bei Effektausfall wird das HTML-Audio entstummt.
- `bronco-voice.js`: Der WebAudio-Filter speist den AudioContext.destination direkt, unabhängig vom erneuten Aufruf von HTMLMediaElement.play().
- `tests/stage48.test.cjs`: Lautsprecherroute, Context-Reuse, keine nachträgliche Tonspur-Umleitung getestet.

Das ist keine Live-Audio-Abnahme: Der erste Test auf Windows besteht aus mehrmaligem Weckruf, Schlafen und Charakterwechsel.
