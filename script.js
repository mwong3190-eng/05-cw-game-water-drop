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
let currentLevel = 1;
let pendingLevelStart = null;
let cleanDropsCaught = 0;
let contaminantsCaught = 0;

const LEVEL_ONE_CONTAMINANT_CHANCE = 0.18;
const LEVEL_TWO_CONTAMINANT_CHANCE = 0.36;
const FINAL_LEVEL_CONTAMINANT_CHANCE = 0.45;
const CONTAMINANT_PENALTY = 1;
const LEVEL_ONE_DROP_TARGET = 10;
const LEVEL_TWO_DROP_TARGET = 10;
const FINAL_MILESTONE_DROP_TARGET = 15;
const LEVEL_TIME_LIMIT = 30;
const LEVEL_ONE_FALL_DURATION_SECONDS = 4.2;
const LEVEL_TWO_FALL_DURATION_SECONDS = 3.4;
const FINAL_LEVEL_FALL_DURATION_SECONDS = 2.5;

const WINNING_MESSAGES = [
  "Amazing work! You saved enough water drops to win!",
  "You crushed it! Hydration hero status unlocked!",
  "Victory! Your reflexes are unstoppable!",
  "Great job! You reached the target score!"
];

const LOSING_MESSAGES = [
  "Nice try!",
  "So close! You'll get there!",
  "Try again!",
  "Good effort! One more round and you can do it!"
];

const FINAL_MILESTONE_MESSAGE =
  "Final milestone unlocked! You collected 15 clean drops and avoided all contaminants!";
const LEVEL_ONE_FAIL_MESSAGE =
  "Level 1 not cleared. Catch at least 10 clean drops and avoid every contaminant.";
const LEVEL_TWO_START_MESSAGE =
  "Level 1 cleared! Level 2: Catch 10 clean drops and avoid all contaminants.";
const LEVEL_ONE_START_MESSAGE =
  "Level 1: catch at least 10 clean rain drops and avoid all contaminants";
const LEVEL_TWO_FAIL_MESSAGE =
  "Level 2 not cleared. Catch at least 10 clean drops and avoid every contaminant.";
const LEVEL_ONE_FACT_PANEL_MESSAGE =
  "<strong>Fact</strong>: Women and children globally spend 200 million hours every day just walking to collect water.<br><br><strong>Connection</strong>: In this game, your journey takes seconds. In real life, that walk takes hours away from school and work.";
const LEVEL_TWO_FACT_PANEL_MESSAGE =
  "<strong>Fact</strong>: Over 2 billion people are forced to use a drinking water source contaminated with feces.<br><br><strong>Connection</strong>: Dodging the contaminants in this level is a game for you, but avoiding waterborne bacteria is a daily matter of survival for millions.";

const PANEL_ACTION_SHOW_LEVEL_TWO_MILESTONE = "show-level-two-milestone";
const PANEL_ACTION_BEGIN_LEVEL_TWO = "begin-level-two";
const PANEL_ACTION_BEGIN_LEVEL_ONE = "begin-level-one";
const PANEL_ACTION_BEGIN_LEVEL_ONE_WITH_RESET = "begin-level-one-with-reset";
const PANEL_ACTION_BEGIN_FINAL_LEVEL = "begin-final-level";
const PANEL_ACTION_START_FINAL_ROUND = "start-final-round";

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const timerElement = document.querySelector(".timer");
const levelIndicatorElement = document.getElementById("level-indicator");
const gameContainer = document.getElementById("game-container");
const gameMessage = document.getElementById("game-message");
const gameMessageText = document.getElementById("game-message-text");
const milestoneCloseButton = document.getElementById("milestone-close-btn");
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
milestoneCloseButton.addEventListener("click", dismissFinalMilestoneMessage);

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
  gamePaused = true;

  showLevelOneStartPanel(withResetCountdown);
}

