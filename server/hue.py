# server/hue.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
from phue import Bridge


@dataclass(frozen=True)
class HueConfig:
    bridge_ip: str
    lights: List[int]  # bulb IDs
    calm: Dict[str, int]
    stress: Dict[str, int]
    off_bri: int = 1  # dim fallback if you don't want full off
    dry_run: bool = False  # dry run


class HueController:
    def __init__(self, cfg: HueConfig):
        self.cfg = cfg
        self._bridge: Optional[Bridge] = None

    def connect(self) -> Bridge:
        if self.cfg.dry_run:
            # Never connect in dry run mode
            raise RuntimeError("HueController.connect() called while dry_run=True")
        if self._bridge is None:
            b = Bridge(self.cfg.bridge_ip)
            b.connect()  # requires bridge button press first time
            self._bridge = b
        return self._bridge

    def _set_light_color_safe(self, bridge: Bridge, light_id: int, color: Dict[str, int]) -> None:
        bridge.set_light(light_id, "on", True)
        bridge.set_light(light_id, "bri", int(color.get("bri", 150)))

        info = bridge.get_light(light_id)
        state = (info or {}).get("state", {})

        # Some lights may not support hue/sat; handle gracefully.
        if "hue" in state and "sat" in state and "hue" in color and "sat" in color:
            bridge.set_light(light_id, "hue", int(color["hue"]))
            bridge.set_light(light_id, "sat", int(color["sat"]))

    def set_calm(self) -> None:
        if self.cfg.dry_run:
            print(f"[HUE DRY RUN] CALM -> lights={self.cfg.lights}, settings={self.cfg.calm}")
            return

        bridge = self.connect()
        for lid in self.cfg.lights:
            self._set_light_color_safe(bridge, lid, self.cfg.calm)

    def set_stress(self) -> None:
        if self.cfg.dry_run:
            print(f"[HUE DRY RUN] STRESS -> lights={self.cfg.lights}, settings={self.cfg.stress}")
            return

        bridge = self.connect()
        for lid in self.cfg.lights:
            self._set_light_color_safe(bridge, lid, self.cfg.stress)

    def turn_off(self) -> None:
        if self.cfg.dry_run:
            print(f"[HUE DRY RUN] OFF -> lights={self.cfg.lights}")
            return
        bridge = self.connect()
        for lid in self.cfg.lights:
            # Decide your preference:
            # Option A: true off
            bridge.set_light(lid, "on", False)

            # Option B: keep on but very dim (comment out Option A above if you use this)
            # bridge.set_light(lid, "on", True)
            # bridge.set_light(lid, "bri", self.cfg.off_bri)


