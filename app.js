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
let isHost = false;
let localName = '';
let remoteName = '';
let localId = '';
let boardData = [];
let secretCardId = null;
let cardCounter = 0;
let isBoardLocked = false;
const defaultCharacters = Array.from({ length: 12 }).map((_, index) => ({
  id: `default-${index + 1}`,
  name: `Character ${index + 1}`,
  imageData: createFallbackImage(index + 1),
}));
function createFallbackImage(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const hue = (number * 47) % 360;
  ctx.fillStyle = `hsl(${hue}, 80%, 75%)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
  ctx.font = 'bold 120px Nunito, sans-serif';
  ctx.fillStyle = '#1f2933';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}
function showPanel(panel) {
  [sessionPanel, editorPanel, gamePanel].forEach((p) => p.classList.add('hidden'));
  panel.classList.remove('hidden');
}
function addLogEntry(message, meta = '') {
  const entry = document.createElement('div');
  entry.className = 'chat-entry';
  const text = document.createElement('div');
  text.textContent = message;
  entry.appendChild(text);
  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = meta;
    entry.appendChild(metaEl);
  }
  chatLog.appendChild(entry);
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
}
function toggleStartButton() {
  const hasCards = editorBoard.querySelectorAll('.card').length > 1;
  startGameBtn.disabled = !hasCards;
}
function handleUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const existingCards = editorBoard.querySelectorAll('.card').length;
  if (existingCards >= CARD_LIMIT) {
    alert(`The board is full. Remove a card to upload another (limit ${CARD_LIMIT}).`);
    cardUpload.value = '';
    return;
  }
  for (const file of files) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert(`${file.name} is not a supported format. Please upload PNG or JPEG images.`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} is larger than 2MB. Try compressing the image first.`);
      continue;
    }
    if (editorBoard.querySelectorAll('.card').length >= CARD_LIMIT) break;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target.result;
      addEditorCard({
        id: `card-${++cardCounter}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        imageData: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }
  cardUpload.value = '';
}
function addEditorCard(card) {
  const node = cardEditorTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = card.id;
  node.dataset.image = card.imageData;
  node.querySelector('img').src = card.imageData;
  const nameInput = node.querySelector('.card-name-input');
  nameInput.value = card.name || 'Character';
  nameInput.addEventListener('input', () => {
    nameInput.value = nameInput.value.slice(0, 40);
  });
  node.querySelector('.remove').addEventListener('click', () => {
    node.remove();
    toggleStartButton();
  });
  editorBoard.appendChild(node);
  toggleStartButton();
}
function collectBoardData() {
  return Array.from(editorBoard.querySelectorAll('.card')).map((card, index) => ({
    id: card.dataset.id || `card-${index + 1}`,
    name: card.querySelector('.card-name-input').value.trim() || `Character ${index + 1}`,
    imageData: card.dataset.image,
  }));
}
function renderBoard(cards) {
  gameBoard.innerHTML = '';
  cards.forEach((card) => {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = card.id;
    node.querySelector('img').src = card.imageData;
    node.querySelector('.card-label').textContent = card.name;
    node.addEventListener('click', () => handleCardToggle(node));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCardToggle(node);
      }
    });
    gameBoard.appendChild(node);
  });
}
function handleCardToggle(cardNode, shouldBroadcast = true) {
  if (!isBoardLocked) return;
  const cardId = cardNode.dataset.id;
  if (!secretCardId && shouldBroadcast) {
    markSecretCard(cardId);
    if (shouldBroadcast && connection && connection.open) {
      connection.send({ type: 'secret', from: localName });
    }
    return;
  }
  cardNode.classList.toggle('down');
  // Card flips should be local-only so each player manages their own board state.
}
function markSecretCard(cardId) {
  if (!isBoardLocked) return;
  if (secretCardId) {
    const previous = gameBoard.querySelector(`[data-id="${secretCardId}"]`);
    if (previous) {
      previous.classList.remove('secret');
    }
  }
  secretCardId = cardId;
  const current = gameBoard.querySelector(`[data-id="${cardId}"]`);
  if (current) {
    current.classList.add('secret');
  }
  secretHint.textContent = 'Secret locked in! Keep it hidden and answer carefully.';
}
function setupGameBoard(cards) {
  boardData = cards;
  renderBoard(cards);
  isBoardLocked = true;
  secretHint.textContent = 'Click one of the cards to mark it as your mystery character. You can change it later by selecting a different card.';
}
function setRoomCodeDisplay(code) {
  roomCodeDisplay.textContent = code;
  activeRoomCode.textContent = code;
}
function resetState() {
  boardData = [];
  secretCardId = null;
  isBoardLocked = false;
  connection = null;
  peer = null;
  localId = '';
  remoteName = '';
  cardCounter = 0;
  gameBoard.innerHTML = '';
  chatLog.innerHTML = '';
  hostTag.textContent = '-';
  guestTag.textContent = '-';
  secretHint.textContent = 'Select one of the cards below to mark it as your character. This is only visible to you.';
  cardUpload.value = '';
  editorBoard.innerHTML = '';
  toggleStartButton();
}
function populateDefaultBoard() {
  editorBoard.innerHTML = '';
  defaultCharacters.forEach((character) => addEditorCard(character));
  toggleStartButton();
}

function setupPeer() {
  return new Promise((resolve, reject) => {
    const peerInstance = new Peer({
      host: '0.peerjs.com',       // official signaling server
      port: 443,
      path: '/',
      secure: true,
      config: {
        iceServers: [
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
        ],
      },
      debug: 2, // optional; shows helpful logs in console
    });

    peerInstance.on('open', (id) => {
      console.log('✅ PeerJS connected with ID:', id);
      resolve(peerInstance);
    });

    peerInstance.on('error', (err) => {
      console.error('❌ PeerJS error:', err);
      alert('Could not establish peer connection. Please try again or refresh the page.');
      reject(err);
    });
  });
}

function initializeHost() {
  isHost = true;
  localName = hostNameInput.value.trim() || 'Host';
  resetState();
  populateDefaultBoard();
  showPanel(editorPanel);
  gameStatus.textContent = 'Waiting to share your board…';
  setupPeer()
    .then((instance) => {
      peer = instance;
      localId = peer.id;
      setRoomCodeDisplay(localId);
      addLogEntry('Share the room code with your friend so they can join.');
      peer.on('connection', (conn) => {
        if (connection && connection.open) {
          conn.close();
          return;
        }
        connection = conn;
        setupConnection();
      });
    })
    .catch(() => {
      showPanel(sessionPanel);
    });
}
function initializeGuest() {
  isHost = false;
  localName = guestNameInput.value.trim() || 'Guest';
  const targetRoomCode = roomCodeInput.value.trim();
  if (!targetRoomCode) {
    alert('Enter the room code from your friend first.');
    return;
  }
  resetState();
  showPanel(gamePanel);
  gameStatus.textContent = 'Connecting to host…';
  setupPeer()
    .then((instance) => {
      peer = instance;
      localId = peer.id;
      setRoomCodeDisplay(targetRoomCode);
      connection = peer.connect(targetRoomCode, { reliable: true });
      setupConnection();
    })
    .catch(() => {
      showPanel(sessionPanel);
    });
}
function setupConnection() {
  if (!connection) return;
  connection.on('open', () => {
    addLogEntry('Connected!', `${new Date().toLocaleTimeString()}`);
    gameStatus.textContent = 'Connected. Choose your character and start asking questions!';
    const greeting = {
      type: 'hello',
      name: localName,
      role: isHost ? 'host' : 'guest',
    };
    connection.send(greeting);
    if (isHost && boardData.length) {
      shareBoard();
    }
  });
  connection.on('data', handleIncomingMessage);
  connection.on('close', () => {
    addLogEntry('The other player left the game.', new Date().toLocaleTimeString());
    gameStatus.textContent = 'Connection closed. Refresh to start a new game.';
  });
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

