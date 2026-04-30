
# Combat Camera

Your task is to implement a dynamic 2D camera system with deterministic scaling and strict letterboxing. The goal is to keep an "action zone" always visible without ever revealing the exterior of the map boundaries, regardless of the user's screen resolution or aspect ratio (viewport).

Generate clean, professional code without unnecessary explanations, strictly following the mathematical architecture below.

1. Spatial Architecture and Constants

The system consists of three nested layers: Viewport (screen) -> Camera (frame with restricted proportions) -> World (canvas).

Use the following constants:

MAP_WIDTH = 2000 (Total world width).

MAP_HEIGHT = 2000 (Total world height).

VISIBLE_UNITS = 1000 (Size of the action zone that MUST always be 100% visible).

TARGET_X = 1000 (X coordinate of the world center and focal point).

TARGET_Y = 1000 (Y coordinate of the world center and focal point).

RATIO_MAX = 2.0 (Calculated from MAP_WIDTH / VISIBLE_UNITS).

RATIO_MIN = 0.5 (Calculated from VISIBLE_UNITS / MAP_HEIGHT).

1. Camera Algorithm (Update Loop / Resize)

The mathematical core must run every time the viewport changes size. Implement this exact logic:

Camera Frame Calculation (Letterboxing):

Read the viewport width (vpW) and height (vpH).

Calculate the current ratio: ratio = vpW / vpH.

If ratio > RATIO_MAX, the camera width will be vpH * RATIO_MAX (applies Pillarbox).

If ratio < RATIO_MIN, the camera height will be vpW / RATIO_MIN (applies Letterbox).

If it is within the limits, the camera dimensions are equal to the viewport dimensions.

Global Scale Calculation:

The scale MUST be: scale = Math.min(camWidth, camHeight) / VISIBLE_UNITS.

Translation Calculation (Centering):

translateX = (camWidth / 2) - (TARGET_X * scale).

translateY = (camHeight / 2) - (TARGET_Y * scale).

Apply translateX, translateY, and scale to the transformation matrix of the world container (whose coordinate origin must be Top-Left or (0,0)).

1. Entity Anchoring

Within the world (subjected to global scale and translation), instantiate two 450x450 unit entities. Their absolute positions within the 2000x2000 world are static and define the extremes of the action zone:

Player 1 (Anchored bottom-left of the visible zone):

X: 500

Y: 1050 (Calculated as MAP_HEIGHT - 500 - 450)

Player 2 (Anchored top-right of the visible zone):

X: 1050 (Calculated as MAP_WIDTH - 500 - 450)

Y: 500
