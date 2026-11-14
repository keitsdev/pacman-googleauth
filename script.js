let board;
const rowCount = 21;
const columnCount = 19;
const tileSize = 32;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

let blueGhostImage;
let orangeGhostImage;
let pinkGhostImage;
let redGhostImage;
let scaredGhostImage;
let cherryImage;
let pacmanUpImage;
let pacmanDownImage;
let pacmanLeftImage;
let pacmanRightImage;
let wallImage;

const tileMap = [
    "XXXXXXXXXXXXXXXXXXX",
    "XC       X       CX",
    "X XX XXX X XXX XX X",
    "X                 X",
    "X XX X XXXXX X XX X",
    "X    X       X    X",
    "XXXX XXXX XXXX XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXrXX X XXXX",
    "O       bpo       O",
    "XXXX X XXXXX X XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXXXX X XXXX",
    "X        X        X",
    "X XX XXX X XXX XX X",
    "X  X     P     X  X",
    "XX X X XXXXX X X XX",
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X",
    "XC               CX",
    "XXXXXXXXXXXXXXXXXXX"
];

const walls = new Set();
const foods = new Set();
const cherries = new Set();
const ghosts = new Set();
let pacman;

const directions = ['U', 'D', 'L', 'R'];
let score = 0;
let lives = 3;
let gameOver = false;
let gameWon = false;
let powerMode = false;
let powerEndTime = 0;
let powerTimer = null;
let animationTick = 0;
let currentPlayer = null;
let gameStarted = false;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    document.getElementById("btn-restart").addEventListener("click", restartGame);
    document.getElementById("btn-home").addEventListener("click", goToHome);
    document.getElementById("btn-start").addEventListener("click", startGame);

    loadImages();
    loadMap();

    for (let ghost of ghosts.values()) {
        const newDirection = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(newDirection);
    }
    document.addEventListener("keydown", movePacman);
    window.addEventListener("google-identity-loaded", initializeGoogleLogin);
    window.addEventListener("google-identity-error", () => {
        setLoginStatus("Não foi possível carregar o login do Google. Verifique sua conexão e recarregue a página.", true);
    });
    initializeGoogleLogin();
}

function goToHome() {
    gameStarted = false;
    gameOver = true;
    gameWon = false;
    hideEndScreen();
    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
}

function setLoginStatus(message, isError = false) {
    const status = document.getElementById("login-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function initializeGoogleLogin() {
    const clientId = window.PACMAN_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("YOUR_GOOGLE_CLIENT_ID")) {
        setLoginStatus("Configure o Client ID em google-auth-config.js para habilitar o login.", true);
        return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        setLoginStatus("Não foi possível carregar o login do Google. Verifique sua conexão e recarregue a página.", true);
        return;
    }

    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
    });
    window.google.accounts.id.renderButton(document.getElementById("google-button"), {
        type: "standard",
        theme: "filled_blue",
        size: "large",
        shape: "pill",
        text: "signin_with",
        locale: "pt-BR",
        width: 280
    });
    setLoginStatus("Entre com sua conta Google para liberar a partida.");
}

function decodeGoogleCredential(credential) {
    const parts = credential.split(".");
    if (parts.length !== 3) {
        throw new Error("A credencial recebida pelo Google está inválida.");
    }

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}

function handleGoogleCredential(response) {
    try {
        const profile = decodeGoogleCredential(response.credential);
        if (!profile.name) {
            throw new Error("O Google não retornou um nome para esta conta.");
        }

        currentPlayer = {
            name: profile.name,
            givenName: profile.given_name || profile.name.split(" ")[0],
            email: profile.email || "",
            picture: profile.picture || ""
        };

        const avatar = document.getElementById("user-avatar");
        avatar.src = currentPlayer.picture || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23282d49'/%3E%3Ccircle cx='24' cy='18' r='8' fill='%23c9c9ff'/%3E%3Cpath d='M8 44c1-9 7-14 16-14s15 5 16 14' fill='%23c9c9ff'/%3E%3C/svg%3E";
        document.getElementById("user-name").textContent = currentPlayer.name;
        document.getElementById("authenticated-panel").classList.remove("hidden");
        document.getElementById("google-button").classList.add("hidden");
        setLoginStatus("Login realizado. Sua partida está pronta.");
        document.getElementById("btn-start").focus();
    } catch (error) {
        currentPlayer = null;
        setLoginStatus(error.message || "Não foi possível concluir o login com o Google.", true);
    }
}

