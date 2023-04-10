// Parent class for all images in the game
class GameImage {
    image;
    x = 0;
    y = 0;
    drawWidth;
    drawHeight;
    heightProportion; // Image will be drawn to this proportion of the canvas height
    relativeSpeedX; // Image will move at this speed relative to the scrolling foreground, pixels/frame

    constructor() {
        if(this.constructor === GameImage) throw new Error('Cannot instantiate abstract class');
    }

    setSize() {
        // Scale image proportionally
        let ratio = this.image.width / this.image.height;
        this.drawHeight = Math.floor(this.heightProportion * globals.getCanvasHeight());
        this.drawWidth = Math.floor(this.drawHeight * ratio);
    }

    draw(ctx) {
        this.x -= (globals.getScrollSpeed() + this.relativeSpeedX);
        ctx.drawImage(this.image, this.x, this.y, this.drawWidth, this.drawHeight);
    }
}

// Subclass to instantiate an object for each the background, midground, and foreground
class Scenery extends GameImage {
    heightProportion = 1;
    scrollSpeed; // Scroll speed will be slower for midground and foreground for parallax effect
    numDraws; // Number of times each image must be drawn to cover the entire canvas before wrapping around

    constructor(location, scrollSpeed) {
        super();
        this.image = imageFiles.getImage('scenery', location);
        this.scrollSpeed = scrollSpeed;
        this.setSize();
        this.numDraws = Math.ceil(globals.getCanvasWidth() / this.drawWidth) + 1; 
    }

    draw(ctx) {
        this.x -= this.scrollSpeed;
        if(this.x <= -this.drawWidth) this.x = 0; // Wrap image back at starting point once it has moved offscreen

        // Draw image enough times to cover entire canvas width
        for(let i = 0; i < this.numDraws; i++) {
            ctx.drawImage(this.image, this.x + i * this.drawWidth, this.y, this.drawWidth, this.drawHeight);
        }
    }
}

// Animal subclass includes rabbit and all bird and mammal obstacles
// Each animal is represented by a sprite sheet with various poses
class Animal extends GameImage {
    x = globals.getCanvasWidth();
    heightProportion;
    numPoses; // Number of different positions drawn to represent each action
    poseWidth; // A portion of the sprite sheet
    timePerPose; // Defines how quickly the animal moves through its poses

    constructor() {
        super();
        if(this.constructor === Animal) throw new Error('Cannot instantiate abstract class');
    }

    setSize() {
        this.poseWidth = this.image.width / this.numPoses;

        let ratio = this.poseWidth / this.image.height;

        this.drawHeight = Math.floor(this.heightProportion * globals.getCanvasHeight());
        this.drawWidth = Math.floor(this.drawHeight * ratio);
    }

    draw(time, ctx) {
        this.x -= (globals.getScrollSpeed() + this.relativeSpeedX);

        // Cycle through each pose depending on time from the animation frame, draw the corresponding section of the sprite sheet
        let poseIndex = Math.floor(time / this.timePerPose) % this.numPoses;
        ctx.drawImage(this.image, poseIndex * this.poseWidth, 0, this.poseWidth, this.image.height, this.x, this.y - this.drawHeight, this.drawWidth, this.drawHeight);
    }
}

class Bird extends Animal {
    image = imageFiles.getImage('birds');
    y = Math.floor(Math.random() * globals.getCanvasHeight() / 2); // Spawn at any random height in top half of canvas
    relativeSpeedX = Math.floor(Math.random() * 5) + 1;
    heightProportion = 0.12;
    numPoses = 3;
    timePerPose = 400 / this.relativeSpeedX;

    constructor() {
        super();
        this.setSize();
    }
}

class Mammal extends Animal {
    y = Math.floor(globals.getCanvasHeight() * 0.95); // All mammals move on the same plane
    numPoses = 8;

    constructor() {
        super();
        if(this.constructor === Mammal) throw new Error('Cannot instantiate abstract class');
    }

    static generateMammal() {
        switch(Math.floor(Math.random() * 3)) {
            case 0:
                return new Deer();
            case 1:
                return new Fox();
            case 2:
                return new Wolf();
        }
    }
}

class Rabbit extends Mammal {
    x = Math.floor(globals.getCanvasWidth() * 0.3);
    runY = this.y;
    relativeSpeedX = -globals.getScrollSpeed();
    heightProportion = 0.15;
    timePerPose = -360 / this.relativeSpeedX;

