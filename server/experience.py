import threading
import time
from server.hue import HueController
from server.audio import AudioController


class LightSoundExperience:
    """
    Single shared channel with timed playback.

    Intended states:
      - Neutral (baseline / idle)
      - Stress (during stress sound)
      - Calm (during calm sound)
      - Auto-stop after DURATION_SEC -> Neutral
    """

    DURATION_SEC = 60

    def __init__(self, hue: HueController, audio: AudioController):
        self.hue = hue
        self.audio = audio
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None
        self._ends_at_epoch: float | None = None  # epoch seconds

    def _cancel_timer_locked(self) -> None:
        if self._timer is not None:
            try:
                self._timer.cancel()
            except Exception:
                pass
            self._timer = None
        self._ends_at_epoch = None

    def status(self) -> dict:
        """
        Returns a status object that the UI can use for countdown:
          {
            "is_playing": bool,
            "mode": "stress"|"calm"|None,
            "ends_at": <epoch_seconds>|None,
            "remaining_sec": int|0
          }
        """
        base = self.audio.status()  # expects {"is_playing": bool, "mode": str|None}
        ends_at = self._ends_at_epoch

        remaining = 0
        if ends_at and base.get("is_playing"):
            remaining = max(0, int(round(ends_at - time.time())))

        return {
            **base,
            "ends_at": ends_at,
            "remaining_sec": remaining,
        }

    def begin_baseline(self) -> dict:
        """Force baseline lighting (neutral) and ensure no audio is playing."""
        with self._lock:
            self._cancel_timer_locked()
            self.audio.stop()
            self.hue.set_neutral()
            return self.status()

    def _schedule_autostop_locked(self) -> None:
        self._cancel_timer_locked()
        self._ends_at_epoch = time.time() + self.DURATION_SEC

        # Timer thread will call stop(); stop() will cancel timer safely.
        self._timer = threading.Timer(self.DURATION_SEC, self.stop)
        self._timer.daemon = True
        self._timer.start()

    def start_stress(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.audio.start("stress")
            self.hue.set_stress()
            self._schedule_autostop_locked()
            return self.status()

    def start_calm(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.audio.start("calm")
            self.hue.set_calm()
            self._schedule_autostop_locked()
            return self.status()

    def stop(self) -> dict:
        with self._lock:
            self._cancel_timer_locked()
            self.audio.stop()
            self.hue.set_neutral()
            return self.status()

