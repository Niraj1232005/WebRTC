const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8000 });

const rooms = new Map(); // roomId -> [socket1, socket2]

wss.on('connection', (socket) => {
  console.log('New client connected');
  socket.roomId = null;

  socket.on('message', (rawMessage) => {
    const data = JSON.parse(rawMessage);

    if (data.type === 'join') {
      handleJoin(socket, data.roomId);
      return;
    }

    if (data.type === 'signal') {
      relaySignal(socket, data);
      return;
    }

    console.log('Received:', data.type);
  });

  socket.on('close', () => {
    handleLeave(socket);
  });
});

function handleJoin(socket, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, []);
  }

  const peers = rooms.get(roomId);

  if (peers.length >= 2) {
    socket.send(JSON.stringify({ type: 'room-full' }));
    return;
  }

  peers.push(socket);
  socket.roomId = roomId;

  const role = peers.length === 1 ? 'caller' : 'callee';

  console.log(`Client joined room "${roomId}" as ${role}, now ${peers.length} peer(s)`);

  socket.send(JSON.stringify({ type: 'joined', roomId, peerCount: peers.length, role }));

  if (peers.length === 2) {
    peers.forEach((peerSocket) => {
      peerSocket.send(JSON.stringify({ type: 'ready' }));
    });
  }
}

function relaySignal(senderSocket, data) {
  const roomId = senderSocket.roomId;
  if (!roomId || !rooms.has(roomId)) return;

  const peers = rooms.get(roomId);
  const otherPeer = peers.find((s) => s !== senderSocket);

  if (otherPeer) {
    otherPeer.send(JSON.stringify({ type: 'signal', payload: data.payload }));
  }
}

function handleLeave(socket) {
  const roomId = socket.roomId;
  if (!roomId || !rooms.has(roomId)) return;

  const peers = rooms.get(roomId);
  const remaining = peers.filter((s) => s !== socket);
  rooms.set(roomId, remaining);

  console.log(`Client left room "${roomId}", ${remaining.length} peer(s) left`);

  remaining.forEach((peerSocket) => {
    peerSocket.send(JSON.stringify({ type: 'peer-left' }));
  });

  if (remaining.length === 0) {
    rooms.delete(roomId);
  }
}

console.log('Signaling server running on ws://localhost:8000');