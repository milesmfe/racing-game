import { Boot } from './scenes/Boot';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { TestGame } from './scenes/TestGame';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#2b6336',
    scene: [
        Boot,
        Preloader,
        TestGame
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