function startGame() {
    if (!currentPlayer) {
        setLoginStatus("Faça login com o Google antes de jogar.", true);
        return;
    }

    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    gameStarted = true;
    restartGame();
}

function showEndScreen(won) {
    const endScreen = document.getElementById("end-screen");
    const endTitle = document.getElementById("end-title");
    const endPlayer = document.getElementById("end-player");
    const endScore = document.getElementById("end-score");

    endTitle.textContent = won ? "VOCÊ VENCEU!" : "FIM DE JOGO";
    endTitle.className = won ? "win" : "lose";
    endPlayer.textContent = won
        ? "Parabéns, " + (currentPlayer ? currentPlayer.name : "jogador") + "!"
        : "Boa partida, " + (currentPlayer ? currentPlayer.name : "jogador") + ".";
    endScore.textContent = "Pontuação: " + String(score);
    endScreen.classList.remove("hidden");
}

function hideEndScreen() {
    document.getElementById("end-screen").classList.add("hidden");
}

function restartGame() {
    if (!currentPlayer) {
        goToHome();
        return;
    }
    if (powerTimer) clearTimeout(powerTimer);
    endPowerMode();
    hideEndScreen();
    loadMap();
    resetPositions();
    lives = 3;
    score = 0;
    gameOver = false;
    gameWon = false;
    update();
}

function loadImages() {
    wallImage = new Image();
    wallImage.src = "./wall.png";

    blueGhostImage = new Image();
    blueGhostImage.src = "./blueGhost.png";
    orangeGhostImage = new Image();
    orangeGhostImage.src = "./orangeGhost.png";
    pinkGhostImage = new Image();
    pinkGhostImage.src = "./pinkGhost.png";
    redGhostImage = new Image();
    redGhostImage.src = "./redGhost.png";

    scaredGhostImage = new Image();
    scaredGhostImage.src = "./scaredGhost.png";

    cherryImage = new Image();
    cherryImage.src = "./cherry.png";

    pacmanUpImage = new Image();
    pacmanUpImage.src = "./pacmanUp.png";
    pacmanDownImage = new Image();
    pacmanDownImage.src = "./pacmanDown.png";
    pacmanLeftImage = new Image();
    pacmanLeftImage.src = "./pacmanLeft.png";
    pacmanRightImage = new Image();
    pacmanRightImage.src = "./pacmanRight.png";
}

function loadMap() {
    walls.clear();
    foods.clear();
    cherries.clear();
    ghosts.clear();

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const row = tileMap[r];
            const tileMapChar = row[c];

            const x = c * tileSize;
            const y = r * tileSize;

            if (tileMapChar == 'X') {
                const wall = new Block(wallImage, x, y, tileSize, tileSize);
                walls.add(wall);
            }
            else if (tileMapChar == 'b') {
                const ghost = new Block(blueGhostImage, x, y, tileSize, tileSize, true);
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'o') {
                const ghost = new Block(orangeGhostImage, x, y, tileSize, tileSize, true);
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'p') {
                const ghost = new Block(pinkGhostImage, x, y, tileSize, tileSize, true);
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'r') {
                const ghost = new Block(redGhostImage, x, y, tileSize, tileSize, true);
                ghosts.add(ghost);
            }
            else if (tileMapChar == 'P') {
                pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize, false);
            }
            else if (tileMapChar == ' ') {
                const food = new Block(null, x + 14, y + 14, 4, 4, false);
                foods.add(food);
            }
            else if (tileMapChar == 'C') {
                const cherry = new Block(cherryImage, x + 4, y + 4, tileSize - 8, tileSize - 8, false);
                cherries.add(cherry);
            }
        }
    }
}

function update() {
    if (!gameStarted || gameOver || gameWon) {
        return;
    }
    animationTick++;
    move();
    draw();
    if (!gameOver && !gameWon) {
        setTimeout(update, 50);
    }
}

function drawPacman() {
    const centerX = pacman.x + pacman.width / 2;
    const centerY = pacman.y + pacman.height / 2;
    const radius = pacman.width / 2 - 2;
    const isMoving = pacman.velocityX !== 0 || pacman.velocityY !== 0;
    const mouthAngle = isMoving ? Math.abs(Math.sin(animationTick * 0.4)) * 0.25 * Math.PI : 0.05 * Math.PI;

    let rotation = 0;
    if (pacman.direction == 'D') rotation = 0.5 * Math.PI;
    else if (pacman.direction == 'L') rotation = Math.PI;
    else if (pacman.direction == 'U') rotation = 1.5 * Math.PI;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.fillStyle = "yellow";
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, mouthAngle, 2 * Math.PI - mouthAngle);
    context.closePath();
    context.fill();
    context.restore();
}

