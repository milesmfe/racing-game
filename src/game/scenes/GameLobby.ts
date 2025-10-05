import { Scene } from 'phaser';
import { Player } from '../Player';
import { Widget, HitboxWidget, WidgetItem, TextItem, Item } from '../layout/widgets';
import { Network, PlayerInfo } from '../services/Network';
import { EventBus } from '../EventBus';


const CONFIG = {
    MAX_PLAYERS: 6,
    VIRTUAL_DIMENSIONS: { W: 1920, H: 1080 },
    PLAYER_BOX: { W: 160, H: 220 },
    CAR_SCALE: 0.05,
    PALETTE: {
        CARS: ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'],
    }
};

type LobbyPhase = 'network' | 'room';

export class GameLobby extends Scene {
    // Local State
    private rootWidget!: Widget;
    private playerWidget!: Widget;

    // Multiplayer State
    private network!: Network;
    private lobbyPhase: LobbyPhase = 'network';
    private players: PlayerInfo[] = [];
    private roomName: string = '';
    private hostId: string | null = null;

    // UI Elements
    private networkContainer!: Widget;
    private roomContainer!: Widget;
    private roomListText!: TextItem;
    private statusText!: TextItem;
    private domElements: Phaser.GameObjects.DOMElement[] = [];

    constructor() {
        super({ key: 'GameLobby' });
    }

    create() {
        this.network = new Network();
        this.setupUI();
        this.setupNetworkEvents();
        this.scale.on('resize', this.onResize, this);
        this.onResize();
        this.updateUI();

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    }

    shutdown() {
        console.log("GameLobby shutting down.");
        // Clean up event listeners and DOM elements to prevent memory leaks
        EventBus.off('network-roomList', this.handleRoomListUpdate, this);
        EventBus.off('network-playerList', this.handlePlayerListUpdate, this);
        EventBus.off('network-room-created', this.handleRoomCreated, this);
        EventBus.off('network-joined-room', this.handleJoinedRoom, this);
        EventBus.off('network-error', this.handleNetworkError, this);
        EventBus.off('game-start', this.handleGameStart, this);

        this.clearDOM();
    }

    private setupUI() {
        const { W, H } = CONFIG.VIRTUAL_DIMENSIONS;

        this.rootWidget = new Widget({
            scene: this,
            width: W, height: H,
            layout: 'vertical',
            padding: 50,
            backgroundAlpha: 0
        });

        this.rootWidget.addText('Formula One - Multiplayer', 50, '#ffffff');

        this.statusText = this.rootWidget.addText('Connecting to server...', 24, '#ffff00');

        // Container for Create/Join UI
        this.networkContainer = new Widget({ scene: this, width: W * 0.8, height: H * 0.6, layout: 'horizontal', backgroundAlpha: 0 });
        this.rootWidget.addItem(new WidgetItem(this.networkContainer));

        // Container for in-room UI
        this.roomContainer = new Widget({ scene: this, width: W * 0.8, height: H * 0.7, layout: 'vertical', backgroundAlpha: 0 });
        this.rootWidget.addItem(new WidgetItem(this.roomContainer));
    }

    private updateUI() {
        this.clearDOM();
        this.networkContainer.getContainer().setVisible(this.lobbyPhase === 'network');
        this.roomContainer.getContainer().setVisible(this.lobbyPhase === 'room');

        if (this.lobbyPhase === 'network') {
            this.buildNetworkUI();
        } else {
            this.buildRoomUI();
        }
    }

