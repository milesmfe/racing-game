import { Scene } from 'phaser';
import { Player } from '../Player';
import { GameSetup } from '../GameSetup';
import { Widget, HitboxWidget, WidgetItem, TextItem } from '../layout/widgets'; // Assuming TextItem is exported

type Phase = 'add' | 'roll' | 'done';

const CONFIG = {
    MAX_PLAYERS: 6,
    VIRTUAL_DIMENSIONS: { W: 1920, H: 1080 },
    PLAYER_BOX: { W: 160, H: 220 },
    CAR_SCALE: 0.05,
    TWEENS: {
        BUTTON_CLICK: { scale: 0.95, duration: 80, yoyo: true }
    },
    PALETTE: {
        CARS: ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'],
    }
};

export class GameLobby extends Scene {
    private players: Player[] = [];
    private numLaps = 3;
    private phase: Phase = 'add';
    private rollIndex = 0;

    private rootWidget!: Widget;
    private playerWidget!: Widget;

    // References to the currently active UI items that need to be cleared
    private activePromptItem: TextItem | null = null;
    private activeButtonItem: WidgetItem | null = null;

    constructor() {
        super({ key: 'GameLobby' });
    }

    create() {
        this.reset();
        this.setupUI();
        this.updateUI();
        this.scale.on('resize', this.onResize, this);
        this.onResize();
    }

    //region State Management
    private reset() {
        this.players = [];
        this.phase = 'add';
        this.rollIndex = 0;
    }

    private findNextAvailableId(): number {
        const existingIds = new Set(this.players.map(p => p.id));
        let nextId = 0;
        while (existingIds.has(nextId)) { nextId++; }
        return nextId;
    }

    private handleAddPlayer = () => {
        if (this.players.length >= CONFIG.MAX_PLAYERS) return;
        const newId = this.findNextAvailableId();
        const player = new Player(newId);
        player.name = `Player ${newId + 1}`;
        this.players.push(player);
        this.updateUI();
    };

    private handleRemovePlayer = (playerId: number) => {
        let updatedPlayers = this.players.filter(p => p.id !== playerId);
        updatedPlayers.forEach((player, index) => {
            player.id = index;
            player.name = `Player ${index + 1}`;
        });
        this.players = updatedPlayers;
        this.updateUI();
    };

    private handleRollForPosition = () => {
        if (this.players.length < 2) return;
        this.phase = 'roll';
        this.updateUI();
    };

    private handleRollDice = () => {
        const roll = Phaser.Math.Between(1, 6) + Phaser.Math.Between(1, 6);
        this.players[this.rollIndex].roll = roll;
        this.rollIndex++;
        if (this.rollIndex >= this.players.length) {
            this.assignStartOrder();
            this.phase = 'done';
        }
        this.updateUI();
    };

    private handleStartGame = () => {
        if (this.phase !== 'done' || this.players.length === 0) return;
        const gameSetup: GameSetup = { numLaps: this.numLaps, players: this.players };
        this.scene.start('GameScene', gameSetup);
    };

    private assignStartOrder() {
        const sortedPlayers = [...this.players].sort((a, b) => (b.roll ?? 0) - (a.roll ?? 0));
        sortedPlayers.forEach((player, index) => { player.rollOrder = index; });
    }
    //endregion

    //region UI Management
    private setupUI() {
        const { W, H } = CONFIG.VIRTUAL_DIMENSIONS;

        this.rootWidget = new Widget({
            scene: this,
            width: W, height: H,
            layout: 'vertical',
            padding: 50,
            backgroundAlpha: 0
        });

        // Add placeholders that will be replaced by updateUI
        this.rootWidget.addText('Lobby', 50, '#ffffff');

        const playerWidgetWidth = (CONFIG.PLAYER_BOX.W + 20) * CONFIG.MAX_PLAYERS;
        this.playerWidget = new Widget({
            scene: this,
            width: playerWidgetWidth,
            height: CONFIG.PLAYER_BOX.H + 20,
            layout: 'horizontal',
            backgroundAlpha: 0
        });
        this.rootWidget.addItem(new WidgetItem(this.playerWidget));
    }

