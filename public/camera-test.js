const localVideo = document.getElementById('localVideo');
const statusEl = document.getElementById('status');
const socket = new WebSocket('ws://localhost:8000');
const roomId = 'reneo-room-001';


async function startCamera() {
  statusEl.textContent = 'Status: requesting camera/mic access...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.srcObject = stream;
    statusEl.textContent = 'Status: camera and mic active';
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

startCamera();



socket.onopen = () => {
  statusEl.textContent = 'Status: connected to signaling server, joining room...';
  socket.send(JSON.stringify({ type: 'join', roomId }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Signal received:', data);

  if (data.type === 'joined') {
    statusEl.textContent = `Status: joined room "${data.roomId}" (${data.peerCount}/2 peers)`;
  } else if (data.type === 'ready') {
    statusEl.textContent = 'Status: both peers present, ready to connect';
  } else if (data.type === 'peer-left') {
    statusEl.textContent = 'Status: the other participant left';
  } else if (data.type === 'room-full') {
    statusEl.textContent = 'Status: room is full, cannot join';
  }
};

socket.onerror = () => {
  statusEl.textContent = 'Status: could not reach signaling server';
};