    private buildNetworkUI() {
        const { W, H } = CONFIG.VIRTUAL_DIMENSIONS;
        this.networkContainer.removeAllItems();

        // Left side: Room list
        const roomListWidget = new Widget({ scene: this, width: (W * 0.8) / 2, height: H * 0.6, layout: 'vertical', padding: 20 });
        this.roomListText = roomListWidget.addText('Available Rooms:', 28, '#ffffff');
        this.networkContainer.addItem(new WidgetItem(roomListWidget));

        // Right side: Create room
        const createRoomWidget = new Widget({ scene: this, width: (W * 0.8) / 2, height: H * 0.6, layout: 'vertical', padding: 20 });
        createRoomWidget.addText('Create a New Game', 32, '#ffffff');

        const domInput = this.add.dom(0, 100).createFromHTML('<input type="text" id="roomNameInput" placeholder="Enter Room Name" style="width: 300px; padding: 10px; font-size: 18px;">');
        this.domElements.push(domInput);
        createRoomWidget.getContainer().add(domInput);

        const isHostPlayerCheckbox = this.add.dom(0, 150).createFromHTML('<label style="color:white; font-size: 18px;"><input type="checkbox" id="isHostPlayer" checked> Join as Player</label>');
        this.domElements.push(isHostPlayerCheckbox);
        createRoomWidget.getContainer().add(isHostPlayerCheckbox);

        const createButton = new HitboxWidget({ scene: this, width: 320, height: 56, backgroundColor: 0x00b050 });
        createButton.addText('Create Room', 22, '#fff');
        createButton.onClick(() => {
            const roomNameInput = document.getElementById('roomNameInput') as HTMLInputElement;
            const isHostPlayerInput = document.getElementById('isHostPlayer') as HTMLInputElement;
            if (roomNameInput && roomNameInput.value) {
                this.network.createRoom(roomNameInput.value, isHostPlayerInput.checked);
            }
        });
        const createButtonItem = new WidgetItem(createButton);
        createRoomWidget.addItem(createButtonItem);
        this.networkContainer.addItem(new WidgetItem(createRoomWidget));
    }

    private buildRoomUI() {
        this.roomContainer.removeAllItems();
        this.roomContainer.addText(`Room: ${this.roomName}`, 40, '#ffffff');

        const playerWidgetWidth = (CONFIG.PLAYER_BOX.W + 20) * CONFIG.MAX_PLAYERS;
        this.playerWidget = new Widget({
            scene: this,
            width: playerWidgetWidth,
            height: CONFIG.PLAYER_BOX.H + 20,
            layout: 'horizontal',
            backgroundAlpha: 0
        });
        this.rebuildPlayerWidget();
        this.roomContainer.addItem(new WidgetItem(this.playerWidget));

        if (this.network.isHost) {
            const startButton = new HitboxWidget({ scene: this, width: 320, height: 56, backgroundColor: 0x00b050 });
            startButton.addText('Start Game', 22, '#fff');
            startButton.onClick(this.handleStartGame);
            startButton.setEnabled(this.players.length > 0);
            this.roomContainer.addItem(new WidgetItem(startButton));
        } else {
            this.roomContainer.addText('Waiting for host to start the game...', 28, '#ffff00');
        }
    }

    private setupNetworkEvents() {
        EventBus.on('network-roomList', this.handleRoomListUpdate, this);
        EventBus.on('network-playerList', this.handlePlayerListUpdate, this);
        EventBus.on('network-room-created', this.handleRoomCreated, this);
        EventBus.on('network-joined-room', this.handleJoinedRoom, this);
        EventBus.on('network-error', this.handleNetworkError, this);
        EventBus.on('game-start', this.handleGameStart, this);
    }

    // --- Event Handlers ---
    private handleRoomListUpdate(rooms: { name: string, playerCount: number }[]) {
        if (!this.scene.isActive()) return;
        this.updateRoomList(rooms);
        if (this.statusText.getObject().text === 'Connecting to server...') {
            this.statusText.setText('Connected!');
            this.time.delayedCall(2000, () => {
                if (this.statusText.getObject()?.scene) this.statusText.getObject().setVisible(false);
            });
        }
    }

    private handlePlayerListUpdate(players: PlayerInfo[]) {
        if (!this.scene.isActive()) return;
        this.players = players;
        if (this.lobbyPhase === 'room') {
            this.rebuildPlayerWidget();
            const startButtonItem = this.roomContainer.getItems().find(item => (item instanceof WidgetItem) && item.getWidget() instanceof HitboxWidget);
            if (this.network.isHost && startButtonItem) {
                const startButton = (startButtonItem as WidgetItem).getWidget() as HitboxWidget;
                const racingPlayersCount = this.players.filter(p => p.isPlayer).length;
                startButton.setEnabled(racingPlayersCount > 0);
            }
        }
    }

    private handleRoomCreated({ roomName, players }: { roomName: string, players: { [id: string]: PlayerInfo } }) {
        if (!this.scene.isActive()) return;
        this.roomName = roomName;
        this.hostId = this.network.localPlayerId;
        this.players = Object.values(players);
        this.lobbyPhase = 'room';
        this.updateUI();
    }

    private handleJoinedRoom({ roomName, hostId, players }: { roomName: string, hostId: string, players: { [id: string]: PlayerInfo } }) {
        if (!this.scene.isActive()) return;
        this.roomName = roomName;
        this.hostId = hostId;
        this.players = Object.values(players);
        this.lobbyPhase = 'room';
        this.updateUI();
    }

