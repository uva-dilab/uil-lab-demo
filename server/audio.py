import threading
import simpleaudio as sa


class AudioController:
    def __init__(self, stress_wav_path: str, calm_wav_path: str):
        self._lock = threading.Lock()
        self._play_obj = None
        self._mode = None

        # Preload WAVs for reliability and fast start
        self._wave_stress = sa.WaveObject.from_wave_file(stress_wav_path)
        self._wave_calm = sa.WaveObject.from_wave_file(calm_wav_path)

    def status(self) -> dict:
        with self._lock:
            is_playing = bool(self._play_obj and self._play_obj.is_playing())
            return {"mode": self._mode, "is_playing": is_playing}

    def stop(self):
        with self._lock:
            if self._play_obj:
                try:
                    self._play_obj.stop()
                except Exception:
                    pass
            self._play_obj = None
            self._mode = None

    def start(self, mode: str):
        if mode not in ("stress", "calm"):
            raise ValueError("mode must be 'stress' or 'calm'")

        with self._lock:
            # Always stop current playback to prevent overlaps
            if self._play_obj:
                try:
                    self._play_obj.stop()
                except Exception:
                    pass

            wave = self._wave_stress if mode == "stress" else self._wave_calm
            self._play_obj = wave.play()
            self._mode = mode

