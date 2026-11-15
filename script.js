// Pomodoro timer: 30 seconds for testing (normally 25 minutes), Start / Pause / Resume / Reset.
var TOTAL_MS = 30 * 1000;
var TILE_COUNT = 9;  // the painting is covered by 9 tiles (3 x 3)

var minutesEl = document.getElementById("minutes");
var secondsEl = document.getElementById("seconds");
var timerEl = document.querySelector(".timer");
var artEl = document.getElementById("art");
var frameEl = document.getElementById("frame");
var tilesEl = document.getElementById("tiles");
var mainBtn = document.getElementById("main-btn");
var resetBtn = document.getElementById("reset-btn");
var restartBtn = document.getElementById("restart-btn");
var panelEl = document.getElementById("panel");
var titleEl = document.getElementById("painting-title");
var artistEl = document.getElementById("painting-artist");
var yearEl = document.getElementById("painting-year");
var linkEl = document.getElementById("painting-link");

var state = "ready"; // ready, running, paused or done
var remainingMs = TOTAL_MS;
var endTime = 0; // the clock time when the timer should hit 00:00
var intervalId = null;

// ---------- Tiles that uncover the painting ----------

var tileEls = [];
var tileOrder = []; // the order the tiles are uncovered in (random for each painting)

for (var t = 0; t < TILE_COUNT; t++) {
  var tile = document.createElement("div");
  tile.className = "tile";
  tilesEl.appendChild(tile);
  tileEls.push(tile);
}

// Uncovers one more tile for every ninth of the time that has passed.
function showTiles(done) {
  var uncovered = Math.min(TILE_COUNT, Math.floor(done * TILE_COUNT + 1e-9));
  tileEls.forEach(function (el) { el.classList.remove("gone"); });
  for (var i = 0; i < uncovered; i++) {
    tileEls[tileOrder[i]].classList.add("gone");
  }
}

// ---------- Painting from the Met Museum ----------

var MET_API = "https://collectionapi.metmuseum.org/public/collection";
var painting = null;    // the one painting (image and details) for this session
var paintingToken = 0;  // lets us ignore an old answer if a newer painting was asked for

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Asks the Met for something. If the Met refuses (for example "403"), this fails.
function getJson(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error("The Met said " + r.status);
    return r.json();
  });
}

