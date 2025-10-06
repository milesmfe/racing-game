import { Scene } from 'phaser';
import { Network, PlayerInfo } from '../services/Network';
import { EventBus } from '../EventBus';
import { GridContainer } from '../layout/grid';
import { Widget, HitboxWidget, TextItem } from '../layout/widgets';

// ================================================================================================================
// CONSTANTS
// ================================================================================================================

const VIRTUAL = { W: 1920, H: 1080 };

// ================================================================================================================
// TYPE DEFINITIONS
// ================================================================================================================

type LobbyPhase = 'initial' | 'in-room';

// ================================================================================================================
// GAME LOBBY SCENE
// ================================================================================================================

export class GameLobby extends Scene {
    // ================================================================================================================
    // CLASS PROPERTIES
    // ================================================================================================================

    // ---------------------------------
    // State
    // ---------------------------------
    private phase: LobbyPhase = 'initial';
    private roomName: string = '';
    private players: PlayerInfo[] = [];

    // ---------------------------------
    // Networking
    // ---------------------------------
    private network!: Network;

    // ---------------------------------
    // UI Elements
    // ---------------------------------
    private gameContainer!: Phaser.GameObjects.Container;
    private roomListWidget!: Widget;
    private playerListWidget!: Widget;
    private createRoomButton!: HitboxWidget;
    private startGameButton!: HitboxWidget;
    private messageText!: TextItem;

    // ================================================================================================================
    // PHASER SCENE LIFECYCLE
    // ================================================================================================================

    constructor() {
        super('GameLobby');
    }

    create() {
        this.network = new Network();
        this.setupUI();
        this.setupNetworkEvents();

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    }

    shutdown() {
        console.log("GameLobby shutting down.");
        // Clean up all event listeners to prevent memory leaks
        EventBus.off('network-connected', this.handleNetworkConnected, this);
        EventBus.off('network-roomList', this.updateRoomList, this);
        EventBus.off('network-room-created', this.handleRoomCreated, this);
        EventBus.off('network-joined-room', this.handleJoinedRoom, this);
        EventBus.off('network-playerList', this.updatePlayerList, this);
        EventBus.off('game-start', this.handleGameStart, this);
        EventBus.off('network-error', this.handleNetworkError, this);
    }

    // ================================================================================================================
    // UI SETUP
    // ================================================================================================================

    private setupUI(): void {
        this.setupGameContainer();

        const grid = new GridContainer({ scene: this, cols: 1, rows: 4, width: VIRTUAL.W, height: VIRTUAL.H });
        this.gameContainer.add(grid);

        this.createTitle(grid);
        this.createRoomListWidget(grid);
        this.createPlayerListWidget(grid);
        this.createActionWidgets(grid);
        this.createMessageBox(grid);

        this.updateUIForPhase();
    }

    private setupGameContainer(): void {
        this.gameContainer = this.add.container(0, 0);
        this.gameContainer.setSize(VIRTUAL.W, VIRTUAL.H);
        const resizeContainer = () => {
            const { width, height } = this.scale.gameSize;
            const scale = Math.min(width / VIRTUAL.W, height / VIRTUAL.H);
            this.gameContainer.setScale(scale);
            this.gameContainer.x = (width - VIRTUAL.W * scale) / 2;
            this.gameContainer.y = (height - VIRTUAL.H * scale) / 2;
        };
        resizeContainer();
        this.scale.on('resize', resizeContainer);
    }

    private createTitle(grid: GridContainer): void {
        const titleWidget = new Widget({ scene: this, width: VIRTUAL.W, height: VIRTUAL.H / 6, backgroundAlpha: 0 });
        titleWidget.addText("Formula One", 64, '#ffffff');
        grid.addItem(titleWidget.getContainer(), { col: 0, row: 0 });
    }

    private createRoomListWidget(grid: GridContainer): void {
        // Row 1: full-width room list
        this.roomListWidget = new Widget({
            scene: this,
            width: Math.round(VIRTUAL.W * 0.9),
            height: Math.round(VIRTUAL.H * 0.38),
            cornerRadius: 20,
            layout: 'vertical',
            padding: 16
        });
        this.roomListWidget.addText("Available Rooms", 32, '#ffffff');
        grid.addItem(this.roomListWidget.getContainer(), { col: 0, row: 1 });
    }

    private createPlayerListWidget(grid: GridContainer): void {
        // Row 2: full-width player list (visible only when in-room)
        this.playerListWidget = new Widget({
            scene: this,
            width: Math.round(VIRTUAL.W * 0.9),
            height: Math.round(VIRTUAL.H * 0.22),
            cornerRadius: 20,
            layout: 'vertical',
            padding: 12
        });
        this.playerListWidget.addText("Players in Room", 32, '#ffffff');
        grid.addItem(this.playerListWidget.getContainer(), { col: 0, row: 1 });
    }

