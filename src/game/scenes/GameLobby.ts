import { Scene, GameObjects } from 'phaser';
import { Player } from '../Player';
import { GameSetup } from '../GameSetup';

type Phase = 'add' | 'roll' | 'done';

const MAX_PLAYERS = 6;
// TODO: make laps configurable
// const MIN_LAPS = 3;
// const MAX_LAPS = 10;
const VIRTUAL = { W: 1920, H: 1080 };
const BOX = { W: 160, H: 220, PAD: 24, ROW_Y: 260 };

interface ButtonOpts {
    fontSize?: string;
    width?: number;
    height?: number;
    enabled?: boolean;
}

export class GameLobby extends Scene {
    private players: Player[] = [];
    private numLaps = 3;
    private nextId = 1;

    private phase: Phase = 'add';
    private rollIndex = 0;

    private root!: GameObjects.Container;

    constructor() {
        super({ key: 'GameLobby' });
    }

    create() {
        this.reset();
        this.root = this.add.container(0, 0);
        this.buildUI();
        this.scale.on('resize', this.onResize, this);
        this.onResize();
    }

    private reset() {
        this.players = [];
        this.nextId = 1;
        this.phase = 'add';
        this.rollIndex = 0;
    }

    private buildUI() {
        this.root.removeAll(true);

        // Title
        const title = this.add.text(VIRTUAL.W / 2, 80, 'Lobby', { fontSize: '42px', color: '#ffffff' })
            .setOrigin(0.5);
        this.root.add(title);

        // Player row
        this.root.add(this.makePlayerRow());

        // Roll controls + start button area
        this.root.add(this.makeControls());
    }

    private makePlayerRow(): GameObjects.Container {
        const displayCount = (this.phase === 'add' && this.players.length < MAX_PLAYERS)
            ? this.players.length + 1
            : this.players.length;

        const totalW = displayCount * BOX.W + Math.max(0, displayCount - 1) * BOX.PAD;
        const startX = -totalW / 2 + BOX.W / 2;

        const boxes: GameObjects.GameObject[] = [];

        this.players.forEach((p, i) => {
            const box = this.makePlayerBox(p, i);
            box.x = startX + i * (BOX.W + BOX.PAD);
            box.y = 0;
            boxes.push(box);
        });

        if (this.phase === 'add' && this.players.length < MAX_PLAYERS) {
            const addBox = this.makeAddBox();
            addBox.x = startX + this.players.length * (BOX.W + BOX.PAD);
            addBox.y = 0;
            boxes.push(addBox);
        }

        const container = this.add.container(VIRTUAL.W / 2, BOX.ROW_Y, boxes);
        return container;
    }

    private makePlayerBox(player: Player, index: number): GameObjects.Container {
        const c = this.add.container(0, 0);
        const rect = this.add.rectangle(0, 0, BOX.W, BOX.H, 0x222222, 0.7)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff, 0.15);
        c.add(rect);

        // Layout constants
        const padTop = 14;
        const padBottom = 12;
        const interGap = 8;
        const removeBtnHeight = 34;

        // Label at the top
        const labelY = -BOX.H / 2 + padTop;
        let text = player.name;
        if (this.phase !== 'add' && typeof player.roll === 'number') text += `\nRoll: ${player.roll}`;

        const label = this.add.text(0, labelY, text, {
            fontSize: '18px',
            color: '#fff',
            align: 'center',
            wordWrap: { width: BOX.W - 24 }
        }).setOrigin(0.5, 0);
        c.add(label);

        // Compute available vertical space for the car
        const labelBottom = labelY + label.height;
        const hasRemove = this.phase === 'add';
        const buttonCenterY = BOX.H / 2 - padBottom - (hasRemove ? removeBtnHeight / 2 : 0);
        const availableTop = labelBottom + interGap;
        const availableBottom = hasRemove
            ? (buttonCenterY - removeBtnHeight / 2 - interGap)
            : (BOX.H / 2 - padBottom);
        const carCenterY = (availableTop + availableBottom) / 2;

        // Car image centered in the available area
        const palette = ['yellow-car', 'orange-car', 'green-car', 'red-car', 'gray-car', 'purple-car'];
        const key = palette[player.rollOrder ?? index % palette.length];
        if (this.textures.exists(key)) {
            const img = this.add.image(0, carCenterY, key).setOrigin(0.5);
            const maxSize = Math.min(80, BOX.H - padTop - padBottom - 40); // ensure it fits within the box
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            img.setScale(scale);
            c.add(img);
        }

        // Remove button anchored to bottom (if in add phase)
        if (hasRemove) {
            const removeY = BOX.H / 2 - padBottom - removeBtnHeight / 2;
            const remove = this.makeButton('Remove', 0, removeY, 0xb00, '#fff', () => {
                this.tweens.add({
                    targets: c,
                    scale: 0,
                    alpha: 0,
                    duration: 180,
                    ease: 'Back.In',
                    onComplete: () => {
                        this.players = this.players.filter(p_ => p_.id !== player.id);
                        this.buildUI();
                    }
                });
            }, { fontSize: '14px', width: 100, height: removeBtnHeight, enabled: true });
            c.add(remove);
        }

