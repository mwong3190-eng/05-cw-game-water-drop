// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let gamePaused = false; // Keeps track of whether game is paused
let resumeCountdownActive = false;
let dropMaker; // Will store our timer that creates drops regularly
let gameTimer; // Countdown timer interval
let resumeCountdownTimer;
let scoreColorResetTimer;
let score = 0;
let timeLeft = 30;

const CONTAMINANT_CHANCE = 0.22;
const CONTAMINANT_PENALTY = 1;

const WINNING_MESSAGES = [
  "Amazing work! You saved enough water drops to win!",
  "You crushed it! Hydration hero status unlocked!",
  "Victory! Your reflexes are unstoppable!",
  "Great job! You reached the target score!"
];

const LOSING_MESSAGES = [
  "Nice try! Give it another shot and beat 20 points!",
  "So close! Keep practicing and you'll get there!",
  "Try again! Faster clicks will help you win!",
  "Good effort! One more round and you can do it!"
];

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const gameContainer = document.getElementById("game-container");
const gameMessage = document.getElementById("game-message");
const startButton = document.getElementById("start-btn");
const pauseButton = document.getElementById("pause-btn");
const resetButton = document.getElementById("reset-btn");
const bucket = document.getElementById("bucket");
const resumeOverlay = document.getElementById("resume-overlay");
const resumeCountdownNumber = document.getElementById("resume-countdown-number");

let draggingBucket = false;

gameContainer.addEventListener("mousedown", beginBucketDrag);
window.addEventListener("mousemove", dragBucket);
window.addEventListener("mouseup", endBucketDrag);

gameContainer.addEventListener("touchstart", beginBucketDrag, { passive: true });
window.addEventListener("touchmove", dragBucket, { passive: true });
window.addEventListener("touchend", endBucketDrag);

// Wait for button click to start the game
startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
resetButton.addEventListener("click", restartGame);

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  beginNewGame();
}

function restartGame() {
  clearResumeCountdown();
  stopIntervals();
  gameRunning = false;
  gamePaused = false;
  pauseButton.disabled = true;
  setPauseButtonMode("pause");

  beginNewGame(true);
}

function beginNewGame(withResetCountdown = false) {
  resetGameUI();
  gameRunning = true;
  gamePaused = false;

  if (withResetCountdown) {
    beginResetCountdown();
    return;
  }

  pauseButton.disabled = false;
  setPauseButtonMode("pause");

  // Create new drops every second (1000 milliseconds)
  startIntervals();
}

