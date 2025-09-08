// Preload Scene
class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const progress = document.createElement("div");
    progress.className = "progress";
    progress.innerHTML = `<div class="bar"></div>`;
    document.querySelector(".game").prepend(progress);
    const bar = progress.querySelector(".bar");

    this.load.on("progress", (value) => {
      bar.style.width = Math.round(value * 100) + "%";
    });
    this.load.on("complete", () => progress.remove());

    // Simple placeholder sprites
    this.load.image("cell", "https://labs.phaser.io/assets/sprites/blank.png");
    this.load.image("flag", "https://labs.phaser.io/assets/sprites/longarrow.png");
    this.load.image("mine", "https://labs.phaser.io/assets/sprites/asteroid.png");
  }

  create() {
    this.scene.start("MainScene");
  }
}

// Main Scene
class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.rows = 9;
    this.cols = 9;
    this.mines = 10;
    this.cellSize = 40;
    this.grid = [];
    this.isGameOver = false;
    this.timerEvent = null;
    this.startTime = 0;
    this.flagsLeft = this.mines;
  }

  create() {
    this.createGrid();
    this.placeMines();
    this.calculateNumbers();
    this.drawGrid();
    this.isGameOver = false;
    this.firstClick = true;
    this.flagsLeft = this.mines;

    // HUD reset
    document.getElementById("flags").textContent = `🚩 ${this.flagsLeft}`;
    document.getElementById("timer").textContent = "00:00";
  }

  update() {
    if (this.timerEvent && !this.isGameOver) {
      const elapsed = Math.floor((this.time.now - this.startTime) / 1000);
      document.getElementById("timer").textContent = this.formatTime(elapsed);
    }
  }

  createGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = {
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          number: 0,
          sprite: null,
        };
      }
    }
  }

  placeMines() {
    let placed = 0;
    while (placed < this.mines) {
      const r = Phaser.Math.Between(0, this.rows - 1);
      const c = Phaser.Math.Between(0, this.cols - 1);
      if (!this.grid[r][c].isMine) {
        this.grid[r][c].isMine = true;
        placed++;
      }
    }
  }

  calculateNumbers() {
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isMine) continue;
        let count = 0;
        dirs.forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (this.isInside(nr, nc) && this.grid[nr][nc].isMine) count++;
        });
        this.grid[r][c].number = count;
      }
    }
  }

  drawGrid() {
    const offsetX = (this.scale.width - this.cols * this.cellSize) / 2;
    const offsetY = (this.scale.height - this.rows * this.cellSize) / 2;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const x = offsetX + c * this.cellSize + this.cellSize / 2;
        const y = offsetY + r * this.cellSize + this.cellSize / 2;

        const sprite = this.add.image(x, y, "cell")
          .setDisplaySize(this.cellSize - 2, this.cellSize - 2)
          .setInteractive();

        cell.sprite = sprite;

        sprite.on("pointerdown", () => {
          if (this.isGameOver) return;
          if (flagMode) {
            this.toggleFlag(cell);
          } else {
            this.revealCell(cell);
          }
        });
      }
    }
  }

  isInside(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  toggleFlag(cell) {
    if (cell.isRevealed) return;
    if (!cell.isFlagged && this.flagsLeft <= 0) return; // geen vlaggen meer

    cell.isFlagged = !cell.isFlagged;

    if (cell.flagSprite) {
      cell.flagSprite.destroy();
      cell.flagSprite = null;
      this.flagsLeft++;
    } else {
      cell.flagSprite = this.add.image(cell.sprite.x, cell.sprite.y, "flag")
        .setDisplaySize(this.cellSize / 2, this.cellSize / 2);
      this.flagsLeft--;
    }

    document.getElementById("flags").textContent = `🚩 ${this.flagsLeft}`;
  }

  revealCell(cell) {
    if (cell.isRevealed || cell.isFlagged) return;

    // Start timer bij eerste klik
    if (this.firstClick) {
      this.startTimer();
      this.firstClick = false;
    }

    cell.isRevealed = true;

    if (cell.isMine) {
      this.add.image(cell.sprite.x, cell.sprite.y, "mine")
        .setDisplaySize(this.cellSize * 0.7, this.cellSize * 0.7);
      this.gameOver(false);
      return;
    }

    if (cell.number > 0) {
      this.add.text(cell.sprite.x, cell.sprite.y, cell.number, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: this.getNumberColor(cell.number),
      }).setOrigin(0.5);
    } else {
      this.revealNeighbors(cell);
    }

    if (this.checkWin()) {
      this.gameOver(true);
    }
  }

  revealNeighbors(cell) {
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    dirs.forEach(([dr, dc]) => {
      const nr = cell.row + dr, nc = cell.col + dc;
      if (this.isInside(nr, nc)) {
        this.revealCell(this.grid[nr][nc]);
      }
    });
  }

  getNumberColor(n) {
    const colors = {
      1: "#73b7ff",
      2: "#77dd77",
      3: "#ffadad",
      4: "#cfa6ff",
      5: "#ffdd57",
      6: "#8deaff",
      7: "#f7a6ff",
      8: "#cfd8e3",
    };
    return colors[n] || "#ffffff";
  }

  checkWin() {
    let revealed = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isRevealed) revealed++;
      }
    }
    return revealed === this.rows * this.cols - this.mines;
  }

  gameOver(won) {
    this.isGameOver = true;
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }

    const text = won ? "Gewonnen! 🎉" : "Game Over 💥";
    this.add.text(this.scale.width / 2, 40, text, {
      fontSize: "28px",
      color: won ? "#37d67a" : "#ff6b6b",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  startTimer() {
    this.startTime = this.time.now;
    this.timerEvent = this.time.addEvent({ delay: 1000, loop: true });
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}

// Phaser Config
const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#0b0f1a",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MainScene],
};

const game = new Phaser.Game(config);

// HUD logica
document.getElementById("restart").addEventListener("click", () => {
  game.scene.stop("MainScene");
  game.scene.start("MainScene");
});

const body = document.body;
let flagMode = false;
document.getElementById("flagModeToggle").addEventListener("click", () => {
  flagMode = !flagMode;
  if (flagMode) {
    body.classList.add("cursor-flag");
    body.classList.remove("cursor-dig");
  } else {
    body.classList.add("cursor-dig");
    body.classList.remove("cursor-flag");
  }
});

// Thema toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  if (root.dataset.theme === "light") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = "light";
  }
});
