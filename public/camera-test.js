const localVideo = document.getElementById('localVideo');
const statusEl = document.getElementById('status');

const toggleMicButton = document.getElementById('toggleMicButton');

let localStream;

const remoteVideo = document.createElement('video');
remoteVideo.autoplay = true;
remoteVideo.playsinline = true;
document.body.appendChild(document.createElement('h3')).textContent = 'Remote video';
document.body.appendChild(remoteVideo);

let peerConnection;
let myRole;
let socket;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function startCamera() {
  statusEl.textContent = 'Status: requesting camera/mic access...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localStream = stream;

    localVideo.srcObject = stream;
    statusEl.textContent = 'Status: camera and mic active';

    createPeerConnection(stream);
    connectToSignalingServer();

    toggleMicButton.disabled = false;
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      statusEl.textContent = 'Status: permission denied — please allow camera/mic access';
    } else if (err.name === 'NotFoundError') {
      statusEl.textContent = 'Status: no camera or microphone found on this device';
    } else {
      statusEl.textContent = 'Status: error - ' + err.message;
    }
  }
}

function createPeerConnection(localStream) {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    console.log('ontrack fired, got remote stream');
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('Sending ICE candidate');
      socket.send(JSON.stringify({
        type: 'signal',
        payload: { kind: 'ice-candidate', candidate: event.candidate }
      }));
    } else {
      console.log('ICE candidate gathering finished');
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
  };
}

async function startCall() {
  console.log('Creating offer...');
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Offer set locally, sending to peer');

  socket.send(JSON.stringify({
    type: 'signal',
    payload: { kind: 'offer', sdp: offer }
  }));
}

async function handleSignal(payload) {
  console.log('Handling signal:', payload.kind);

  if (payload.kind === 'offer') {
    await peerConnection.setRemoteDescription(payload.sdp);
    console.log('Remote offer set, creating answer...');
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('Answer set locally, sending to peer');

    socket.send(JSON.stringify({
      type: 'signal',
      payload: { kind: 'answer', sdp: answer }
    }));
  } else if (payload.kind === 'answer') {
    await peerConnection.setRemoteDescription(payload.sdp);
    console.log('Remote answer set');
  } else if (payload.kind === 'ice-candidate') {
    await peerConnection.addIceCandidate(payload.candidate);
    console.log('Remote ICE candidate added');
  }
}

function connectToSignalingServer() {
  const roomId = 'reneo-room-001';
  socket = new WebSocket('ws://localhost:8000');

  socket.onopen = () => {
    statusEl.textContent = 'Status: connected to signaling server, joining room...';
    socket.send(JSON.stringify({ type: 'join', roomId }));
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log('Signal received:', data.type);

    if (data.type === 'joined') {
      myRole = data.role;
      statusEl.textContent = `Status: joined room "${data.roomId}" as ${myRole} (${data.peerCount}/2 peers)`;
    } else if (data.type === 'ready') {
      statusEl.textContent = 'Status: both peers present, connecting...';
      if (myRole === 'caller') {
        await startCall();
      }
    } else if (data.type === 'signal') {
      await handleSignal(data.payload);
    } else if (data.type === 'peer-left') {
      statusEl.textContent = 'Status: the other participant left';
    } else if (data.type === 'room-full') {
      statusEl.textContent = 'Status: room is full, cannot join';
    }
  };

  socket.onerror = () => {
    statusEl.textContent = 'Status: could not reach signaling server';
  };
}

startCamera();

toggleMicButton.addEventListener('click', () => {
  const audioTrack = localStream.getAudioTracks()[0];

  audioTrack.enabled = !audioTrack.enabled;

  if (audioTrack.enabled) {
    toggleMicButton.textContent = 'Mute microphone';
  } else {
    toggleMicButton.textContent = 'Unmute microphone';
  }
});