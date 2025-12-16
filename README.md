# UIL Lab Demo README

This repo contains the source code for the UIL Lab demo. Currently it contains
code that is used to run the **HBI-booth**. For this booth, our goal is to show
how heart rate changes with sound stimuli. We will have participants use smart
rings that will be connected to various secondary displays. We wil use an
in-house web app that takes the registered heart rates from visiting
participants at our booth and then displays them on these secondary screens in
a prettified format. Next we will also make use of a primary display that
serves as a ``scoreboard'' of sorts, which displays the heart data of
previously visited participants (like a leaderboard). 

This repo contains the code to enable the above.

## System requirements
1. macOS 15.5 (24F74)
2. Python 3.12+
3. Hue Bridge reachable on local network
4. WAV files present at: `demos/heart-rate/Stress.wav` and `demos/heart-rate/Nature.wav`

# Instructions for Running
This project supports two execution modes: Dry Run and Live Run.
The mode is controlled via the `HUE_DRY_RUN` environment variable.

## Dry Run Mode (No Philips Hue Required)

Dry Run mode allows you to run and test the full system without access to the Philips Hue bridge or lights.
In this mode, all sound playback works normally.
Philips Hue commands are not sent to the bridge.
Hue actions are logged to the terminal instead (e.g. [HUE DRY RUN] CALM → lights=[7]).

This is the recommended mode for development, testing, and UI integration.

Run in Dry Run mode:

```bash
source venv/bin/activate
pip install -r requirements.txt
HUE_DRY_RUN=1 python -m server.app

Then test by:
```bash
curl -X POST http://localhost:5000/api/experience/calm/start
curl -X GET  http://localhost:5000/api/experience/status
curl -X POST http://localhost:5000/api/experience/stop
curl -X POST http://localhost:5000/api/experience/stress/start



## Live Mode (Philips Hue Enabled)
Live mode enables full sound + Philips Hue light control.
Use this mode only when the Hue bridge and lights are available on the local network.

In Live mode, audio playback and Hue lighting run together; Lights change state
exactly when sound starts/stops; The first run may require pressing the physical Hue Bridge link button

Run in Live mode:
```bash
source venv/bin/activate
pip install -r requirements.txt
HUE_DRY_RUN=0 python -m server.app


or simply:
`python -m server.app`



## Notes
The server must be started from the repository root.
The server runs on port 5000 and is accessible on the local network:

http://<facilitator-ip>:5000

Audio files must exist at:
`demos/heart-rate/Stress.wav`
`demos/heart-rate/Nature.wav`


To stop all sound and lights at any time, call:

`POST /api/experience/stop`
