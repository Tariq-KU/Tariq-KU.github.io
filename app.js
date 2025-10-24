const sessionPanel = document.getElementById('sessionPanel');
const editorPanel = document.getElementById('editorPanel');
const gamePanel = document.getElementById('gamePanel');
const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const startGameBtn = document.getElementById('startGameBtn');
const clearBoardBtn = document.getElementById('clearBoardBtn');
const cardUpload = document.getElementById('cardUpload');
const editorBoard = document.getElementById('editorBoard');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const gameBoard = document.getElementById('gameBoard');
const gameStatus = document.getElementById('gameStatus');
const activeRoomCode = document.getElementById('activeRoomCode');
const hostTag = document.querySelector('#hostTag .value');
const guestTag = document.querySelector('#guestTag .value');
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const secretHint = document.getElementById('secretHint');
const hostNameInput = document.getElementById('hostName');
const guestNameInput = document.getElementById('guestName');
const roomCodeInput = document.getElementById('roomCode');

const cardTemplate = document.getElementById('cardTemplate');
const cardEditorTemplate = document.getElementById('cardEditorTemplate');

const CARD_LIMIT = 24;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

let peer = null;
let connection = null;
@@ -251,7 +269,12 @@ function populateDefaultBoard() {

function setupPeer() {
  return new Promise((resolve, reject) => {
    const peerInstance = new Peer();
    const peerInstance = new Peer({
      config: {
        iceServers: ICE_SERVERS,
      },
      debug: 1,
    });
    peerInstance.on('open', (id) => resolve(peerInstance));
    peerInstance.on('error', (err) => {
      console.error(err);
@@ -343,6 +366,7 @@ function setupConnection() {
  connection.on('error', (err) => {
    console.error(err);
    addLogEntry('Connection error. Try refreshing the page.', new Date().toLocaleTimeString());
    gameStatus.textContent = 'Connection error. Please refresh and ensure both players have a stable network.';
  });
}

function shareBoard() {
  if (!connection || !connection.open) {
    addLogEntry('Board is ready. Waiting for your friend to connect…');
    return;
  }
  connection.send({
    type: 'board',
    board: boardData,
    hostName: localName,
  });
}
function handleIncomingMessage(payload) {
  if (!payload || typeof payload !== 'object') return;
  switch (payload.type) {
    case 'hello': {
      remoteName = payload.name || (payload.role === 'host' ? 'Host' : 'Guest');
      if (payload.role === 'host') {
        hostTag.textContent = remoteName;
        guestTag.textContent = localName;
      } else {
        hostTag.textContent = localName;
        guestTag.textContent = remoteName;
      }
      addLogEntry(`${remoteName} joined the game.`);
      if (isHost && boardData.length) {
        shareBoard();
      }
      break;
    }
    case 'board': {
      remoteName = payload.hostName || 'Host';
      hostTag.textContent = remoteName;
      guestTag.textContent = localName;
      addLogEntry('Board received. Select your secret character to begin!');
      boardData = payload.board || [];
      showPanel(gamePanel);
      setupGameBoard(boardData);
      break;
    }
    case 'chat': {
      addLogEntry(payload.message, `${payload.from} • ${new Date().toLocaleTimeString()}`);
      break;
    }
    case 'secret': {
      addLogEntry(`${payload.from} has locked in their mystery character.`);
      break;
    }
    default:
      break;
  }
}
function beginGame() {
  boardData = collectBoardData();
  if (!boardData.length) {
    alert('Add at least two characters before starting.');
    return;
  }
  showPanel(gamePanel);
  setupGameBoard(boardData);
  hostTag.textContent = localName;
  addLogEntry('Board shared! Waiting for your friend to join.');
  isBoardLocked = true;
  gameStatus.textContent = connection && connection.open
    ? 'Connected. Choose your character and start asking questions!'
    : 'Waiting for your friend to join…';
  shareBoard();
}
function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = '';
  addLogEntry(message, `${localName} • ${new Date().toLocaleTimeString()}`);
  if (connection && connection.open) {
    connection.send({ type: 'chat', message, from: localName });
  }
}
createGameBtn.addEventListener('click', initializeHost);
joinGameBtn.addEventListener('click', initializeGuest);
startGameBtn.addEventListener('click', beginGame);
clearBoardBtn.addEventListener('click', () => {
  editorBoard.innerHTML = '';
  cardCounter = 0;
  toggleStartButton();
});
cardUpload.addEventListener('change', handleUpload);
chatForm.addEventListener('submit', handleChatSubmit);
document.addEventListener('DOMContentLoaded', () => {
  resetState();
  populateDefaultBoard();
});