    // Hop properties
    #hopStartTime;
    #ascentTime = 1; // Seconds from hop start to top of parabola
    isLinear; // While click or spacebar is depressed, hop is without downward acceleration
    #maxLinearTime = this.#ascentTime / 3; // Max time hopping without downward acceleration, seconds
    #linearEndTime; // Either max linear time or time when click/spacebar is released, seconds
    #accel; // Downward acceleration (i.e. "gravity"), pixels/second^2
    #v0; // Initial y-velocity of hop, pixels/second

    constructor() {
        super();
        this.run();
        this.setSize();

        // Downward acceleration and initial y-velocity derived such that maximum hop peaks at top of canvas
        this.#accel = 2 * (this.drawHeight - this.runY) / (this.#ascentTime * (this.#maxLinearTime ** 2 - 1));
        this.#v0 = -this.#accel * (this.#ascentTime - this.#maxLinearTime);
    }

    run() {
        this.image = imageFiles.getImage('rabbit', 'run');
        this.numPoses = 6;
        this.draw = super.draw;
    }

    hop() {
        // Can only hop when on the ground
        if(this.y === this.runY) {
            this.image = imageFiles.getImage('rabbit', 'hop');
            this.numPoses = 5;
            this.isLinear = true;
            this.draw = this.#hopDraw;
        }
    }

    idle() {
        this.image = imageFiles.getImage('rabbit', 'idle');
        this.numPoses = 10;
        this.relativeSpeedX = 0;
        this.draw = this.#idleDraw;
    }

    // Axially-aligned boundary box to simplify collision detection
    // Accepts obstacle's hit box xy-coords and dimensions to compare to rabbit
    collDetect(hitBoxX, hitBoxY, hitBoxWidth, hitBoxHeight) {
        return (
                hitBoxX < this.x + this.drawWidth &&
                hitBoxX + hitBoxWidth > this.x &&
                hitBoxY < this.y &&
                hitBoxY + hitBoxHeight > this.y - this.drawHeight
            );
    }

