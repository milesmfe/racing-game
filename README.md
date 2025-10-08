# A WebRTC Multiplayer Racing Game

**Ready to Race? [Play the game live here!](https://itslightsoutandawaywego.co.uk/ "null")**

Welcome to [redacted due to copyright] racing game, a multiplayer, turn-based racing game inspired by classic board games. This project is a deep dive into creating a real-time, browser-based gaming experience using a modern web stack. It's built from the ground up with **Phaser 3** for the game logic, **React** for rendering, and a peer-to-peer (P2P) networking model powered by **WebRTC** for low-latency gameplay.

The core challenge this project tackles is state synchronization in a multiplayer environment without a powerful, authoritative game server.

## Key Features

* **Turn-Based Strategic Gameplay** : It's not about who clicks fastest. Players must manage their speed, tyre wear, and brake wear to navigate corners and overtake opponents.
* **Real-time Multiplayer with WebRTC** : Create or join game rooms to play with up to 6 players.
* **Host-Authoritative Networking Model** : To keep the race fair and prevent cheating, the game host's machine runs the simulation and acts as the source of truth.
* **Spectator Mode** : The host can choose to watch the race instead of participating.
* **Interactive UI** : A custom-built widget and grid layout system within Phaser ensures a clean and responsive interface.

## The Architecture

To understand how this game works, think of it not as a single program, but as a system with three main parts: the **Game Client** (the player's browser), a lightweight **Signalling Server** (our matchmaker), and the direct **P2P connection** between players.

### 1. The Signalling Server: The "Lobby Host"

Imagine you're meeting friends at a massive concert. It's too loud and crowded to find each other. The signalling server is like a designated meeting point. Its only job is to help friends (players) find each other in the crowd and exchange contact info so they can communicate directly.

* **Role** : A central Node.js server that manages lobbies and game rooms *before* a game starts.
* **Responsibilities** :
* Creating and listing available game rooms.
* Allowing players to join rooms.
* Facilitating the initial "handshake" between players needed to establish a direct WebRTC connection. It passes messages back and forth saying, "Player A wants to connect to Player B, here's their info."

This server is incredibly lightweight because it's not involved in the actual gameplay. Once the players are connected, its main job is done.

### 2. The Game Client

This is what the user sees and interacts with. It's the car, the track, and the dashboard.

* **Role** : Renders the game and sends player inputs.
* **Frontend Stack** :
* **Phaser 3** : The game engine responsible for all the core logic—drawing the track, moving the cars, and calculating physics.
* **React** : Acts as the "scaffolding." It renders the main canvas element that Phaser draws on, making it easy to integrate the game into a web page.
* **TypeScript** : Ensures our code is robust and less prone to errors.

### 3. Peer-to-Peer (P2P) Gameplay

Once the signalling server has introduced everyone, the players' browsers talk directly to one another. The player who created the room becomes the **Host**.

* **Role** : The Host's browser becomes the authoritative source for the game state. It's like the race director (source of truth).
* **How it works** :

1. **Clients Send Actions** : When a player makes a move (e.g., "I want to go at speed 4"), their client sends this action *only* to the host.
2. **Host Validates & Simulates** : The host receives the action, checks if it's a valid move, and updates the game state.
3. **Host Broadcasts State** : The host then broadcasts the *new, updated game state* to all other players (the clients).
4. **Clients Render State** : The clients receive this new state and simply update their screen to match. They trust the host completely.

This **host-authoritative model** gives us two big wins:

* **Low Latency** : Game data travels directly between players, which is much faster than sending it to a server and waiting for a response.
* **Cheat Prevention** : Since only the host can validate moves and change the game state, it's very difficult for a client to cheat by sending an invalid move.

## Technology Stack

| **Layer**             | **Technology**                                                                                          | **Purpose**                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Game Client**       | [Phaser 3](https://phaser.io/ "null"),[React](https://reactjs.org/ "null"),[TypeScript](https://www.typescriptlang.org/ "null") | Renders the game, handles user input, and manages the visual state.       |
| **Networking**        | [WebRTC](https://webrtc.org/ "null") via `simple-peer` , [Socket.IO](https://socket.io/ "null")                       | P2P communication for gameplay and client-server connection for lobbying. |
| **Signalling Server** | [Node.js](https://nodejs.org/ "null"),[Express](https://expressjs.com/ "null")                                            | Manages game rooms, players, and the initial WebRTC handshake.            |
| **Build Tool**        | [Vite](https://vitejs.dev/ "null")                                                                                  | Provides a fast and modern development environment with hot-reloading.    |

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/en/ "null") (v18 or later recommended)
* [npm](https://www.npmjs.com/ "null") (usually included with Node.js)

### Development Setup (with Hot-Reloading)

This is the best way to run the project for active development. You will need two separate terminal windows.

**Terminal 1: Start the Signalling Server**

```
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Start the server (restarts automatically on changes)
npm run dev

```

The server will be running at `http://localhost:3000`.

**Terminal 2: Start the Game Client**

```
# 1. In a new terminal, navigate to the project's root directory
# (Make sure you are not in the 'server' directory)

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev

```

Vite will open the game client, typically at `http://localhost:5173`. To play, open this address in multiple browser tabs.

### Production Setup

This builds the final, optimized version of the game and serves it from the Node.js server.

**Step 1: Build the Game**

```
# From the project's root directory
npm install
npm run build

```

This command creates a final `dist` folder.

**Step 2: Run the Server**

```
# From the project's root directory
npm start

```

The game is now live! Open `http://localhost:3000` in multiple browser tabs to play.

## Automated Release & Deployment

This project is configured with a Continuous Integration and Continuous Deployment (CI/CD) pipeline to automate the process of releasing new versions. Pushing a new version tag to the repository will automatically build, package, and deploy the game to the production server.

### How It Works

The automation is a two-part process:

1. **GitHub Action (Release Creation)** : When a new tag following the pattern `v*.*.*` is pushed to the repository, a GitHub Action is triggered. This [action](https://github.com/milesmfe/racing-game/blob/main/.github/workflows/create-release.yml) performs the following steps:

* Checks out the latest code.
* Installs Node.js dependencies.
* Builds the game for production (`npm run build`).
* Packages the necessary server files (`server/`), the built game (`dist/`), and the server's production dependencies into a single `release.zip` file.
* Creates a new public **GitHub Release** and attaches the `release.zip` file as an asset.

1. **Webhook Deployment (Server-Side)** : The production server runs a lightweight webhook listener.

* When the GitHub Action successfully creates a new release, GitHub sends a secure notification (a webhook) to a specific endpoint on the server.
* The listener verifies the notification and executes a deploy script.
* This script downloads the `release.zip` from the latest GitHub Release, unpacks it, and uses PM2 to reload the game server with zero downtime.

### How to Deploy a New Version

To release and deploy a new version of the game, follow these simple steps:

1. Ensure all your latest changes have been committed and pushed to the `main` branch.
2. From your local development machine, create a new Git tag with the desired version number. The version should follow [Semantic Versioning](https://semver.org/ "null").
   ```
   # Example for version 1.1.0
   git tag v1.1.0

   ```
3. Push the new tag to the GitHub repository.
   ```
   # Push the specific tag to origin
   git push origin v1.1.0

   ```

You can monitor the progress in **[Actions](https://github.com/milesmfe/racing-game/actions)**. Once the action is complete, the changes will be live on the server.

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
│   │   ├── services/    # Client-side networking logic (Network.ts)
│   │   ├── layout/      # Custom UI widget and grid system
│   │   └── main.ts      # Main Phaser game configuration
│   └── main.tsx         # React entry point to render the Phaser canvas
├── package.json         # Game client dependencies and scripts
└── README.md            # This file

```

## Contributions

This project is still in development, any contributions are welcome and much appreciated!

* Please check the known [issues](https://github.com/milesmfe/racing-game/issues) before opening a pull request.
* Development is currently focussed on improving the UI & UX.

