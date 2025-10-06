# Formula One - Multiplayer Racing Game

This project is a multiplayer, turn-based racing game inspired by classic board games, built with Phaser, React, and TypeScript. It features a peer-to-peer networking model using WebRTC for low-latency gameplay, supported by a Node.js signalling server for lobby management.

## Features

* Turn-Based Strategic Gameplay: Manage your speed, tyre wear, and brake wear to navigate corners and overtake opponents.
* Multiplayer with WebRTC: Create or join game rooms and play with up to 6 players in real-time.
* Host-Authoritative Model: The game host runs the simulation, ensuring a fair and cheat-resistant environment.
* Spectator Mode: Hosts have the option to just spectate the race without participating.
* Interactive UI: Built with a custom widget and grid layout system within Phaser for a clean and responsive interface.

## Technology Stack

* Game Client:[Phaser 3](https://phaser.io/ "null"), [TypeScript](https://www.typescriptlang.org/ "null"), [React](https://reactjs.org/ "null") (for rendering the Phaser canvas)
* Build Tool:[Vite](https://vitejs.dev/ "null")
* Multiplayer & Networking:
  * Signalling Server:[Node.js](https://nodejs.org/ "null"), [Express](https://expressjs.com/ "null"), [Socket.IO](https://socket.io/ "null")
  * Peer-to-Peer:[WebRTC](https://webrtc.org/ "null") via the `simple-peer` library.

## Multiplayer Architecture

The game uses a hybrid client-server and peer-to-peer architecture.

1. Signalling & Lobby Server: A central Node.js server using `Express` and `Socket.IO` handles lobby management. Its responsibilities include:
   * Creating and listing available game rooms.
   * Allowing players to join rooms.
   * Facilitating the initial "handshake" between players required to establish a direct WebRTC connection.
2. Peer-to-Peer (P2P) Gameplay: Once players are in a room, they connect directly to the host using WebRTC.
   * The Host becomes the authoritative source for the game state. They run the full game simulation.
   * Clients send their actions (e.g., selected speed, chosen path) to the host.
   * Host processes these actions, updates the game state, and broadcasts the new state to all clients. This keeps all players synchronized.

This model provides low-latency gameplay (as game data travels directly between players) while preventing cheating (as only the host can validate moves and change the game state).

## How It Works: Code Breakdown

This section provides a high-level overview of the key files and their roles in the project.

### Server (`server/server.js`)

* Role: The central hub for players before a game starts.
* Functionality:
  * Serves the static game files (the `dist` folder in production).
  * Uses `Socket.IO` to manage a list of game rooms (`createRoom`, `joinRoom`).
  * Broadcasts lists of rooms and players to clients in the lobby.
  * Acts as a "matchmaker" for WebRTC by relaying signalling messages (`signal`) between players to help them establish a direct P2P connection.
  * Handles the `startGame` event, notifying all players in a room to transition to the `GameScene`.

### Networking Service (`src/game/services/Network.ts`)

* Role: The client-side engine for all network communication.
* Functionality:
  * Establishes and maintains a connection to the `Socket.IO` signalling server.
  * Manages `simple-peer` instances, creating and handling WebRTC connections with other players.
  * Uses a global `EventBus` to decouple the networking layer from the game scenes. It listens for server events (e.g., `'playerList'`) and emits them on the `EventBus` for the scenes to react to (e.g., `'network-playerList'`).
  * Provides methods for scenes to send data, such as `sendToHost()` for client actions and `broadcastToPeers()` for host state updates.

### Game Lobby Scene (`src/game/scenes/GameLobby.ts`)

* Role: The user interface for creating, joining, and starting a game.
* Functionality:
  * Initializes the `Network` service.
  * Listens for events from the `EventBus` (e.g., `'network-roomList'`) to update the UI.
  * Uses the custom widget system (`src/game/layout/widgets`) to build the UI for creating a room, listing available rooms, and showing players in a lobby.
  * Handles the transition to the `GameScene` when the `'game-start'` event is received from the `EventBus`.

### Game Scene (`src/game/scenes/GameScene.ts`)

* Role: The main gameplay screen where the race takes place.
* Functionality:
  * Host Logic: If the player is the host, this scene runs the full game simulation. It processes player turns, validates moves, calculates penalties, and is the single source of truth for the game state.
  * Client Logic: If the player is a client, this scene acts primarily as a renderer. It receives game state updates from the host and updates the visuals on screen to match.
  * State Synchronization: The host calls `updateAndBroadcastState()` after every significant change. This function sanitizes the game state into plain JSON objects and sends it to all clients via the `Network` service.
  * Player Input: When a client performs an action (like selecting a speed), the action is sent to the host via `network.sendToHost()`. The host then validates and processes this action, and the result is sent back to all clients in the next state update.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/en/ "null") (v18 or later recommended)
* [npm](https://www.npmjs.com/ "null") (usually included with Node.js)

### 1. Development Setup

This setup is ideal for active development, providing hot-reloading for the game client. You will need two terminal windows.

Terminal 1: Start the Signalling Server

```
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Start the server in development mode (restarts on changes)
npm run dev

```

The server will be running at `http://localhost:3000`.

Terminal 2: Start the Game Client

```
# 1. In a new terminal, navigate to the project's root directory
# (Make sure you are not in the 'server' directory)
cd ..

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev

```

Vite will start the client, typically at `http://localhost:5173`.

To Play: Open `http://localhost:5173` in multiple browser tabs. Each tab will act as a different player and will automatically connect to the signalling server.

### 2. Production Setup

This setup builds the final, optimized version of the game and serves it directly from the Node.js server.

Step 1: Build the Game

```
# 1. From the project's root directory, install dependencies
npm install

# 2. Run the build script
npm run build

```

This command creates an optimized `dist` folder in the project root.

Step 2: Run the Server

```
# 1. Navigate to the server directory
cd server

# 2. Install dependencies (if you haven't already)
npm install

# 3. Start the production server
npm start

```

The server will now be running at `http://localhost:3000`.

To Play: Open `http://localhost:3000` in multiple browser tabs to play the game.

## Project Structure

```
.
├── dist/                # Production build output (generated by `npm run build`)
├── server/              # Node.js signalling server
│   ├── server.js        # Main server logic (Socket.IO, Express)
│   └── package.json
├── src/
│   ├── game/
│   │   ├── scenes/      # Phaser scenes (GameLobby, GameScene, etc.)
│   │   ├── services/    # Networking logic (Network.ts)
│   │   ├── layout/      # Custom UI widget and grid system
│   │   └── main.ts      # Main Phaser game configuration
│   └── main.tsx         # React entry point to render the Phaser canvas
├── vite/                # Vite build configurations
├── package.json         # Game client dependencies and scripts
└── README.md            # This file

```