        return c;
    }

    private makeAddBox(): GameObjects.Container {
        const c = this.add.container(0, 0);
        const rect = this.add.rectangle(0, 0, BOX.W, BOX.H, 0x1f1f1f, 0.35)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff, 0.1);
        c.add(rect);

        const addBtn = this.makeButton('+', 0, 0, 0xeeeeee, '#222', () => {
            if (this.players.length < MAX_PLAYERS) {
                const player = new Player(this.nextId++ - 1);
                player.name = `Player ${this.nextId - 1}`;
                this.players.push(player);
                this.buildUI();
            }
        }, { fontSize: '44px', width: 90, height: 90, enabled: true });

        c.add(addBtn);
        return c;
    }

    private makeControls(): GameObjects.Container {
        const c = this.add.container(0, 0);

        const baseY = BOX.ROW_Y + BOX.H / 2 + 100;

        if (this.phase === 'add') {
            const enabled = this.players.length >= 2;
            const btn = this.makeButton('Roll for Position', VIRTUAL.W / 2, baseY, 0xffa500, '#222',
                () => {
                    if (!enabled) return;
                    this.phase = 'roll';
                    this.rollIndex = 0;
                    this.buildUI();
                }, { fontSize: '22px', width: 320, height: 56, enabled });
            btn.setAlpha(0);
            this.tweens.add({ targets: btn, alpha: 1, duration: 220 });
            c.add(btn);
        }

        if (this.phase === 'roll') {
            const yBase = BOX.ROW_Y + BOX.H + 60;
            const centerX = VIRTUAL.W / 2;
            if (this.rollIndex < this.players.length) {
                const current = this.players[this.rollIndex];
                const name = current.name;
                // keep the prompt just above the Roll-for-Position location
                const prompt = this.add.text(centerX, baseY - 50, `${name}: Roll two dice`, { fontSize: '22px', color: '#fff' }).setOrigin(0.5);
                const rollBtn = this.makeButton('Roll', VIRTUAL.W / 2, baseY, 0xeeeeee, '#222', () => {
                    const roll = Phaser.Math.Between(1, 6) + Phaser.Math.Between(1, 6);
                    this.players[this.rollIndex].roll = roll;
                    this.rollIndex++;
                    if (this.rollIndex >= this.players.length) {
                        this.assignStartOrder();
                        this.phase = 'done';
                    }
                    this.buildUI();
                }, { fontSize: '22px', width: 170, height: 50, enabled: true });

                prompt.setAlpha(0);
                rollBtn.setAlpha(0);
                c.add(prompt);
                c.add(rollBtn);
                this.tweens.add({ targets: [prompt, rollBtn], alpha: 1, duration: 220 });
            } else {
                const doneText = this.add.text(centerX, yBase, `All players have rolled.`, { fontSize: '22px', color: '#fff' }).setOrigin(0.5);
                doneText.setAlpha(0);
                c.add(doneText);
                this.tweens.add({ targets: doneText, alpha: 1, duration: 220 });
            }
        }

        const startEnabled = (this.phase === 'roll' && this.rollIndex >= this.players.length) || (this.phase === 'done' && this.players.length > 0);
        const startBtn = this.makeButton('Start Game', VIRTUAL.W / 2, baseY + 80, 0x00b050, '#fff',
            () => {
                if (!startEnabled) return;
                const gameSetup: GameSetup = {
                    numLaps: this.numLaps,
                    players: this.players
                };
                this.scene.start('GameScene', gameSetup);
            }, { fontSize: '22px', width: 260, height: 56, enabled: startEnabled });
        startBtn.setAlpha(0);
        this.tweens.add({ targets: startBtn, alpha: 1, duration: 220 });
        c.add(startBtn);

        return c;
    }

    private assignStartOrder() {
        const snapshot = this.players.map((p, i) => ({ p, i }));
        snapshot.sort((a, b) => {
            const ra = (a.p.roll ?? -Infinity);
            const rb = (b.p.roll ?? -Infinity);
            if (ra !== rb) return rb - ra;
            return a.i - b.i;
        });
        snapshot.forEach((s, rank) => {
            s.p.rollOrder = rank;
        });
    }

    private makeButton(label: string, x: number, y: number, bgColor: number, textColor: string, onClick: () => void, opts: ButtonOpts = {}): GameObjects.Container {
        const { fontSize = '18px', width = 0, height = 0, enabled = true } = opts;
        const txt = this.add.text(0, 0, label, { fontSize, color: textColor }).setOrigin(0.5);
        const pad = 14;
        const bgW = width > 0 ? width : Math.ceil(txt.width + pad * 2);
        const bgH = height > 0 ? height : Math.ceil(txt.height + pad * 2);

        const bg = this.add.rectangle(0, 0, bgW, bgH, bgColor).setOrigin(0.5);
        const container = this.add.container(x, y, [bg, txt]);

        if (enabled) {
            bg.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.tweens.add({ targets: container, scale: 0.97, duration: 90, yoyo: true });
                    onClick();
                })
                .on('pointerover', () => bg.setScale(1.03))
                .on('pointerout', () => bg.setScale(1));
        } else {
            bg.setAlpha(0.45);
            txt.setAlpha(0.7);
        }

        return container;
    }

    private onResize() {
        if (!this.root) return;
        const scale = Math.min(this.scale.width / VIRTUAL.W, this.scale.height / VIRTUAL.H);
        this.root.setScale(scale);
        this.root.x = (this.scale.width - VIRTUAL.W * scale) / 2;
        this.root.y = (this.scale.height - VIRTUAL.H * scale) / 2;
    }
}