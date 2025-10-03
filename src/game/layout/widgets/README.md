# Phaser Widget System

A clean, type-safe UI widget system for Phaser games.

## Quick Start

```typescript
import { Widget, HitboxWidget } from './widgets';

// Create a basic widget
const widget = new Widget({
    scene: this,
    x: 100,
    y: 100,
    width: 200,
    height: 60,
    layout: 'horizontal'
});

widget.addText('Score:', 16, '#ffffff');
widget.addText('0', 20, '#00ff00');

// Create an interactive widget
const button = new HitboxWidget({
    scene: this,
    x: 300,
    y: 100,
    width: 150,
    height: 50,
    hitRadius: 25
});

button.addText('Click Me', 18, '#ffffff');

// Check for hits
this.input.on('pointerdown', (pointer) => {
    const hit = button.checkHit(pointer.x, pointer.y);
    if (hit) {
        console.log('Button clicked!');
    }
});
```

## Architecture

- **Item.ts**: Abstract base class for all items
- **TextItem.ts**: Text item implementation
- **ImageItem.ts**: Image item implementation
- **WidgetItem.ts**: Allows nesting widgets
- **Widget.ts**: Base widget with layout system
- **HitboxWidget.ts**: Widget with hit detection

## Adding Custom Items

Extend the `Item` class:

```typescript
import { Item } from './widgets';

class CustomItem extends Item {
    constructor(scene: Phaser.Scene) {
        const obj = scene.add.graphics();
        // ... setup your object
        super(obj);
    }

    getObject() { return this.graphics; }
    setPosition(x, y) { this.graphics.setPosition(x, y); }
    getPosition() { return { x: this.graphics.x, y: this.graphics.y }; }
    getWidth() { return 50; }
    getHeight() { return 50; }
}
```