function drawGhostEyes(ghost) {
    let offsetX = 0;
    let offsetY = 0;
    if (ghost.direction == 'L') offsetX = -2;
    else if (ghost.direction == 'R') offsetX = 2;
    else if (ghost.direction == 'U') offsetY = -2;
    else if (ghost.direction == 'D') offsetY = 2;

    const leftEyeX = ghost.x + 10;
    const rightEyeX = ghost.x + 22;
    const eyeY = ghost.y + 14;

    context.fillStyle = "white";
    context.beginPath();
    context.arc(leftEyeX, eyeY, 4, 0, 2 * Math.PI);
    context.arc(rightEyeX, eyeY, 4, 0, 2 * Math.PI);
    context.fill();

    context.fillStyle = "#1919a6";
    context.beginPath();
    context.arc(leftEyeX + offsetX, eyeY + offsetY, 2, 0, 2 * Math.PI);
    context.arc(rightEyeX + offsetX, eyeY + offsetY, 2, 0, 2 * Math.PI);
    context.fill();
}

function drawHeart(x, y, size) {
    context.save();
    context.fillStyle = "#ff2a2a";
    context.beginPath();
    const topCurveHeight = size * 0.3;
    context.moveTo(x, y + topCurveHeight);
    context.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    context.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
    context.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    context.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    context.closePath();
    context.fill();
    context.restore();
}

function drawHUD() {
    for (let i = 0; i < lives; i++) {
        drawHeart(22 + i * 24, 8, 16);
    }

    context.fillStyle = "white";
    context.font = "bold 15px sans-serif";
    context.fillText("Score: " + String(score), 96, 21);
}

function draw() {
    context.clearRect(0, 0, board.width, board.height);

    drawPacman();

    const timeLeft = powerEndTime - Date.now();
    const isBlinking = powerMode && timeLeft <= 2000 && Math.floor(animationTick / 4) % 2 === 0;

    for (let ghost of ghosts.values()) {
        if (ghost.isEaten) {
            drawGhostEyes(ghost);
        } else if (powerMode) {
            if (isBlinking) {
                if (scaredGhostImage.complete && scaredGhostImage.naturalWidth !== 0) {
                    context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height);
                } else {
                    context.fillStyle = "#ffffff";
                    context.fillRect(ghost.x + 2, ghost.y + 2, ghost.width - 4, ghost.height - 4);
                }
            } else {
                if (scaredGhostImage.complete && scaredGhostImage.naturalWidth !== 0) {
                    context.drawImage(scaredGhostImage, ghost.x, ghost.y, ghost.width, ghost.height);
                } else {
                    context.fillStyle = "#2121ff";
                    context.fillRect(ghost.x + 2, ghost.y + 2, ghost.width - 4, ghost.height - 4);
                }
            }
        } else {
            context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height);
        }
    }

    for (let wall of walls.values()) {
        context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
    }

    context.fillStyle = "white";
    for (let food of foods.values()) {
        context.fillRect(food.x, food.y, food.width, food.height);
    }

    for (let cherry of cherries.values()) {
        if (cherry.image && cherry.image.complete && cherry.image.naturalWidth !== 0) {
            context.drawImage(cherry.image, cherry.x, cherry.y, cherry.width, cherry.height);
        } else {
            context.fillStyle = "red";
            context.beginPath();
            context.arc(cherry.x + cherry.width / 2, cherry.y + cherry.height / 2, 8, 0, 2 * Math.PI);
            context.fill();
        }
    }

    drawHUD();
}

function wrapPosition(entity) {
    if (entity.x + entity.width <= 0) {
        entity.x = boardWidth - entity.width;
    } else if (entity.x >= boardWidth) {
        entity.x = 0;
    }
}

function endPowerMode() {
    powerMode = false;
    powerEndTime = 0;
    const step = tileSize / 4;
    for (let ghost of ghosts.values()) {
        ghost.x = Math.round(ghost.x / step) * step;
        ghost.y = Math.round(ghost.y / step) * step;
        ghost.updateVelocity();
    }
}

