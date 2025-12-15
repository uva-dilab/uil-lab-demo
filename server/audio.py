# server/audio.py
from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Optional
import simpleaudio as sa


@dataclass(frozen=True)
class AudioConfig:
    stress_wav_path: str
    calm_wav_path: str

class AudioController:
    """
    Robust, single-channel audio controller:
    - only one sound at a time
    - start() stops any current playback
    - stop() is safe to call repeatedly
    """

    def __init__(self, cfg: AudioConfig):
        self.cfg = cfg
        self._lock = threading.Lock()
        self._play_obj: Optional[sa.PlayObject] = None
        self._current_mode: Optional[str] = None  # "stress" | "calm" | None

        # Preload WAVs (fast start, fewer runtime surprises)
        self._wave_stress = sa.WaveObject.from_wave_file(self.cfg.stress_wav_path)
        self._wave_calm = sa.WaveObject.from_wave_file(self.cfg.calm_wav_path)

    def status(self) -> dict:
        with self._lock:
            is_playing = bool(self._play_obj and self._play_obj.is_playing())
            return {"mode": self._current_mode, "is_playing": is_playing}

    def stop(self) -> None:
        with self._lock:
            if self._play_obj is not None:
                try:
                    self._play_obj.stop()
                except Exception:
                    pass
            self._play_obj = None
            self._current_mode = None

    def start(self, mode: str) -> None:
        if mode not in ("stress", "calm"):
            raise ValueError("mode must be 'stress' or 'calm'")

        with self._lock:
            # always stop any existing playback first
            if self._play_obj is not None:
                try:
                    self._play_obj.stop()
                except Exception:
                    pass

            wave = self._wave_stress if mode == "stress" else self._wave_calm
            self._play_obj = wave.play()
            self._current_mode = mode