    private createActionWidgets(grid: GridContainer): void {
        // Create Room button
        this.createRoomButton = new HitboxWidget({ scene: this, width: 300, height: 80, cornerRadius: 15 });
        this.createRoomButton.addText('Create Room', 28, '#ffffff');
        this.createRoomButton.onClick(() => this.handleCreateRoom());
        grid.addItem(this.createRoomButton.getContainer(), { col: 0, row: 2 });

        // Start Game button
        this.startGameButton = new HitboxWidget({ scene: this, width: 300, height: 80, cornerRadius: 15 });
        this.startGameButton.addText('Start Game', 28, '#ffffff');
        this.startGameButton.onClick(() => this.handleStartGame());
        grid.addItem(this.startGameButton.getContainer(), { col: 0, row: 2 });
    }

    private createMessageBox(grid: GridContainer): void {
        const messageBox = new Widget({
            scene: this,
            width: Math.round(VIRTUAL.W * 0.9),
            height: Math.round(VIRTUAL.H * 0.08),
            layout: 'horizontal',
            padding: 8,
            backgroundAlpha: 0
        });
        this.messageText = messageBox.addText("Connecting to server...", 24, '#ffff00');
        messageBox.getContainer().setDepth(99);
        grid.addItem(messageBox.getContainer(), { col: 0, row: 3 });
    }

    private updateUIForPhase(): void {
        // Room list visible only before joining/creating a room
        this.roomListWidget.getContainer().setVisible(this.phase === 'initial');

        // Player list visible when in a room
        this.playerListWidget.getContainer().setVisible(this.phase === 'in-room');

        // Buttons visibility controlled by phase and host status
        this.createRoomButton.getContainer().setVisible(this.phase === 'initial');
        this.startGameButton.getContainer().setVisible(this.phase === 'in-room' && this.network?.isHost === true);
    }

    // ================================================================================================================
    // NETWORK EVENT HANDLING
    // ================================================================================================================

    private setupNetworkEvents(): void {
        EventBus.on('network-connected', this.handleNetworkConnected, this);
        EventBus.on('network-roomList', this.updateRoomList, this);
        EventBus.on('network-room-created', this.handleRoomCreated, this);
        EventBus.on('network-joined-room', this.handleJoinedRoom, this);
        EventBus.on('network-playerList', this.updatePlayerList, this);
        EventBus.on('game-start', this.handleGameStart, this);
        EventBus.on('network-error', this.handleNetworkError, this);
    }

    private handleNetworkConnected(): void {
        this.messageText.setText('Successfully connected. Create or join a room.');
    }

    private updateRoomList(rooms: { name: string, playerCount: number }[]): void {
        if (this.phase !== 'initial') return;

        this.roomListWidget.removeAllItems();
        this.roomListWidget.addText("Available Rooms", 32, '#ffffff');

        if (rooms.length === 0) {
            this.roomListWidget.addText("No rooms available. Why not create one?", 20, '#cccccc');
        } else {
            rooms.forEach(room => {
                const roomItem = new HitboxWidget({ scene: this, width: 560, height: 60, cornerRadius: 10, layout: 'horizontal', padding: 15, backgroundAlpha: 0.3 });
                roomItem.addText(`${room.name}`, 24, '#ffffff');
                roomItem.addText(`(${room.playerCount}/6)`, 20, '#aaffaa');
                roomItem.onClick(() => this.handleJoinRoom(room.name));
                this.roomListWidget.addWidget(roomItem);
            });
        }
    }

    private handleRoomCreated(data: { roomName: string, players: { [id: string]: PlayerInfo } }): void {
        this.roomName = data.roomName;
        this.phase = 'in-room';
        this.messageText.setText(`You are the host of room: ${this.roomName}`);
        this.updateUIForPhase();
    }

    private handleJoinedRoom(data: { roomName: string }): void {
        this.roomName = data.roomName;
        this.phase = 'in-room';
        this.messageText.setText(`You have joined room: ${this.roomName}`);
        this.updateUIForPhase();
    }

    private updatePlayerList(players: PlayerInfo[]): void {
        this.players = players;
        if (this.phase !== 'in-room') return;

        this.playerListWidget.removeAllItems();
        this.playerListWidget.addText("Players in Room", 32, '#ffffff');

        this.players.forEach((player, index) => {
            const playerItem = new Widget({ scene: this, width: 560, height: 50, cornerRadius: 10, layout: 'horizontal', padding: 15, backgroundAlpha: 0.2 });
            const isHost = index === 0;
            const playerName = `Player ${index + 1}` + (player.id === this.network.localPlayerId ? ' (You)' : '') + (isHost ? ' [Host]' : '');
            playerItem.addText(playerName, 22, isHost ? '#ffff00' : '#ffffff');
            this.playerListWidget.addWidget(playerItem);
        });
    }

    private handleGameStart(data: { network: Network, players: { [id: string]: PlayerInfo } }): void {
        this.scene.start('GameScene', data);
    }

    private handleNetworkError(message: string): void {
        this.messageText.setText(`Error: ${message}`);
        this.phase = 'initial';
        this.updateUIForPhase();
    }

    // ================================================================================================================
    // USER INTERACTION
    // ================================================================================================================

    private handleCreateRoom(): void {
        const roomName = prompt("Enter a name for your room:");
        if (roomName) {
            this.network.createRoom(roomName, true);
        }
    }

    private handleJoinRoom(roomName: string): void {
        this.network.joinRoom(roomName);
    }

    private handleStartGame(): void {
        if (this.network.isHost) {
            this.network.startGame(this.roomName);
        }
    }
}