function shuffle(list) {
  for (var i = list.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

// A painting we can use: public domain, a painting, and it has an image.
function usable(o) {
  return o && o.isPublicDomain && /painting/i.test(o.classification || "") &&
    (o.primaryImageSmall || o.primaryImage);
}

// Asks the Met gently: one painting at a time, with a short pause between requests.
// If the Met says no, wait a little and try again. Gives up only if a newer painting was asked for.
async function pickPainting(token) {
  var search = MET_API + "/v1.1/search?hasImages=true&medium=Paintings&departmentId=11"; // 11 = European Paintings
  var total = 0;
  var waitMs = 1000;
  while (token === paintingToken) {
    try {
      if (!total) total = (await getJson(search + "&limit=1")).total;
      var maxOffset = Math.max(0, Math.min(total, 10000) - 50);
      var offset = Math.floor(Math.random() * (maxOffset + 1));
      var list = await getJson(search + "&limit=50&offset=" + offset);
      var ids = shuffle(list.objectIDs || []);
      for (var i = 0; i < ids.length; i++) {
        if (token !== paintingToken) return null;
        await sleep(150);
        try {
          var record = await getJson(MET_API + "/v1/objects/" + ids[i]);
          if (usable(record)) return record;
        } catch (e) {
          await sleep(waitMs); // the Met said no to this one: pause, then go on to the next
        }
      }
      waitMs = 1000;
    } catch (e) {
      await sleep(waitMs); // the Met said no to the list: wait longer each time, up to 5 seconds
      waitMs = Math.min(waitMs + 1000, 5000);
    }
  }
  return null;
}

function loadPainting() {
  var token = ++paintingToken;
  painting = null;
  frameEl.classList.remove("loaded");
  artEl.removeAttribute("src");
  tileOrder = shuffle(tileEls.map(function (el, i) { return i; }));
  pickPainting(token).then(function (o) {
    if (!o || token !== paintingToken) return;
    // Image and details come from this same record.
    painting = {
      image: o.primaryImageSmall || o.primaryImage,
      title: o.title || "Unknown",
      artist: o.artistDisplayName || "Unknown",
      year: o.objectDate || "Unknown",
      link: o.objectURL
    };
    artEl.src = painting.image;
  });
}

// Once the image has loaded, shape the frame like the painting.
artEl.addEventListener("load", function () {
  frameEl.style.setProperty("--ratio", artEl.naturalWidth + " / " + artEl.naturalHeight);
  frameEl.classList.add("loaded");
});

function showDetails() {
  if (!painting) return;
  titleEl.textContent = painting.title;
  artistEl.textContent = painting.artist;
  yearEl.textContent = painting.year;
  linkEl.href = painting.link;
  panelEl.hidden = false;
}

function clearDetails() {
  panelEl.hidden = true;
  titleEl.textContent = "";
  artistEl.textContent = "";
  yearEl.textContent = "";
  linkEl.removeAttribute("href");
}

// ---------- Soft chime (made with the browser's Web Audio) ----------

var audioCtx = null;
var chimeParts = []; // the booked tones, so they can be cancelled

// Browsers only allow sound after a click, so this is called from the buttons.
function unlockAudio() {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function bookTone(freq, start, length, volume) {
  var osc = audioCtx.createOscillator();
  var gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
  chimeParts.push({ osc: osc, gain: gain });
}

// Books the chime for the exact finish time on the browser's sound clock.
// That clock is not slowed down when the tab is in the background.
function bookChime(secondsFromNow) {
  cancelChime();
  if (!audioCtx) return;
  var t = audioCtx.currentTime + secondsFromNow;
  bookTone(1318.5, t, 2.5, 0.35);
  bookTone(1975.5, t, 1.8, 0.18);
  bookTone(2637, t, 1.0, 0.08);
}

// Cancels a booked chime, or quickly fades out one that is already ringing.
function cancelChime() {
  if (!audioCtx) { chimeParts = []; return; }
  var now = audioCtx.currentTime;
  chimeParts.forEach(function (p) {
    try {
      var v = p.gain.gain.value;
      p.gain.gain.cancelScheduledValues(now);
      p.gain.gain.setValueAtTime(v, now);
      p.gain.gain.linearRampToValueAtTime(0, now + 0.06);
      p.osc.stop(now + 0.07);
    } catch (e) {}
  });
  chimeParts = [];
}

// ---------- Timer ----------

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

  showTiles(1 - remainingMs / TOTAL_MS);
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
    // Finished: the whole painting is showing; details and Restart session button appear.
    mainBtn.hidden = true;
    resetBtn.hidden = true;
    restartBtn.hidden = false;
    showDetails();
  }
}

function startRunning() {
  endTime = Date.now() + remainingMs;
  state = "running";
  mainBtn.textContent = "Pause";
  stopTicking();
  intervalId = setInterval(tick, 200);
  bookChime(remainingMs / 1000);
}

mainBtn.addEventListener("click", function () {
  if (state === "ready" || state === "paused") {
    unlockAudio();
    startRunning();
  } else if (state === "running") {
    remainingMs = Math.max(0, endTime - Date.now());
    state = "paused";
    stopTicking();
    cancelChime();
    show();
    mainBtn.textContent = "Resume";
  }
});

// Puts the page back to how it looked before starting.
function resetAll() {
  stopTicking();
  cancelChime();
  state = "ready";
  remainingMs = TOTAL_MS;
  mainBtn.hidden = false;
  resetBtn.hidden = false;
  restartBtn.hidden = true;
  clearDetails();
  mainBtn.textContent = "Start";
  show();
}

resetBtn.addEventListener("click", resetAll);

// Restart session: back to the start, with a new painting.
restartBtn.addEventListener("click", function () {
  resetAll();
  loadPainting();
});

document.addEventListener("visibilitychange", tick);

show();
loadPainting();
