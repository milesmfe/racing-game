import { Boot } from './scenes/Boot';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { GameLobby } from './scenes/GameLobby';
import { GameScene } from './scenes/GameScene';
import { GameEndScene } from './scenes/GameEndScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#2b6336',
    dom: {
        createContainer: true,
    },
    scene: [
        Boot,
        Preloader,
        GameLobby,
        GameScene,
        GameEndScene
    ]
};

let game: Phaser.Game | null = null;

const StartGame = (parent: string) => {
    game = new Game({ ...config, parent });

    // Add resize event listener
    window.addEventListener('resize', () => {
        if (game) {
            game.scale.resize(window.innerWidth, window.innerHeight);
        }
    });

    return game;
}

export default StartGame;