    // Called by bunny.draw() at each animation frame, accepts animation timestamp and canvas context
    #hopDraw(time, ctx) {
        let pose = 1;
        this.#hopStartTime ??= time;
        let timeElapsed = (time - this.#hopStartTime) / 1000;
        
        // If mouse/spacebar is not released before max linear time
        if(timeElapsed > this.#maxLinearTime) this.isLinear = false;
        
        // No downward acceleration during mouse/spacebar press allows user to define how high bunny hops
        // At mouse/spacebar release, downward acceleration ("gravity") returns bunny to ground parabolically 
        if(this.isLinear) this.y = Math.floor(this.#v0 * timeElapsed) + this.runY;
        else {
            pose = 2;
            this.#linearEndTime ??= (time - this.#hopStartTime) / 1000;
            this.y = Math.floor(this.#v0 * this.#linearEndTime + this.#v0 * (timeElapsed - this.#linearEndTime) + 0.5 * this.#accel * (timeElapsed - this.#linearEndTime) ** 2) + this.runY;
        }

        // Descent portion
        if(timeElapsed > this.#ascentTime) {
            pose = 3;
            // On bunny landing, reset hop properties and return to run
            if(this.y >= this.runY) {
                this.y = this.runY;
                this.#hopStartTime = null;
                this.#linearEndTime = null;
                this.run();
            }
        }

        ctx.drawImage(this.image, pose * this.poseWidth, 0, this.poseWidth, this.image.height, this.x, this.y - this.drawHeight, this.drawWidth, this.drawHeight);
    }

    // Called at each frame after bunny collides with an obstacle
    #idleDraw(time, ctx) {
        if(this.y < this.runY) this.y += 8; // Return to ground if not already there
        super.draw(time, ctx);
    }
}

class Deer extends Mammal {
    image = imageFiles.getImage('largeMammals', 'deer');
    relativeSpeedX = 4;
    heightProportion = 0.5;
    timePerPose = 325 / this.relativeSpeedX;

    constructor() {
        super();
        this.setSize();
    }
}

class Fox extends Mammal {
    image = imageFiles.getImage('largeMammals', 'fox');
    relativeSpeedX = 4;
    heightProportion = 0.25;
    numPoses = 6;
    timePerPose = 400 / this.relativeSpeedX;

    constructor() {
        super();
        this.setSize();
    }
}

class Wolf extends Mammal {
    image = imageFiles.getImage('largeMammals', 'wolf');
    relativeSpeedX = 1.8;
    heightProportion = 0.35;
    timePerPose = 200 / this.relativeSpeedX;

    constructor() {
        super();
        this.setSize();
    }
}

class Carrot extends GameImage {
    image = imageFiles.getImage('carrot');
    x = globals.getCanvasWidth();
    y = Math.floor(Math.random() * globals.getCanvasHeight() * 3 / 4); // Spawns at any random height in top 3/4 of canvas
    relativeSpeedX = 0; // Always stationary relative to foreground
    heightProportion = 0.1;

    constructor() {
        super();
        this.setSize();
    }
}

const globals = (function() {
    const canvasWidth = window.innerWidth;
    const canvasHeight = 0.8 * window.innerHeight;
    let foregroundScrollSpeed;

    return {
        initialize,
        getCanvasWidth,
        getCanvasHeight,
        getScrollSpeed,
        setScrollSpeed,
        buildCanvas
    }

    // Do not attempt to draw any images or start game functionality until all images have been loaded
    // Called immediately at window load
    function initialize() {
        imageFiles.loadImages().then(game.resetGame).catch(error => { console.log(error) });
    }

    function getCanvasWidth() {
        return canvasWidth;
    }

    function getCanvasHeight() {
        return canvasHeight;
    }

    function getScrollSpeed() {
        return foregroundScrollSpeed;
    }

    function setScrollSpeed(speed) {
        foregroundScrollSpeed = speed;
    }

    // Called to build a the canvas for each the scenery and game layers
    function buildCanvas(canvasName) {
        const canvas = document.getElementById(canvasName);
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio;
    
        // Scale canvas according to device pixel ratio--otherwise canvas is blurry for retina displays
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
    
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false; // Sharpen pixelation of images

        return [canvas, ctx];
    }
})();

// Module to handle all game images
const imageFiles = (function() {
    let allImages = {
        scenery: {
            background: 'parallax-forest-back-trees',
            midground: 'parallax-forest-middle-trees',
            foreground: 'parallax-forest-front-trees'
        },
        rabbit: {
            run: 'Rabbit_Run',
            hop: 'Rabbit_Hop',
            idle: 'Rabbit_Idle'
        },
        largeMammals: {
            deer: 'Deer_Walk',
            fox: 'Fox_Run',
            wolf: 'Wolf_Walk'
        },
        birds: ['bird_2_cardinal', 'bird_3_robin', 'bird_3_sparrow', 'bird_2_black', 'bird_2_red', 'bird_2_blue', 'bird_1_bluejay'],
        carrot: ['carrot']
    };

    return {
        loadImages,
        getImage
    }
    
    // Called by initialize function on globals module, immediately at window load
    // Returns a promise that fulfills when each image has loaded
    // Replaces each file name in allImages with the loaded image
    function loadImages() {
        return Promise.all(Object.values(allImages).map(category => {
            return Promise.all(Object.entries(category).map(([key, imgName]) => {
                return new Promise((resolve, reject) => {
                    let img = new Image();
                    img.onload = () => {
                        category[key] = img;
                        resolve();
                    }
                    img.onerror = () => { reject(`could not load image: ${imgName}.png`) };
                    img.src = `images/${imgName}.png`;
                });
            }));
        }));
    }

    function getImage(category, index) {
        if(!index) index = Math.floor(Math.random() * allImages[category].length);
        return allImages[category][index];
    }
})();

// Module to handle game logic
const game = (function() {
    const [canvas, ctx] = globals.buildCanvas('game-canvas');
    const pointsDisplay = document.getElementById('points-span');
    const resetBtn = document.getElementById('reset-btn');
    let gameOverDiv = document.getElementById('game-over-div');
    let animation;
    let bunny;
    let carrot;
    let obstacles;
    let points;
    let gameOver = true;

    // Either click or spacebar triggers a hop
    // Release determines hop height
    document.addEventListener('keydown', _hop);
    document.addEventListener('keyup', _unhop);
    document.addEventListener('touchstart', _hop);
    document.addEventListener('touchend', _unhop);
    canvas.addEventListener('mousedown', _hop);
    canvas.addEventListener('mouseup', _unhop);

    return {
        resetGame
    }

    function resetGame() {
        // Must remove visibility and functionality of reset div, as it is positioned on top of the game canvas
        resetBtn.removeEventListener('mousedown', resetGame);
        resetBtn.style.cursor = 'default';
        gameOverDiv.style.opacity = 0;
        gameOverDiv.style.pointerEvents = 'none';

        gameOver = false;
        globals.setScrollSpeed(3);
        loopScenery.start(); // Start scrolling
        bunny = new Rabbit();
        carrot = new Carrot();
        obstacles = [];
        points = 0;
        pointsDisplay.innerText = points;

        // Nullish coalescing assignment prevents additional animation loops from being triggered
        animation ??= requestAnimationFrame(_loop);
    }

    // Generally called at around 60fps
    function _loop(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 3 second delay when game starts
        if(!gameOver && time > 3000) {
            if(Math.floor(Math.random() * 480) === 1) obstacles.push(new Bird()); // New bird spawns every 7 seconds, on average
            if(Math.floor(Math.random() * 480) === 1) obstacles.push(Mammal.generateMammal()); // Spawns every 7 seconds, on average
            if(carrot.x < -carrot.drawWidth) carrot = new Carrot(); 
            // Spawns new carrot when previous carrot exits canvas. Only one carrot exists at a time

            // Check for collisions at each frame for both obstacles and targets
            obstacles.forEach(animal => {
                // Hit box is smaller than obstacle image dimensions. Adjusts collision detection parameters accordingly
                if(bunny.collDetect(animal.x + 0.2 * animal.drawWidth, animal.y - 0.7 * animal.drawHeight, 0.6 * animal.drawWidth, 0.6 * animal.drawHeight)) {
                    _loseGame();
                }
            });
            if(bunny.collDetect(carrot.x, carrot.y, carrot.drawWidth, carrot.drawHeight)) {
                carrot = new Carrot(); // Carrot disappears when collected, new carrot spawns immediately
                pointsDisplay.innerText = ++points;
            }
        }

        obstacles = obstacles.filter(obstacle => obstacle.x > -obstacle.drawWidth); // Remove obstacles that have passed offscreen
        obstacles.forEach(obstacle => {
            obstacle.draw(time, ctx);
        });
        carrot.draw(ctx);
        bunny.draw(time, ctx);

        animation = requestAnimationFrame(_loop);
    }

    // Mousedown or spacebar down initiates hop
    function _hop(event) {
        // event.preventDefault();
        if(!gameOver && (event.code === 'Space' || event.button === 0)) {
            bunny.hop();
        }
    }

    // Ends linear portion of hop when mouse/spacebar released. This allows user to control hop height
    function _unhop(event) {
        // event.preventDefault();
        if(!gameOver) bunny.isLinear = false;
    }

    function _loseGame() {
        // Return visibility and functionality to reset div when game is lost
        gameOverDiv.style.opacity = 1;
        resetBtn.addEventListener('mousedown', resetGame);
        resetBtn.style.cursor = 'pointer';
        gameOverDiv.style.pointerEvents = 'all';

        gameOver = true;
        globals.setScrollSpeed(0); // Slow down animals
        loopScenery.stop(); // Stop scenery animation
        bunny.idle(); // Game animation continues but bunny sits and sniffs
    }
})();

// Module to handle parallax scrolling background
const loopScenery = (function() {
    const [canvas, ctx] = globals.buildCanvas('scenery-canvas');
    let animation;
    let background;
    let midground;
    let foreground;

    return {
        start,
        stop
    }

    // Called when game is started or restarted
    function start() {
        // Only need to generate new scenery images at first execution
        // Background and midground move slower than foreground for parallax effect
        background ??= new Scenery('background', globals.getScrollSpeed() / 2);
        midground ??= new Scenery('midground', globals.getScrollSpeed() * 3 / 4);
        foreground ??= new Scenery('foreground', globals.getScrollSpeed());
        
        animation = requestAnimationFrame(_loop);
    }

    // Called when game is lost
    function stop() {
        cancelAnimationFrame(animation);
    }

    function _loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background.draw(ctx);
        midground.draw(ctx);
        foreground.draw(ctx);
        animation = requestAnimationFrame(_loop);
    }
})();

window.addEventListener('load', globals.initialize);