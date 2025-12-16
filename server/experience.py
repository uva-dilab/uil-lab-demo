import threading
from server.hue import HueController
from server.audio import AudioController


class LightSoundExperience:
    """
    Single shared channel: any start call stops prior audio.
    Intended states:
      - Neutral (baseline / idle)
      - Stress (during stress sound)
      - Calm (during calm sound)
      - End returns to Neutral
    """

    def __init__(self, hue: HueController, audio: AudioController):
        self.hue = hue
        self.audio = audio
        self._lock = threading.Lock()

    def status(self) -> dict:
        return self.audio.status()

    def begin_baseline(self) -> dict:
        """Force baseline lighting (neutral) and ensure no audio is playing."""
        with self._lock:
            self.audio.stop()
            self.hue.set_neutral()
            return self.status()

    def start_stress(self) -> dict:
        with self._lock:
            self.audio.stop()
            # Start audio then flip lights immediately after (better perceived sync)
            self.audio.start("stress")
            self.hue.set_stress()
            return self.status()

    def start_calm(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.audio.start("calm")
            self.hue.set_calm()
            return self.status()

    def stop(self) -> dict:
        with self._lock:
            # Return to neutral at the end
            self.audio.stop()
            self.hue.set_neutral()
            return self.status()