function activatePowerMode() {
    powerMode = true;
    powerEndTime = Date.now() + 8000;
    if (powerTimer) {
        clearTimeout(powerTimer);
    }
    for (let ghost of ghosts.values()) {
        if (!ghost.isEaten) {
            ghost.updateVelocity();
            chooseFleeDirection(ghost);
        }
    }
    powerTimer = setTimeout(() => {
        endPowerMode();
    }, 8000);
}

function chooseFleeDirection(ghost) {
    let bestDir = ghost.direction;
    let maxDist = -1;
    const opposite = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L' };
    const step = ghost.getStep();

    for (let dir of directions) {
        if (dir === opposite[ghost.direction]) continue;

        let testX = ghost.x;
        let testY = ghost.y;

        if (dir == 'U') testY -= step;
        else if (dir == 'D') testY += step;
        else if (dir == 'L') testX -= step;
        else if (dir == 'R') testX += step;

        const testBox = { x: testX, y: testY, width: ghost.width, height: ghost.height };
        let blocked = false;
        for (let wall of walls.values()) {
            if (collision(testBox, wall)) {
                blocked = true;
                break;
            }
        }

        if (!blocked) {
            const dist = Math.hypot(testX - pacman.x, testY - pacman.y);
            if (dist > maxDist) {
                maxDist = dist;
                bestDir = dir;
            }
        }
    }

    ghost.updateDirection(bestDir);
}

function chooseReturnDirection(ghost) {
    let bestDir = ghost.direction;
    let minDist = Infinity;
    const opposite = { 'U': 'D', 'D': 'U', 'L': 'R', 'R': 'L' };
    const step = ghost.getStep();

    for (let dir of directions) {
        if (dir === opposite[ghost.direction]) continue;

        let testX = ghost.x;
        let testY = ghost.y;

        if (dir == 'U') testY -= step;
        else if (dir == 'D') testY += step;
        else if (dir == 'L') testX -= step;
        else if (dir == 'R') testX += step;

        const testBox = { x: testX, y: testY, width: ghost.width, height: ghost.height };
        let blocked = false;
        for (let wall of walls.values()) {
            if (collision(testBox, wall)) {
                blocked = true;
                break;
            }
        }

        if (!blocked) {
            const dist = Math.hypot(testX - ghost.startX, testY - ghost.startY);
            if (dist < minDist) {
                minDist = dist;
                bestDir = dir;
            }
        }
    }

    if (minDist === Infinity) {
        bestDir = opposite[ghost.direction];
    }

    ghost.updateDirection(bestDir);
}

function move() {
    if (pacman.nextDirection) {
        pacman.tryChangeDirection(pacman.nextDirection);
    }

    pacman.x += pacman.velocityX;
    pacman.y += pacman.velocityY;
    wrapPosition(pacman);

    for (let wall of walls.values()) {
        if (collision(pacman, wall)) {
            pacman.x -= pacman.velocityX;
            pacman.y -= pacman.velocityY;
            break;
        }
    }

    for (let ghost of ghosts.values()) {
        if (!ghost.isEaten && collision(ghost, pacman)) {
            if (powerMode) {
                score += 200;
                ghost.isEaten = true;
                const step = tileSize / 4;
                ghost.x = Math.round(ghost.x / step) * step;
                ghost.y = Math.round(ghost.y / step) * step;
                ghost.updateVelocity();
                chooseReturnDirection(ghost);
            } else {
                lives -= 1;
                if (lives == 0) {
                    gameOver = true;
                    draw();
                    showEndScreen(false);
                    return;
                }
                resetPositions();
                return;
            }
        }

        if (ghost.isEaten) {
            if (Math.hypot(ghost.x - ghost.startX, ghost.y - ghost.startY) <= tileSize / 4) {
                ghost.reset();
                ghost.isEaten = false;
                ghost.updateVelocity();
                ghost.updateDirection('U');
                continue;
            }

            ghost.x += ghost.velocityX;
            ghost.y += ghost.velocityY;
            wrapPosition(ghost);

            for (let wall of walls.values()) {
                if (collision(ghost, wall)) {
                    ghost.x -= ghost.velocityX;
                    ghost.y -= ghost.velocityY;
                    chooseReturnDirection(ghost);
                    break;
                }
            }

            if (ghost.x % tileSize === 0 && ghost.y % tileSize === 0) {
                chooseReturnDirection(ghost);
            }
            continue;
        }

        if (ghost.y == tileSize * 9 && ghost.direction != 'U' && ghost.direction != 'D' && ghost.x > tileSize * 6 && ghost.x < tileSize * 12) {
            ghost.updateDirection('U');
        }

        ghost.x += ghost.velocityX;
        ghost.y += ghost.velocityY;
        wrapPosition(ghost);

        for (let wall of walls.values()) {
            if (collision(ghost, wall)) {
                ghost.x -= ghost.velocityX;
                ghost.y -= ghost.velocityY;
                if (powerMode) {
                    chooseFleeDirection(ghost);
                } else {
                    const newDirection = directions[Math.floor(Math.random() * 4)];
                    ghost.updateDirection(newDirection);
                }
                break;
            }
        }

        if (powerMode && ghost.x % tileSize === 0 && ghost.y % tileSize === 0) {
            chooseFleeDirection(ghost);
        }
    }

    let foodEaten = null;
    for (let food of foods.values()) {
        if (collision(pacman, food)) {
            foodEaten = food;
            score += 10;
            break;
        }
    }
    foods.delete(foodEaten);

    let cherryEaten = null;
    for (let cherry of cherries.values()) {
        if (collision(pacman, cherry)) {
            cherryEaten = cherry;
            score += 50;
            activatePowerMode();
            break;
        }
    }
    cherries.delete(cherryEaten);

    if (foods.size == 0 && cherries.size == 0) {
        if (powerTimer) clearTimeout(powerTimer);
        endPowerMode();
        gameWon = true;
        draw();
        showEndScreen(true);
    }
}

