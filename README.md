# Hoppy Bunny
## A Canvas-Based Side-Scroller

Inspired by viral mobile games, Flappy Bird and Chrome dinosaur, this project uses the HTML5 Canvas API to animate an endless runner game with parallax scrolling. Play as a rabbit running through the forest, hopping to collect carrots and avoid oncoming animals.

This is adapted from code I originally wrote when first learning JavaScript, before I got to CSS and HTML. The coding environment I was using at the time included the p5.js library, which is based on the Canvas API. Rather than embedding p5 in my code (or using a hosted version), I've since converted this project to vanilla Canvas. I've also refactored the structure using class syntax and the Revealing Module Design Pattern, to be more organized and maintainable.

This project was an exercise in object-oriented programming, with the primary objective of practicing prototypical inheritance in class syntax. Game data is encapsulated using private properties and methods of classes, and game logic is encapsulated using private variables, methods, and closures in IIFE modules. Abstract classes provide a base for subclasses to inherit common methods and properties.

**Check out the demo [here](https://karamorgan.github.io/hoppy-bunny/)!**

---

## Technical Overview

This project was built using HTML, CSS, and vanilla JavaScript. Game structure includes a heirarchical class structure to instantiate each game object, and modules to handle global variables, game logic, and background scrolling. A separate canvas is used for each the background parallax scrolling and the game layer with characters.

The window load event calls an initialization task in the globals module, which directs the image handler module to load all images from the assets folder. Promise fulfillment ensures that no attempts to draw game objects are made before images have completed loading. A layered background and rabbit character objects are then instantiated and animation loops initiated for both canvas layers.

Each game object contains a draw method that is called at the execution of each animation frame, which updates the object's xy-coordinates and redraws it to the canvas. A three-dimensional effect is achieved by parallax scrolling each of the three background layers at different rates. Animal characters are animated using a sprite sheet, a single image that contains multiple poses capturing a particular action, like run or walk. The animal's draw method iterates through different coordinates of the sprite sheet to successively draw each pose and animate the action.

Click or spacebar keypress events both initiate calls to the rabbit hop method, which overrides rabbit's inherited draw method with a custom draw method that manipulates the object's y-coordinate. The user can control the height of the hop by depressing the mouse or spacebar for longer duration, during which upward ascent is of constant velocity. When the mouse or spacebar is released, or when a maximum duration has been exceeded (whichever is sooner), an acceleration variable decreases the rabbit's climb rate and returns it to the ground. The initial hop velocity and freefall acceleration are sized such that maxiumum hop peaks at the top of the canvas.

Collision detection is achieved using a simple axially-aligned boundary box method applied to both animal obstacles and carrot targets. The game can be played indefinitely, with the objective to collect as many carrots as possible, but it is lost if a collision is detected with any bird or ground animal.

---

## Forward Work

### Refine Game Mechanics
As is, the frequency of obstacles is determined using a random number generator that is tuned to spawn a new bird and mammal, on average, every 7 seconds. This is a passable method to provide some unpredictability, but it occassionally produces unwinnable conditions. In the next version, more sophistication in the algorithm would make the gameplay more satisfying. 

### Verify Browser Compatibility
I developed this code using Firefox, and I have superficially tested it in Chrome and Safari. All major browser current versions now support Canvas API, but this game may not function on older browsers.

### Optimize Asset Handling
Not a major concern for such a small project, but definitely a consideration if I were to scale up the project. Large production-level applications would use a CDN to handle images, rather than a local repository. This was not an option I considered for this small personal project, but it would optimize image delivery for size, format, and quality.

---

## Skills Practiced
* Revealing Module Pattern
* Object-Oriented Programming
    * Class elements: methods and fields, public and private, static and instance
    * Encapsulation, abstraction, inheritance

---

## Challenges Encountered (and Solved)
* Asynchronicity of loading images, program attempting to draw before loading complete
* Blurry images from PNG files being too small. Solved by toggling default image smoothing for the canvas
* Variable scope and privacy (passing needed data between modules while otherwise limiting exposure)
* Designing hop mechanic--how to build hops with realistic linear motion that supports user input to determine height

---

## Credits

Images provided under public domain/creative commons from opengameart.org by the following artists:
* ansimuz (forest scenery)
* ScratchIO (mammals)
* bluecarrot16 ([birds](https://opengameart.org/content/lpc-birds))
* AdrianTR (carrot)

---

Thanks for taking the time to stop by! Please consider reaching out with any comments, questions, suggestions to improve my code, or good jokes.