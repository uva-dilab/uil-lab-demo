# server/experience.py
from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Optional

from .hue import HueController
from .audio import AudioController


@dataclass
class ExperienceStatus:
    mode: Optional[str] = None
    is_playing: bool = False


class ExperienceController:
    """
    Single shared experience channel: lights + sound are always aligned.
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