function movePacman(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (!gameStarted || gameOver || gameWon) {
        return;
    }

    if (e.code == "ArrowUp" || e.code == "KeyW") {
        pacman.nextDirection = 'U';
    }
    else if (e.code == "ArrowDown" || e.code == "KeyS") {
        pacman.nextDirection = 'D';
    }
    else if (e.code == "ArrowLeft" || e.code == "KeyA") {
        pacman.nextDirection = 'L';
    }
    else if (e.code == "ArrowRight" || e.code == "KeyD") {
        pacman.nextDirection = 'R';
    }
}

function collision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function resetPositions() {
    pacman.reset();
    pacman.velocityX = 0;
    pacman.velocityY = 0;
    pacman.nextDirection = null;
    for (let ghost of ghosts.values()) {
        ghost.reset();
        ghost.isEaten = false;
        ghost.updateVelocity();
        const newDirection = directions[Math.floor(Math.random() * 4)];
        ghost.updateDirection(newDirection);
    }
}

class Block {
    constructor(image, x, y, width, height, isGhost = false) {
        this.image = image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isGhost = isGhost;
        this.isEaten = false;

        this.startX = x;
        this.startY = y;

        this.direction = 'R';
        this.nextDirection = null;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    getStep() {
        if (this.isGhost && powerMode && !this.isEaten) {
            return tileSize / 8;
        }
        return tileSize / 4;
    }

    tryChangeDirection(direction) {
        const prevDirection = this.direction;
        this.direction = direction;
        this.updateVelocity();
        this.x += this.velocityX;
        this.y += this.velocityY;

        for (let wall of walls.values()) {
            if (collision(this, wall)) {
                this.x -= this.velocityX;
                this.y -= this.velocityY;
                this.direction = prevDirection;
                this.updateVelocity();
                return false;
            }
        }
        this.x -= this.velocityX;
        this.y -= this.velocityY;
        this.nextDirection = null;
        return true;
    }

    updateDirection(direction) {
        const prevDirection = this.direction;
        this.direction = direction;
        this.updateVelocity();
        this.x += this.velocityX;
        this.y += this.velocityY;

        for (let wall of walls.values()) {
            if (collision(this, wall)) {
                this.x -= this.velocityX;
                this.y -= this.velocityY;
                this.direction = prevDirection;
                this.updateVelocity();
                return;
            }
        }
    }

    updateVelocity() {
        const step = this.getStep();
        if (this.direction == 'U') {
            this.velocityX = 0;
            this.velocityY = -step;
        }
        else if (this.direction == 'D') {
            this.velocityX = 0;
            this.velocityY = step;
        }
        else if (this.direction == 'L') {
            this.velocityX = -step;
            this.velocityY = 0;
        }
        else if (this.direction == 'R') {
            this.velocityX = step;
            this.velocityY = 0;
        }
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
    }
}
