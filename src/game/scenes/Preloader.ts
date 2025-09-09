import { Scene } from 'phaser';
import { TrackData, TrackSpaceType } from '../TrackData';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // This method is called first. You can use it to prepare data.
    }

    preload ()
    {
        // Load Assets
        this.load.json('track-data', 'assets/track-data.json');
        this.load.image('track', 'assets/track.png');
        this.load.image('penalty-chart', 'assets/penalty-chart.png');
        this.load.image('speed-reduction-chart', 'assets/speed-reduction-chart.png');
        this.load.image('red-car', 'assets/car-red.png');
        this.load.image('purple-car', 'assets/car-purple.png');
        this.load.image('green-car', 'assets/car-green.png');
        this.load.image('yellow-car', 'assets/car-yellow.png');
        this.load.image('orange-car', 'assets/car-orange.png');
        this.load.image('gray-car', 'assets/car-gray.png');

        // Display loading progress
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);
        
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                color: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 - 5,
            text: '0%',
            style: {
                font: '18px monospace',
                color: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);
        
        this.load.on('progress', (value: number) => {
            percentText.setText(Math.round(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }

    create ()
    {
        const trackData: TrackData = this.cache.json.get('track-data');
        const topography = trackData.topography;


        const spinOffPoints: { x: number; y: number }[] = [];
        for (let y = 0; y < topography.length; y++) {
            for (let x = 0; x < topography[y].length; x++) {
                if (topography[y][x] === TrackSpaceType.SPIN_OFF_ZONE) {
                    spinOffPoints.push({ x, y });
                }
            }
        }
        trackData['spinOffPoints'] = spinOffPoints;

        // Start the main game scene
        this.scene.start('GameLobby');
    }
}