    private handleNetworkError(message: string) {
        if (!this.scene.isActive()) return;
        this.statusText.setText(`Error: ${message}`);
        this.statusText.getObject().setColor('#ff0000').setVisible(true);
        this.time.delayedCall(5000, () => {
            if (this.statusText.getObject()?.scene) this.statusText.getObject().setVisible(false);
        });
    }

    private handleGameStart(data: { network: Network, players: { [id: string]: PlayerInfo } }) {
        if (!this.scene.isActive()) return;
        console.log("Received 'game-start' event. Starting GameScene...");
        this.scene.start('GameScene', data);
    }
    // ----------------------


    private updateRoomList(rooms: { name: string, playerCount: number }[]) {
        if (!this.roomListText || !this.roomListText.getObject().scene) return;

        let roomDisplay = 'Available Rooms:\n\n';
        if (rooms.length === 0) {
            roomDisplay += '- No rooms available -';
        }
        this.roomListText.setText(roomDisplay);

        const networkContainerItems = this.networkContainer.getItems();
        if (networkContainerItems.length < 1 || !(networkContainerItems[0] instanceof WidgetItem)) return;
        const roomListWidget = networkContainerItems[0].getWidget();
        if (!roomListWidget) return;

        // Clear old buttons
        const oldButtons = roomListWidget.getItems().filter((item: Item): item is WidgetItem =>
            item instanceof WidgetItem && item.getWidget() instanceof HitboxWidget
        );
        oldButtons.forEach((b: WidgetItem) => {
            roomListWidget.removeItem(b);
            b.getWidget()?.destroy();
        });

        rooms.forEach(room => {
            const joinButton = new HitboxWidget({ scene: this, width: 300, height: 40, backgroundColor: 0x0099ff });
            joinButton.addText(`Join ${room.name} (${room.playerCount}/${CONFIG.MAX_PLAYERS})`, 18, '#fff');
            joinButton.onClick(() => this.network.joinRoom(room.name));
            roomListWidget.addItem(new WidgetItem(joinButton));
        });
    }

    private rebuildPlayerWidget() {
        if (!this.playerWidget) return;
        this.playerWidget.removeAllItems();

        const racingPlayers = this.players.filter(p => p.isPlayer);

        racingPlayers.forEach((playerInfo, i) => {
            // Create a mock Player object for UI purposes
            const player = new Player(i);
            player.name = `Player ${i + 1}`;

            if (playerInfo.id === this.hostId) {
                player.name += ' (Host)';
            }
            if (playerInfo.id === this.network.localPlayerId) {
                player.name += ' (You)';
            }

            const box = this.makePlayerBox(player, i);
            this.playerWidget.addItem(new WidgetItem(box));
        });
    }

    private makePlayerBox(player: Player, index: number): Widget {
        const box = new Widget({ scene: this, width: CONFIG.PLAYER_BOX.W, height: CONFIG.PLAYER_BOX.H, layout: 'vertical', padding: 12 });
        box.addText(player.name, 18, '#ffffff');
        const carKey = CONFIG.PALETTE.CARS[index % CONFIG.PALETTE.CARS.length];
        if (this.textures.exists(carKey)) {
            box.addImage(carKey, CONFIG.CAR_SCALE);
        }
        return box;
    }

    private handleStartGame = () => {
        if (this.lobbyPhase !== 'room' || !this.network.isHost) return;

        const racingPlayers = this.players.filter(p => p.isPlayer);
        if (racingPlayers.length === 0) {
            this.statusText.setText("Cannot start without any racers.");
            this.statusText.getObject().setColor('#ffaa00').setVisible(true);
            this.time.delayedCall(3000, () => {
                if (this.statusText.getObject()?.scene) this.statusText.getObject().setVisible(false);
            });
            return;
        };

        this.network.startGame(this.roomName);
    };

    private clearDOM() {
        this.domElements.forEach(el => el.destroy());
        this.domElements = [];
    }

    private onResize = () => {
        const rootContainer = this.rootWidget.getContainer();
        const { width, height } = this.scale;
        const { W, H } = CONFIG.VIRTUAL_DIMENSIONS;
        const scale = Math.min(width / W, height / H);
        rootContainer.setScale(scale);
        rootContainer.setPosition((width - W * scale) / 2, (height - H * scale) / 2);
    };
}

