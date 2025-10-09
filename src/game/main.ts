import { Boot } from './scenes/Boot';
import { AUTO, Game, Scale, Types } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { GameLobby } from './scenes/GameLobby';
import { GameScene } from './scenes/GameScene';
import { GameEndScene } from './scenes/GameEndScene';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#2b6336',
    dom: {
        createContainer: true,
    },
    scale: {
        mode: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            ? Scale.FIT
            : Scale.EXPAND,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [
        Boot,
        Preloader,
        GameLobby,
        GameScene,
        GameEndScene
    ]
};

let game: Game | null = null;

const StartGame = (parent: string) => {
    game = new Game({ ...config, parent });

    return game;
}

export default StartGame;