# Reneo WebRTC Video Call Prototype

A minimal two-person WebRTC video calling prototype created for the Reneo WebRTC / Live Streaming internship technical assessment.

The application allows two users to join the same room from separate browser tabs or devices and communicate using real-time audio and video.

> This project focuses on WebRTC fundamentals, signaling, connection states, failure handling, and explainable code. It intentionally does not include authentication, a database, or production-grade infrastructure.

## Features

### Part A — Core video call

- Camera and microphone access using `getUserMedia()`.
- Local video preview.
- Remote video received through WebRTC.
- Two-person room joining.
- WebSocket signaling server.
- Offer and answer exchange using SDP.
- ICE candidate exchange.
- STUN server configuration.
- Microphone mute and unmute.
- Camera on and off.
- Hang up and leave the room.
- Visible WebRTC connection states.
- Peer-left handling when the other participant closes the call or browser tab.
- Rejoin option after a failed or disconnected call.
- User-facing messages for camera/microphone permission and device errors.

### Part B — Connection quality panel

This project implements Part B3: a connection-quality panel using `RTCPeerConnection.getStats()`.

The panel displays available live statistics such as:

- Connection state.
- Packets lost.
- Jitter.
- Round-trip time.
- Video resolution, when exposed by the browser.
- Frames per second.

Some metrics may show `-` because WebRTC statistics vary between browsers and because particular reports may not be available in every connection.

### Part C

Part C written answers are intentionally not included in this README.

They are provided separately in:

```text
ANSWERS.md
```

## Technology stack

- HTML
- JavaScript
- Node.js
- `ws` WebSocket library
- Native browser WebRTC APIs
- Public STUN server

The frontend uses plain HTML and JavaScript rather than a frontend framework. This keeps the WebRTC lifecycle and signaling messages visible and easy to explain.

## Project structure

```text
WebRTC/
├── public/
│   ├── index.html
│   └── camera-test.js
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── README.md
└── ANSWERS.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- A modern browser with camera and microphone support
- A camera and microphone, either physical or virtual

## Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/Niraj1232005/WebRTC.git
cd WebRTC
```

Install the project dependency:

```bash
npm install
```

The project uses the `ws` package for the WebSocket signaling server. The `node_modules` directory is excluded from Git through `.gitignore`.

## Running locally

The project uses two local servers:

1. A static HTTP server for the frontend.
2. A WebSocket server for signaling.

### Start the signaling server

From the project root, run:

```bash
node server.js
```

Expected output:

```text
Signaling server running on ws://localhost:8000
```

### Start the frontend server

Open another terminal and run:

```bash
npx serve public -l 3000
```

Then open:

```text
http://localhost:3000
```

Opening the HTML file directly with a `file://` URL is not recommended because browser media permissions and WebRTC behavior are more reliable when the page is served through HTTP.

## How to test the call

1. Start `server.js` on port `8000`.
2. Start the static frontend server on port `3000`.
3. Open `http://localhost:3000` in a normal browser window.
4. Open the same URL in a second browser window, incognito window, or another device.
5. Allow camera and microphone permissions in both windows.
6. Both clients automatically join the room:

```text
reneo-room-001
```

7. Wait until both users see the remote video.
8. Test the microphone button.
9. Test the camera button.
10. Test the connection-quality panel.
11. Click Hang up in one client and confirm that the other client is informed that the peer left.
12. Test the Rejoin room option after the call ends or the connection fails.

For testing with two devices on the same network, the frontend and WebSocket URLs must be changed from `localhost` to the computer's local network IP address. The browser must also be able to reach both ports.

## Architecture

```text
Browser A
  │
  │ WebSocket: join, offer, answer, ICE candidates
  ▼
Node.js WebSocket signaling server
  │
  │ Relays signaling messages only
  ▼
Browser B

After negotiation:

Browser A  ◄──────── WebRTC audio/video media ────────►  Browser B
```

The signaling server does not receive or process the actual audio and video. It only helps the two browsers exchange the information required to establish the WebRTC connection.

## Signaling server behavior

The server keeps room membership in an in-memory `Map`:

```text
room ID → connected WebSocket clients
```

Each room is limited to two clients for this assessment.

The signaling server handles these message types:

| Message | Purpose |
|---|---|
| `join` | Adds a client to a room. |
| `joined` | Tells the client that it joined and provides its role. |
| `ready` | Tells both clients that two peers are present. |
| `signal` | Relays offers, answers, and ICE candidates. |
| `peer-left` | Informs the remaining client that the other peer disconnected. |
| `room-full` | Rejects a third client from a two-person room. |

