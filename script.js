// Pomodoro timer: 30 seconds for testing (normally 25 minutes), Start / Pause / Resume / Reset.
var TOTAL_MS = 30 * 1000;
var BLUR_START = 26; // blur (in pixels) at the start
var BLUR_END = 4;    // blur (in pixels) at 00:00

var minutesEl = document.getElementById("minutes");
var secondsEl = document.getElementById("seconds");
var timerEl = document.querySelector(".timer");
var artEl = document.querySelector(".art");
var mainBtn = document.getElementById("main-btn");
var resetBtn = document.getElementById("reset-btn");
var restartBtn = document.getElementById("restart-btn");
var panelEl = document.getElementById("panel");

var state = "ready"; // ready, running, paused or done
var remainingMs = TOTAL_MS;
var endTime = 0; // the clock time when the timer should hit 00:00
var intervalId = null;

function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

function show() {
  var totalSeconds = Math.ceil(remainingMs / 1000);
  var m = Math.floor(totalSeconds / 60);
  var s = totalSeconds % 60;
  minutesEl.textContent = pad(m);
  secondsEl.textContent = pad(s);
  timerEl.setAttribute("aria-label", m + " minutes " + s + " seconds");

  var done = 1 - remainingMs / TOTAL_MS;
  var blur = BLUR_START - (BLUR_START - BLUR_END) * done;
  artEl.style.setProperty("--blur", blur.toFixed(1) + "px");
}

function stopTicking() {
  clearInterval(intervalId);
  intervalId = null;
}

// Works out the time left from the real clock, so it stays right
// even when the browser slows this page down in a background tab.
function tick() {
  if (state !== "running") return;
  remainingMs = Math.max(0, endTime - Date.now());
  show();
  if (remainingMs === 0) {
    state = "done";
    stopTicking();
    // Finished: sharp painting, details and Restart session button appear.
    artEl.style.setProperty("--blur", "0px");
    mainBtn.hidden = true;
    resetBtn.hidden = true;
    restartBtn.hidden = false;
    panelEl.hidden = false;
  }
}

function startRunning() {
  endTime = Date.now() + remainingMs;
  state = "running";
  mainBtn.textContent = "Pause";
  stopTicking();
  intervalId = setInterval(tick, 200);
}

mainBtn.addEventListener("click", function () {
  if (state === "ready" || state === "paused") {
    startRunning();
  } else if (state === "running") {
    remainingMs = Math.max(0, endTime - Date.now());
    state = "paused";
    stopTicking();
    show();
    mainBtn.textContent = "Resume";
  }
});

// Puts the page back to how it looked before starting.
function resetAll() {
  stopTicking();
  state = "ready";
  remainingMs = TOTAL_MS;
  mainBtn.hidden = false;
  resetBtn.hidden = false;
  restartBtn.hidden = true;
  panelEl.hidden = true;
  mainBtn.textContent = "Start";
  show();
}

resetBtn.addEventListener("click", resetAll);
restartBtn.addEventListener("click", resetAll);

document.addEventListener("visibilitychange", tick);

show();
