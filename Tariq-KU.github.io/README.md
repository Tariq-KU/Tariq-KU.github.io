# Guess Who Online

A lightweight, peer-to-peer version of the classic Guess Who board game that lives entirely in the browser. Create a private room, upload your own character images, and share the room code with a friend to play together.

## Features

- 🎮 **Two-player rooms** – One person hosts, the other joins with a room code.
- 🖼️ **Custom boards** – Upload up to 24 PNG/JPEG images, rename characters, and instantly share the board with your opponent.
- 🔐 **Peer-to-peer connection** – Uses WebRTC (via [PeerJS](https://peerjs.com/)) so moves sync live without a separate server.
- 📝 **Shared activity log** – Chat through yes/no questions and see connection events inline.
- ♻️ **No build step** – Pure HTML/CSS/JS suitable for GitHub Pages.

## Getting started locally

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/Tariq-KU.github.io.git
   cd Tariq-KU.github.io
   ```
2. Start a simple static server (any will do). For example with Python:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in a desktop browser.
4. One player clicks **Create game**, uploads/renames characters, and shares the generated room code. The other player enters the code under **Join game**.
5. Each player marks their secret character and use the chat log to coordinate questions.

> **Note:** PeerJS uses a public signalling server by default. For production use you can [self-host a PeerServer](https://github.com/peers/peerjs-server) and configure the connection in `app.js` for additional control.

## Deployment

Because the project is static, you can deploy it anywhere that can host HTML files (GitHub Pages, Netlify, Vercel, etc.). Copy the repository contents to your hosting provider and publish—no bundling step required.