function showLevelOneStartPanel(withResetCountdown = false) {
  pendingLevelStart = withResetCountdown
    ? PANEL_ACTION_BEGIN_LEVEL_ONE_WITH_RESET
    : PANEL_ACTION_BEGIN_LEVEL_ONE;

  gameMessage.classList.add("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = LEVEL_ONE_START_MESSAGE;
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = true;
  setPauseButtonMode("pause");
}

function beginLevelOne(withResetCountdown = false) {
  pendingLevelStart = null;

  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = "";
  gameContainer.classList.remove("paused");

  if (withResetCountdown) {
    beginResetCountdown();
    return;
  }

  gamePaused = false;
  pauseButton.disabled = false;
  setPauseButtonMode("pause");

  // Create new drops every second (1000 milliseconds)
  startIntervals();
}

function resetGameUI() {
  score = 0;
  timeLeft = LEVEL_TIME_LIMIT;
  currentLevel = 1;
  pendingLevelStart = null;
  cleanDropsCaught = 0;
  contaminantsCaught = 0;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  setTimerWarningState(false);
  updateLevelIndicator();
  gameMessageText.textContent = "";
  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");
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
  setTimerWarningState(timeLeft <= 5);

  if (timeLeft <= 0) {
    endGame();
  }
}

function endGame() {
  if (currentLevel === 1) {
    handleLevelOneEnd();
    return;
  }

  if (currentLevel === 2) {
    handleLevelTwoEnd();
    return;
  }

  finishGameSession();

  const reachedPerfectMilestone =
    cleanDropsCaught >= FINAL_MILESTONE_DROP_TARGET && contaminantsCaught === 0;

  if (reachedPerfectMilestone) {
    gameMessage.classList.add("final-milestone");
    gameMessage.classList.remove("fact-panel");
    gameMessageText.textContent = FINAL_MILESTONE_MESSAGE;
    return;
  }

  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");

  const didWin = score >= 20;
  const messageList = didWin ? WINNING_MESSAGES : LOSING_MESSAGES;
  const randomIndex = Math.floor(Math.random() * messageList.length);
  gameMessageText.textContent = messageList[randomIndex];
}

function handleLevelOneEnd() {
  const reachedLevelOneMilestone =
    cleanDropsCaught >= LEVEL_ONE_DROP_TARGET && contaminantsCaught === 0;

  if (!reachedLevelOneMilestone) {
    finishGameSession();
    gameMessage.classList.remove("final-milestone");
    gameMessage.classList.remove("fact-panel");
    gameMessageText.textContent = LEVEL_ONE_FAIL_MESSAGE;
    return;
  }

  showLevelOneFactPanel();
}

function showLevelOneFactPanel() {
  stopIntervals();
  clearDrops();
  clearResumeCountdown();
  clearTimeout(scoreColorResetTimer);
  scoreElement.classList.remove("score-loss");

  pendingLevelStart = PANEL_ACTION_SHOW_LEVEL_TWO_MILESTONE;
  gamePaused = true;

  gameMessage.classList.add("final-milestone");
  gameMessage.classList.add("fact-panel");
  gameMessageText.innerHTML = LEVEL_ONE_FACT_PANEL_MESSAGE;
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = true;
  setPauseButtonMode("pause");
}

function showLevelTwoStartPanel() {
  stopIntervals();
  clearDrops();
  clearResumeCountdown();
  clearTimeout(scoreColorResetTimer);
  scoreElement.classList.remove("score-loss");

  pendingLevelStart = PANEL_ACTION_BEGIN_LEVEL_TWO;
  gamePaused = true;

  gameMessage.classList.add("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = LEVEL_TWO_START_MESSAGE;
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = true;
  setPauseButtonMode("pause");
}

function beginLevelTwo() {
  pendingLevelStart = null;

  currentLevel = 2;
  score = 0;
  timeLeft = LEVEL_TIME_LIMIT;
  cleanDropsCaught = 0;
  contaminantsCaught = 0;
  gamePaused = false;

  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  setTimerWarningState(false);
  updateLevelIndicator();
  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = "";
  gameContainer.classList.remove("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = false;
  setPauseButtonMode("pause");
  startIntervals();
}

function handleLevelTwoEnd() {
  const reachedLevelTwoMilestone =
    cleanDropsCaught >= LEVEL_TWO_DROP_TARGET && contaminantsCaught === 0;

  if (!reachedLevelTwoMilestone) {
    finishGameSession();
    gameMessage.classList.remove("final-milestone");
    gameMessage.classList.remove("fact-panel");
    gameMessageText.textContent = LEVEL_TWO_FAIL_MESSAGE;
    return;
  }

  showLevelTwoFactPanel();
}

function showLevelTwoFactPanel() {
  stopIntervals();
  clearDrops();
  clearResumeCountdown();
  clearTimeout(scoreColorResetTimer);
  scoreElement.classList.remove("score-loss");

  pendingLevelStart = PANEL_ACTION_BEGIN_FINAL_LEVEL;
  gamePaused = true;

  gameMessage.classList.add("final-milestone");
  gameMessage.classList.add("fact-panel");
  gameMessageText.innerHTML = LEVEL_TWO_FACT_PANEL_MESSAGE;
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = true;
  setPauseButtonMode("pause");
}

function beginFinalLevel() {
  stopIntervals();
  clearDrops();
  clearResumeCountdown();
  clearTimeout(scoreColorResetTimer);
  scoreElement.classList.remove("score-loss");

  currentLevel = 3;
  score = 0;
  timeLeft = LEVEL_TIME_LIMIT;
  cleanDropsCaught = 0;
  contaminantsCaught = 0;
  gamePaused = true;
  pendingLevelStart = PANEL_ACTION_START_FINAL_ROUND;

  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  setTimerWarningState(false);
  updateLevelIndicator();
  gameMessage.classList.add("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = "Level 2 cleared! Final Round: Catch 15 clean drops and avoid all contaminants.";
  gameContainer.classList.add("paused");
  gameContainer.classList.remove("dragging");
  draggingBucket = false;

  pauseButton.disabled = true;
  setPauseButtonMode("pause");
}

function startFinalRound() {
  pendingLevelStart = null;
  gamePaused = false;

  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = "";
  gameContainer.classList.remove("paused");

  pauseButton.disabled = false;
  setPauseButtonMode("pause");
  startIntervals();
}

function finishGameSession() {
  gameRunning = false;
  gamePaused = false;
  pendingLevelStart = null;
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
  setTimerWarningState(false);
  pauseButton.disabled = false;
  setPauseButtonMode("pause");
  gameContainer.classList.remove("paused");
  startIntervals();
}

function finishResumeCountdown() {
  clearResumeCountdown();
  if (!gameRunning) return;

  gamePaused = false;
  setTimerWarningState(false);
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

  const contaminantChance = getContaminantChanceForLevel();
  const isContaminant = Math.random() < contaminantChance;
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

  // Level 2 is 2 seconds faster than Level 1.
  let dropFallDurationSeconds = LEVEL_ONE_FALL_DURATION_SECONDS;
  if (currentLevel === 2) {
    dropFallDurationSeconds = LEVEL_TWO_FALL_DURATION_SECONDS;
  } else if (currentLevel === 3) {
    dropFallDurationSeconds = FINAL_LEVEL_FALL_DURATION_SECONDS;
  }
  drop.style.animationDuration = `${dropFallDurationSeconds}s`;

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
        contaminantsCaught += 1;
        score -= CONTAMINANT_PENALTY;
        showScoreLossFeedback();
      } else {
        cleanDropsCaught += 1;
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

function dismissFinalMilestoneMessage() {
  if (!gameMessage.classList.contains("final-milestone")) return;

  gameMessage.classList.remove("final-milestone");
  gameMessage.classList.remove("fact-panel");
  gameMessageText.textContent = "";

  if (pendingLevelStart === PANEL_ACTION_BEGIN_LEVEL_ONE) {
    beginLevelOne();
    return;
  }

  if (pendingLevelStart === PANEL_ACTION_BEGIN_LEVEL_ONE_WITH_RESET) {
    beginLevelOne(true);
    return;
  }

  if (pendingLevelStart === PANEL_ACTION_SHOW_LEVEL_TWO_MILESTONE) {
    showLevelTwoStartPanel();
    return;
  }

  if (pendingLevelStart === PANEL_ACTION_BEGIN_LEVEL_TWO) {
    beginLevelTwo();
    return;
  }

  if (pendingLevelStart === PANEL_ACTION_BEGIN_FINAL_LEVEL) {
    pendingLevelStart = null;
    beginFinalLevel();
    return;
  }

  if (pendingLevelStart === PANEL_ACTION_START_FINAL_ROUND) {
    startFinalRound();
  }
}

function getContaminantChanceForLevel() {
  if (currentLevel === 1) return LEVEL_ONE_CONTAMINANT_CHANCE;
  if (currentLevel === 2) return LEVEL_TWO_CONTAMINANT_CHANCE;
  return FINAL_LEVEL_CONTAMINANT_CHANCE;
}

function updateLevelIndicator() {
  if (currentLevel === 3) {
    levelIndicatorElement.textContent = "Final";
    return;
  }

  levelIndicatorElement.textContent = currentLevel;
}

function setTimerWarningState(isWarning) {
  timerElement.classList.toggle("time-warning", isWarning);
}