    private updateUI() {
        this.rebuildPlayerWidget();

        // Clear previous phase-specific controls
        if (this.activePromptItem) {
            this.rootWidget.removeItem(this.activePromptItem);
            this.activePromptItem.getObject().destroy();
            this.activePromptItem = null;
        }
        if (this.activeButtonItem) {
            this.rootWidget.removeItem(this.activeButtonItem);
            (this.activeButtonItem.getWidget() as HitboxWidget).destroy();
            this.activeButtonItem = null;
        }

        let button: HitboxWidget | null = null;

        // Create and add the controls for the current phase
        switch (this.phase) {
            case 'add':
                this.activePromptItem = this.rootWidget.addText('Select the number of players', 35, '#ffffff');
                button = this.createButton({ width: 320, height: 56, text: 'Roll for Position', bgColor: 0xffa500, textColor: '#222' }, this.handleRollForPosition);
                button.setEnabled(this.players.length >= 2);
                break;
            case 'roll':
                if (this.players[this.rollIndex]) {
                    const name = this.players[this.rollIndex].name;
                    this.activePromptItem = this.rootWidget.addText(`${name}: Roll two dice`, 35, '#ffffff');
                }
                button = this.createButton({ width: 170, height: 50, text: 'Roll' }, this.handleRollDice);
                break;
            case 'done':
                if (this.players.length > 0) {
                    this.activePromptItem = this.rootWidget.addText('All players have rolled!', 35, '#ffffff');
                    button = this.createButton({ width: 260, height: 56, text: 'Start Game', bgColor: 0x00b050 }, this.handleStartGame);
                }
                break;
        }

        if (button) {
            this.activeButtonItem = this.rootWidget.addItem(new WidgetItem(button)) as WidgetItem;
        }
    }

    private rebuildPlayerWidget() {
        this.playerWidget.removeAllItems();
        this.players.forEach((player, i) => {
            const box = this.makePlayerBox(player, i);
            this.playerWidget.addItem(new WidgetItem(box));
        });
        if (this.phase === 'add' && this.players.length < CONFIG.MAX_PLAYERS) {
            const addBox = this.makeAddBox();
            this.playerWidget.addItem(new WidgetItem(addBox));
        }
    }

    private makePlayerBox(player: Player, index: number): Widget {
        const box = new Widget({ scene: this, width: CONFIG.PLAYER_BOX.W, height: CONFIG.PLAYER_BOX.H, layout: 'vertical', padding: 12 });
        let nameText = player.name;
        if (this.phase !== 'add' && typeof player.roll === 'number') {
            nameText += `\nRoll: ${player.roll}`;
        }
        box.addText(nameText, 18, '#ffffff');
        const carKey = CONFIG.PALETTE.CARS[player.rollOrder ?? index % CONFIG.PALETTE.CARS.length];
        if (this.textures.exists(carKey)) {
            box.addImage(carKey, CONFIG.CAR_SCALE);
        }
        if (this.phase === 'add') {
            const removeBtn = this.createButton({ width: 100, height: 34, text: 'Remove', bgColor: 0xb00, fontSize: 14 }, () => {
                this.tweens.add({
                    targets: box.getContainer(), scale: 0, alpha: 0, duration: 180, ease: 'Back.In',
                    onComplete: () => this.handleRemovePlayer(player.id)
                });
            });
            box.addItem(new WidgetItem(removeBtn));
        }
        return box;
    }

    private makeAddBox(): Widget {
        const box = new Widget({ scene: this, width: CONFIG.PLAYER_BOX.W, height: CONFIG.PLAYER_BOX.H, layout: 'vertical', padding: 8 });
        box.addText('Add Player', 20, '#ffffff');
        const addBtn = this.createButton({ width: 90, height: 90, text: '+', fontSize: 44, textColor: '#222' }, this.handleAddPlayer);
        box.addItem(new WidgetItem(addBtn));
        return box;
    }

    private createButton(opts: any, onClick: () => void): HitboxWidget {
        const btn = new HitboxWidget({ scene: this, width: opts.width, height: opts.height, backgroundColor: opts.bgColor });
        btn.addText(opts.text, opts.fontSize ?? 22, opts.textColor ?? '#fff');
        btn.onClick(() => {
            this.tweens.add({ targets: btn.getContainer(), ...CONFIG.TWEENS.BUTTON_CLICK });
            onClick();
        });
        return btn;
    }

    private onResize = () => {
        const rootContainer = this.rootWidget.getContainer();
        const { width, height } = this.scale;
        const { W, H } = CONFIG.VIRTUAL_DIMENSIONS;
        const scale = Math.min(width / W, height / H);
        rootContainer.setScale(scale);
        rootContainer.setPosition((width - W * scale) / 2, (height - H * scale) / 2);
    };
    //endregion
}