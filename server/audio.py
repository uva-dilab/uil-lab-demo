# server/audio.py
import subprocess
import threading
from typing import Optional


class AudioController:
    """
    macOS-stable audio playback using built-in `afplay`.

    Backwards-compatible with earlier interface expectations:
      - start("calm"|"stress")
      - stop()
      - status()
    """

    def __init__(self, stress_wav_path: str, calm_wav_path: str):
        self.stress_wav_path = stress_wav_path
        self.calm_wav_path = calm_wav_path

        self._lock = threading.Lock()
        self._proc: Optional[subprocess.Popen] = None
        self._mode: Optional[str] = None  # "stress" | "calm" | None

    def _start_proc(self, wav_path: str, mode: str) -> None:
        # Ensure only one sound plays at a time
        self._stop_locked()

        self._proc = subprocess.Popen(
            ["afplay", wav_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._mode = mode

    def _stop_locked(self) -> None:
        if self._proc is not None:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=1.0)
            except Exception:
                try:
                    self._proc.kill()
                except Exception:
                    pass
            self._proc = None
        self._mode = None

    # ---- Preferred explicit API ----
    def play_stress(self) -> None:
        with self._lock:
            self._start_proc(self.stress_wav_path, "stress")

    def play_calm(self) -> None:
        with self._lock:
            self._start_proc(self.calm_wav_path, "calm")

    # ---- Backwards-compatible API ----
    def start(self, mode: str) -> None:
        """
        Start playback for the given mode. Expected values: "stress" or "calm".
        """
        mode = (mode or "").strip().lower()
        if mode == "stress":
            self.play_stress()
        elif mode == "calm":
            self.play_calm()
        else:
            raise ValueError(f"Unknown audio mode: {mode}")

    def stop(self) -> None:
        with self._lock:
            self._stop_locked()

    def is_playing(self) -> bool:
        with self._lock:
            return self._proc is not None and (self._proc.poll() is None)

    def current_mode(self) -> Optional[str]:
        with self._lock:
            return self._mode

    def status(self) -> dict:
        return {
            "is_playing": self.is_playing(),
            "mode": self.current_mode(),
        }

