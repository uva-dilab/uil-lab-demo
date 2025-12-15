import threading
from server.hue import HueController
from server.audio import AudioController


class LightSoundExperience:
    """
    Single shared channel: any start call stops prior audio,
    sets lights, then plays corresponding sound.
    """
    def __init__(self, hue: HueController, audio: AudioController):
        self.hue = hue
        self.audio = audio
        self._lock = threading.Lock()

    def status(self) -> dict:
        return self.audio.status()

    def start_stress(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.hue.set_stress()
            self.audio.start("stress")
            return self.status()

    def start_calm(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.hue.set_calm()
            self.audio.start("calm")
            return self.status()

    def stop(self) -> dict:
        with self._lock:
            self.audio.stop()
            self.hue.turn_off()
            return self.status()