function resetGameUI() {
  score = 0;
  timeLeft = 30;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  gameMessage.textContent = "";
  clearResumeCountdown();
  gameContainer.classList.remove("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;
  clearDrops();
  centerBucket();
}

function updateTimer() {
  if (gamePaused) return;

  timeLeft -= 1;
  timeElement.textContent = timeLeft;

  if (timeLeft <= 0) {
    endGame();
  }
}

function endGame() {
  gameRunning = false;
  gamePaused = false;
  clearTimeout(scoreColorResetTimer);
  scoreElement.classList.remove("score-loss");
  clearResumeCountdown();
  stopIntervals();
  pauseButton.disabled = true;
  setPauseButtonMode("pause");
  gameContainer.classList.remove("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;
  clearDrops();

  const didWin = score >= 20;
  const messageList = didWin ? WINNING_MESSAGES : LOSING_MESSAGES;
  const randomIndex = Math.floor(Math.random() * messageList.length);
  gameMessage.textContent = messageList[randomIndex];
}

function togglePause() {
  if (!gameRunning) return;

  if (gamePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function pauseGame() {
  gamePaused = true;
  clearResumeCountdown();
  stopIntervals();
  setPauseButtonMode("play");
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;
}

function resumeGame() {
  if (!gameRunning) return;

  beginResumeCountdown();
}

function beginResumeCountdown() {
  clearResumeCountdown();

  resumeCountdownActive = true;
  gamePaused = true;
  pauseButton.disabled = true;
  resumeOverlay.classList.add("visible");
  resumeOverlay.classList.remove("reset-mode");
  resumeOverlay.setAttribute("aria-hidden", "false");
  gameContainer.classList.add("paused");

  let countdownValue = 3;
  resumeCountdownNumber.textContent = countdownValue;

  resumeCountdownTimer = setInterval(() => {
    countdownValue -= 1;

    if (countdownValue <= 0) {
      finishResumeCountdown();
      return;
    }

    resumeCountdownNumber.textContent = countdownValue;
  }, 1000);
}

function beginResetCountdown() {
  clearResumeCountdown();

  resumeCountdownActive = true;
  gamePaused = true;
  pauseButton.disabled = true;
  setPauseButtonMode("pause");
  resumeOverlay.classList.add("visible", "reset-mode");
  resumeOverlay.setAttribute("aria-hidden", "false");
  gameContainer.classList.add("paused");

  let countdownValue = 3;
  resumeCountdownNumber.textContent = countdownValue;

  resumeCountdownTimer = setInterval(() => {
    countdownValue -= 1;

    if (countdownValue <= 0) {
      finishResetCountdown();
      return;
    }

    resumeCountdownNumber.textContent = countdownValue;
  }, 1000);
}

function finishResetCountdown() {
  clearResumeCountdown();
  if (!gameRunning) return;

  gamePaused = false;
  pauseButton.disabled = false;
  setPauseButtonMode("pause");
  gameContainer.classList.remove("paused");
  startIntervals();
}

function finishResumeCountdown() {
  clearResumeCountdown();
  if (!gameRunning) return;

  gamePaused = false;
  pauseButton.disabled = false;
  setPauseButtonMode("pause");
  gameContainer.classList.remove("paused");
  startIntervals();
}

function clearResumeCountdown() {
  clearInterval(resumeCountdownTimer);
  resumeCountdownActive = false;
  resumeOverlay.classList.remove("visible");
  resumeOverlay.classList.remove("reset-mode");
  resumeOverlay.setAttribute("aria-hidden", "true");
}

function setPauseButtonMode(mode) {
  pauseButton.dataset.icon = mode;

  if (mode === "play") {
    pauseButton.setAttribute("aria-label", "Resume game");
    pauseButton.title = "Resume game";
    return;
  }

  pauseButton.setAttribute("aria-label", "Pause game");
  pauseButton.title = "Pause game";
}

function startIntervals() {
  dropMaker = setInterval(createDrop, 1000);
  gameTimer = setInterval(updateTimer, 1000);
}

function stopIntervals() {
  clearInterval(dropMaker);
  clearInterval(gameTimer);
}

function createDrop() {
  if (!gameRunning || gamePaused) return;

  // Create a new falling item (water drop or contaminant).
  const drop = document.createElement("div");
  drop.className = "water-drop";

  const isContaminant = Math.random() < CONTAMINANT_CHANCE;
  if (isContaminant) {
    drop.classList.add("contaminant-drop");
  }

  // Make drops different sizes for visual variety, capped at 40px tall.
  const minDropSize = 24;
  const maxDropSize = 40;
  const size = Math.random() * (maxDropSize - minDropSize) + minDropSize;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract the drop size to keep drops fully inside the container.
  const gameWidth = gameContainer.offsetWidth;
  const xPosition = Math.random() * (gameWidth - size);
  drop.style.left = xPosition + "px";

  // Make drops fall for 4 seconds
  drop.style.animationDuration = "4s";

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Check if falling drop is caught by bucket while moving.
  const collisionWatcher = setInterval(() => {
    if (!gameRunning || !drop.isConnected) {
      clearInterval(collisionWatcher);
      return;
    }

    if (gamePaused) return;

    if (isDropCaught(drop)) {
      if (isContaminant) {
        score -= CONTAMINANT_PENALTY;
        showScoreLossFeedback();
      } else {
        score += 1;
      }

      scoreElement.textContent = score;
      drop.remove();
      clearInterval(collisionWatcher);
    }
  }, 40);

  // Remove items that reach the bottom.
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
    clearInterval(collisionWatcher);
  });
}

function showScoreLossFeedback() {
  scoreElement.classList.add("score-loss");
  clearTimeout(scoreColorResetTimer);

  scoreColorResetTimer = setTimeout(() => {
    scoreElement.classList.remove("score-loss");
  }, 2000);
}

function beginBucketDrag(event) {
  if (!gameRunning || (gamePaused && !resumeCountdownActive)) return;
  draggingBucket = true;
  gameContainer.classList.add("dragging");
  moveBucketToPointer(event);
}

function dragBucket(event) {
  if (!draggingBucket || !gameRunning || (gamePaused && !resumeCountdownActive)) return;
  moveBucketToPointer(event);
}

function endBucketDrag() {
  draggingBucket = false;
  gameContainer.classList.remove("dragging");
}

function moveBucketToPointer(event) {
  const gameRect = gameContainer.getBoundingClientRect();
  const bucketWidth = bucket.offsetWidth;
  const pointerX = getPointerClientX(event);

  if (pointerX < gameRect.left || pointerX > gameRect.right) return;

  let targetLeft = pointerX - gameRect.left - bucketWidth / 2;
  const maxLeft = gameRect.width - bucketWidth;
  targetLeft = Math.max(0, Math.min(targetLeft, maxLeft));
  bucket.style.left = `${targetLeft}px`;
  bucket.style.transform = "none";
}

function getPointerClientX(event) {
  if (event.touches && event.touches.length > 0) {
    return event.touches[0].clientX;
  }

  return event.clientX;
}

function isDropCaught(drop) {
  const dropRect = drop.getBoundingClientRect();
  const bucketRect = bucket.getBoundingClientRect();

  return (
    dropRect.bottom >= bucketRect.top &&
    dropRect.top <= bucketRect.bottom &&
    dropRect.right >= bucketRect.left &&
    dropRect.left <= bucketRect.right
  );
}

function clearDrops() {
  const drops = gameContainer.querySelectorAll(".water-drop");
  drops.forEach((drop) => drop.remove());
}

function centerBucket() {
  bucket.style.left = "50%";
  bucket.style.transform = "translateX(-50%)";
}