The first client joining a room is assigned the `caller` role. The second client is assigned the `callee` role.

## WebRTC call flow

### 1. Capture media

The browser calls:

```javascript
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
```

The returned `MediaStream` is attached to the local video element and its tracks are added to the `RTCPeerConnection`.

### 2. Create the peer connection

Each browser creates an `RTCPeerConnection` with a STUN server:

```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};
```

### 3. Offer and answer

The caller creates an offer, sets it as its local description, and sends it through the signaling server.

The callee sets the offer as its remote description, creates an answer, sets the answer as its local description, and sends it back through the signaling server.

### 4. ICE candidates

Both browsers emit ICE candidates through the `onicecandidate` event. The candidates are sent through the WebSocket server and added to the other peer using `addIceCandidate()`.

### 5. Receive remote media

When the remote media arrives, the `ontrack` event fires and the remote stream is attached to the remote video element.

## Connection-quality statistics

The Part B3 panel periodically calls:

```javascript
peerConnection.getStats()
```

The code searches the returned reports for useful values:

- `candidate-pair`: round-trip time and selected network path information.
- `inbound-rtp`: incoming video packets lost, jitter, FPS, and sometimes resolution.
- `outbound-rtp`: outgoing video FPS and sometimes resolution.
- `track`: track-level video information when exposed by the browser.

The panel is updated approximately once per second while the page is open.

A connected state does not guarantee perfect quality. For example, a call can remain connected while experiencing packet loss, jitter, high latency, low FPS, or reduced resolution.

## Failure handling

### Camera or microphone permission denied

The application catches `NotAllowedError` and displays a message asking the user to allow camera and microphone access.

### No camera or microphone found

The application catches `NotFoundError` and displays a message indicating that no required device was found.

### Other participant leaves

When a WebSocket closes, the signaling server removes that client from its room and sends `peer-left` to the remaining client. The remaining client clears the remote video and displays a rejoin option.

### Temporary connection loss

The application displays a disconnected or temporarily lost status based on WebRTC connection state changes.

### Connection failure

The application displays a failure message and provides a rejoin option. The current prototype resets its local state by reloading the page.

## Scope decisions

### No database

This prototype does not use a database. Room membership is temporary and stored in memory on the signaling server. It is removed when a client leaves or the server restarts.

A production application could use persistent storage for user accounts, call records, moderation data, or scheduled rooms. Those features are outside this assessment's mandatory scope.

### No authentication

Authentication and authorization are not implemented because the assessment focuses on WebRTC, signaling, media handling, connection states, and failure behavior.

### No LiveKit in the core call

The core two-person call uses native WebRTC APIs and a custom WebSocket signaling server. This makes the offer, answer, ICE, and media flow visible in the code.

LiveKit experience is relevant to the architecture discussion in `ANSWERS.md`, especially the live-shopping scenario, but LiveKit is not used to hide the required core WebRTC implementation.

### Minimal UI

The assessment does not evaluate visual design. The interface is intentionally simple so that development time is focused on a working and explainable WebRTC call.

## Known limitations

- Room membership is stored only in memory.
- The server supports only two clients per room.
- The public STUN server is suitable for testing, not a complete production deployment.
- No TURN server is configured, so some restrictive networks may not establish a call.
- The signaling server does not authenticate room access.
- Rejoin currently reloads the page to reset application state.
- Browser implementations expose different WebRTC statistics, so some quality values may remain `-`.
- The project is not intended to be production-ready.

## What works

- Two browser clients can join the same room.
- Camera and microphone streams can be captured.
- Local and remote video can be displayed.
- Audio and video can be exchanged through WebRTC.
- Offer, answer, and ICE candidates are exchanged through WebSocket signaling.
- Microphone and camera tracks can be toggled.
- Calls can be ended cleanly.
- Peer departure and connection states are shown to the user.
- Connection-quality statistics are displayed when available.

## What I would improve next

If this prototype were extended beyond the assessment scope, I would consider:

- TURN server configuration for restrictive networks.
- Authentication and room authorization.
- A persistent call/session model.
- A dedicated join-room screen instead of a hardcoded room ID.
- A cleaner reset and rejoin flow without a full page reload.
- Better validation for malformed signaling messages.
- Server-side logging and monitoring.
- Automated tests for signaling messages and room behavior.
- HTTPS and secure WebSockets for deployment.
- Rate limits and protection against unauthorized room usage.

## AI assistance disclosure

AI assistance was used during development for:

- Reviewing and debugging JavaScript errors.
- Suggesting readable commit messages.
- Reviewing README structure and documentation.

The implementation was run and tested locally.

