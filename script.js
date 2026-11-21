// =====================================================
// 1. SETTINGS - change these numbers to tweak the game
// =====================================================
const SHIFT_SECONDS = 120;   // how long one shift lasts
const TARGET = 10;           // customers to serve for the target
const LEVEL_COUNT = 5;
const LEVEL_SECONDS = SHIFT_SECONDS / LEVEL_COUNT;
const LEVEL_GEMS = [10, 15, 20, 25, 30];
const ACCESSORIES = [
  { id: "star", name: "Star hair clip", icon: "🌟", price: 15 },
  { id: "glasses", name: "Cute glasses", icon: "🤓", price: 25 },
  { id: "scarf", name: "Berry scarf", icon: "🧣", price: 35 },
  { id: "crown", name: "Golden crown", icon: "👑", price: 50 }
];
let gems = Number(localStorage.getItem("sweetNookGems") || 0);
let ownedAccessories = JSON.parse(localStorage.getItem("sweetNookAccessories") || "[]");
let selectedAccessory = localStorage.getItem("sweetNookSelectedAccessory") || "";
let returnFromShop = "over";
const MAX_LINE = 8;          // the line can hold this many people
const START_LIVES = 3;

// How many seconds each customer will wait
const WAIT_TIME = { student: 15, employee: 10, senior: 20 };
const NAMES = { student: "Citizen", employee: "Employee", senior: "Senior", lolo: "Lolo", lola: "Lola", pwd: "PWD", queen: "Queen", princess: "Princess", prince: "Prince", king: "King" };

// The 5 cakes you can serve
const CAKES = [
  { name: "Strawberry", cake: "#ffb3c6", cream: "#fff3f6", topping: "#ff5c7a" },
  { name: "Matcha",     cake: "#b9dd9e", cream: "#eef7e1", topping: "#6fb86a" },
  { name: "Choco",      cake: "#9a6650", cream: "#c99a7c", topping: "#6a4032" },
  { name: "Blueberry",  cake: "#bfb0f2", cream: "#f1ecff", topping: "#6b6bd6" },
  { name: "Lemon",      cake: "#ffe58a", cream: "#fffbe0", topping: "#ffe14d" }
];

const OUTLINE = "#6b4a43";

// =====================================================
// 2. SOUND - small beeps made with the browser
// =====================================================
let audioContext = null;

function playTone(frequency, length, type, delay) {
  try {
    if (audioContext === null) { audioContext = new AudioContext(); }
    const osc = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const start = audioContext.currentTime + (delay || 0);
    osc.type = type || "sine";
    osc.frequency.value = frequency;
    volume.gain.setValueAtTime(0.12, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(volume);
    volume.connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + length);
  } catch (error) { /* no sound available, that's okay */ }
}

function soundClick() { playTone(880, 0.08); playTone(1320, 0.1, "sine", 0.06); }
function soundGood()  { playTone(784, 0.15); playTone(988, 0.15, "sine", 0.08); playTone(1319, 0.2, "sine", 0.16); }
function soundBad()   { playTone(300, 0.2, "sawtooth"); playTone(220, 0.25, "sawtooth", 0.12); }
function soundTick()  { playTone(1500, 0.05, "square"); }
function soundRush()  { playTone(440, 0.15, "square"); playTone(660, 0.3, "square", 0.2); }
function soundWin()   { playTone(523, 0.2, "triangle"); playTone(659, 0.2, "triangle", 0.15); playTone(784, 0.2, "triangle", 0.3); playTone(1047, 0.3, "triangle", 0.45); }
function soundPlay()  { playTone(523, 0.2, "triangle"); playTone(659, 0.2, "triangle", 0.1); playTone(784, 0.2, "triangle", 0.2); playTone(1047, 0.3, "triangle", 0.3); }

// =====================================================
// 3. DRAWING HELPERS - shapes used to draw everything
// =====================================================
function drawOval(ctx, x, y, radiusX, radiusY, color, withLine) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (withLine) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawBox(ctx, x, y, width, height, corner, color) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, corner);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTriangle(ctx, x1, y1, x2, y2, x3, y3, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Draw one cake. (x, y) is the middle of the plate, size 1 = normal.
function drawCake(ctx, x, y, size, cakeIndex) {
  const cake = CAKES[cakeIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  drawOval(ctx, 0, 0, 58, 12, "#fffaf0", true);            // plate
  drawBox(ctx, -38, -50, 76, 46, 10, cake.cake);            // cake body
  ctx.fillStyle = cake.cream;
  ctx.fillRect(-37, -32, 74, 8);                            // cream stripe
  for (let i = 0; i < 5; i++) {                             // cream drips
    drawOval(ctx, -30 + i * 15, -46, 8, 8, cake.cream, true);
  }
  drawOval(ctx, 0, -50, 38, 11, cake.cream, true);          // frosting on top

  // topping on top (each cake gets its own)
  if (cakeIndex === 0) {                                    // strawberry
    drawOval(ctx, 0, -62, 10, 9, cake.topping, true);
    drawOval(ctx, 0, -71, 7, 3, "#7ccf7a", true);
  } else if (cakeIndex === 1) {                             // matcha leaves
    drawOval(ctx, -6, -60, 9, 4, cake.topping, true);
    drawOval(ctx, 6, -63, 9, 4, "#8fd081", true);
  } else if (cakeIndex === 2) {                             // chocolate swirl
    drawOval(ctx, 0, -60, 12, 6, cake.topping, true);
    drawOval(ctx, 0, -67, 8, 5, "#7b4a3a", true);
  } else if (cakeIndex === 3) {                             // blueberries
    drawOval(ctx, -10, -60, 6, 6, cake.topping, true);
    drawOval(ctx, 10, -60, 6, 6, cake.topping, true);
    drawOval(ctx, 0, -65, 6, 6, cake.topping, true);
  } else {                                                  // lemon slice
    drawOval(ctx, 0, -63, 11, 11, cake.topping, true);
    drawOval(ctx, 0, -63, 8, 8, "#fff6a8", false);
  }
 ctx.restore();
}

// Draw a chibi person. (x, feetY) is where their feet are.
// "look" says how they look, "mood" is "happy", "neutral" or "sad".
function drawPerson(ctx, x, feetY, size, look, mood, time) {
  ctx.save();
  ctx.translate(x, feetY + Math.sin(time * 3 + x) * 1.5);   // gentle bobbing
  ctx.scale(size, size);

  // legs and shoes
  drawBox(ctx, -14, -8, 11, 8, 4, look.skin);
  drawBox(ctx, 3, -8, 11, 8, 4, look.skin);
  drawOval(ctx, -9, 0, 8, 4, "#7a4b4b", true);
  drawOval(ctx, 9, 0, 8, 4, "#7a4b4b", true);
  if (look.kind === "pwd") {
    // Clear wheelchair silhouette beside the seated guest
    ctx.strokeStyle = "#527d91"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-27, -4, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-25, -20); ctx.lineTo(-25, -48); ctx.lineTo(8, -48); ctx.lineTo(18, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-25, -20); ctx.lineTo(9, -20); ctx.stroke();
    drawOval(ctx, -27, -4, 3, 3, "#527d91", true);
  }

  // hair behind the head
  if (look.style === "long")     { drawBox(ctx, -37, -98, 74, 66, 28, look.hair); }
  if (look.style === "pigtails") { drawOval(ctx, -40, -60, 11, 17, look.hair, true); drawOval(ctx, 40, -60, 11, 17, look.hair, true); }
  if (look.style === "bun")      { drawOval(ctx, 0, -104, 15, 13, look.hair, true); }

  // walking cane (seniors only)
  if (["senior", "lolo", "lola"].includes(look.kind)) {
    ctx.strokeStyle = "#a0714f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34, -4);
    ctx.lineTo(34, -34);
    ctx.stroke();
  }

  // body
  drawBox(ctx, -20, -38, 40, 34, 13, look.outfit);

  // clothes for each kind of person
  if (look.kind === "student") {
    drawTriangle(ctx, -10, -38, 10, -38, 0, -26, "#ffffff");
    drawOval(ctx, 0, -30, 5, 3.5, "#ff6b8b", true);          // ribbon
  }
  if (look.kind === "employee") {
    drawTriangle(ctx, -9, -38, 9, -38, 0, -22, "#ffffff");
    drawTriangle(ctx, 0, -34, -3, -30, 3, -30, "#e35d6a");   // tie top
    drawTriangle(ctx, -3, -30, 3, -30, 0, -20, "#e35d6a");   // tie bottom
  }
  if (["senior", "lolo", "lola"].includes(look.kind)) {
    drawBox(ctx, -23, -40, 46, 16, 8, "#f3c6e8");            // shawl
  }
  if (look.kind === "player") {
    drawBox(ctx, -14, -36, 28, 32, 8, "#fffaf1");            // apron
    drawOval(ctx, 0, -18, 3.5, 3.5, "#ff8fb1", false);
  }

  // arms and hands
  drawOval(ctx, -24, -26, 6, 9, look.outfit, true);
  drawOval(ctx, 24, -26, 6, 9, look.outfit, true);
  drawOval(ctx, -25, -17, 4.5, 4.5, look.skin, true);
  drawOval(ctx, 25, -17, 4.5, 4.5, look.skin, true);

  // head
  drawOval(ctx, 0, -66, 34, 31, look.skin, true);

  // hair in front (the fringe)
  ctx.beginPath();
  ctx.ellipse(0, -72, 35, 28, 0, Math.PI, Math.PI * 2);
  for (let i = 0; i < 5; i++) {
    const endX = 35 - 14 * (i + 1);
    ctx.quadraticCurveTo(endX + 7, -52, endX, -72);
  }
  ctx.fillStyle = look.hair;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // cheeks
  drawOval(ctx, -21, -49, 6, 3.6, "rgba(255,120,150,0.45)", false);
  drawOval(ctx, 21, -49, 6, 3.6, "rgba(255,120,150,0.45)", false);

  // eyes and mouth depend on the mood
  ctx.strokeStyle = "#3b2a2a";
  ctx.lineWidth = 2.5;
  if (mood === "happy") {
    ctx.beginPath(); ctx.arc(-12, -54, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -54, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -49, 6, 0, Math.PI); ctx.fillStyle = "#ff7a8a"; ctx.fill(); ctx.stroke();
  } else {
    drawOval(ctx, -12, -56, 4.2, 5.5, "#3b2a2a", false);
    drawOval(ctx, 12, -56, 4.2, 5.5, "#3b2a2a", false);
    drawOval(ctx, -13.5, -58, 1.6, 1.6, "#ffffff", false);   // eye sparkle
    drawOval(ctx, 10.5, -58, 1.6, 1.6, "#ffffff", false);
    ctx.beginPath();
    if (mood === "sad") { ctx.arc(0, -44, 5, Math.PI * 1.15, Math.PI * 1.85); }   // frown
    else { ctx.arc(0, -50, 4, 0.15 * Math.PI, 0.85 * Math.PI); }                  // smile
    ctx.stroke();
  }

  // extras
  if (["employee", "senior", "lolo", "lola"].includes(look.kind)) {  // glasses
    ctx.strokeStyle = "#8a6a5a";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-12, -56, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -56, 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (["queen", "princess", "prince", "king"].includes(look.kind)) {
    ctx.fillStyle = look.kind === "king" || look.kind === "prince" ? "#f2c94c" : "#f5c542";
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-20, -91); ctx.lineTo(-15, -108); ctx.lineTo(-5, -98); ctx.lineTo(0, -115); ctx.lineTo(7, -98); ctx.lineTo(17, -108); ctx.lineTo(21, -91); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (look.kind === "king" || look.kind === "prince") { drawBox(ctx, -22, -39, 44, 8, 3, "#f2c94c"); }
  }
  if (look.kind === "player") {                              // baker hat
    drawOval(ctx, 0, -93, 23, 8, "#ffffff", true);
    drawOval(ctx, 0, -99, 13, 8, "#ffffff", true);
    drawOval(ctx, 6, -106, 3.5, 3.5, "#ff5c7a", true);
    if (look.accessory === "star") { drawOval(ctx, 25, -84, 7, 7, "#ffd84d", true); }
    if (look.accessory === "glasses") { ctx.strokeStyle = "#8a5a9b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-12,-56,8,0,Math.PI*2); ctx.arc(12,-56,8,0,Math.PI*2); ctx.moveTo(-4,-56); ctx.lineTo(4,-56); ctx.stroke(); }
    if (look.accessory === "scarf") { drawBox(ctx, -18, -39, 36, 8, 4, "#c94f75"); drawBox(ctx, 8, -36, 7, 18, 3, "#c94f75"); }
    if (look.accessory === "crown") { ctx.fillStyle = "#f5c542"; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18,-101); ctx.lineTo(-14,-115); ctx.lineTo(-4,-106); ctx.lineTo(0,-120); ctx.lineTo(7,-106); ctx.lineTo(17,-115); ctx.lineTo(19,-101); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (look.girl && look.kind !== "senior" && look.kind !== "player") {   // hair bow
    drawTriangle(ctx, 24, -90, 34, -96, 34, -84, "#ff8fb1");
    drawTriangle(ctx, 24, -90, 14, -96, 14, -84, "#ff8fb1");
  }
  
}

// =====================================================
// 4. CHOOSING YOUR BAKER
// =====================================================
const skinColors = ["#ffe0cc", "#f6c9a6", "#d9a077"];
const hairColors = ["#5a3a2e", "#2b2b3a", "#e8a5b5", "#f2c46d", "#8e7cc3"];
const outfitColors = ["#ff9eb5", "#9ed8ff", "#b7e4a4", "#ffd37a", "#c9b1ff"];
const hairStyles = ["short", "bun", "pigtails", "long"];

const presets = [
  { name: "Khloie",    girl: true,  skin: 0, hair: 2, style: 2, outfit: 0 },
  { name: "Shantel",   girl: false, skin: 1, hair: 1, style: 0, outfit: 1 },
  { name: "Princess",  girl: true,  skin: 1, hair: 4, style: 3, outfit: 4 },
  { name: "Amor",      girl: false, skin: 2, hair: 3, style: 0, outfit: 3 }
];

// The choices the player has made (numbers point into the lists above)
const baker = { girl: true, skin: 0, hair: 0, style: 2, outfit: 0 };

function getBakerLook() {
  return {
    kind: "player",
    girl: baker.girl,
    skin: skinColors[baker.skin],
    hair: hairColors[baker.hair],
    style: hairStyles[baker.style],
    outfit: outfitColors[baker.outfit],
    accessory: selectedAccessory
  };
}

// Make a row of buttons inside an element. "key" is which baker setting it changes.
function makeChoiceButtons(elementId, list, key, isColor) {
  const holder = document.getElementById(elementId);
  holder.innerHTML = "";
  for (let i = 0; i < list.length; i++) {
    const button = document.createElement("button");
    button.className = "choice" + (isColor ? " swatch" : "") + (baker[key] === i ? " picked" : "");
    if (isColor) { button.style.background = list[i]; } else { button.textContent = list[i]; }
    button.onclick = function () { baker[key] = i; soundClick(); refreshPickScreen(); };
    holder.appendChild(button);
  }
}

function refreshPickScreen() {
  makeChoiceButtons("skin-buttons", skinColors, "skin", true);
  makeChoiceButtons("style-buttons", hairStyles, "style", false);
  makeChoiceButtons("hair-buttons", hairColors, "hair", true);
  makeChoiceButtons("outfit-buttons", outfitColors, "outfit", true);
  document.getElementById("girl-button").className = "choice" + (baker.girl ? " picked" : "");
  document.getElementById("boy-button").className = "choice" + (baker.girl ? "" : " picked");
}

function setGender(isGirl) {
  baker.girl = isGirl;
  baker.style = isGirl ? 2 : 0;
  soundClick();
  refreshPickScreen();
}

function makePresetButtons() {
  const holder = document.getElementById("preset-buttons");
  presets.forEach(function (preset) {
    const button = document.createElement("button");
    button.className = "choice";
    button.textContent = preset.name;
    button.onclick = function () {
      baker.girl = preset.girl; baker.skin = preset.skin; baker.hair = preset.hair;
      baker.style = preset.style; baker.outfit = preset.outfit;
      soundClick();
      refreshPickScreen();
    };
    holder.appendChild(button);
  });
}

// =====================================================
// 5. GAME STATE - everything that changes while playing
// =====================================================
let game = null;           // filled in by startGame()
let currentScreen = "title";
let clock = 0;             // total seconds, used for bobbing animation
let bestScore = 0;

const gameCanvas = document.getElementById("game-canvas");
const ctx = gameCanvas.getContext("2d");

function showScreen(name) {
  currentScreen = name;
  const names = ["title", "pick", "game", "over", "shop"];
  for (let i = 0; i < names.length; i++) {
    document.getElementById(names[i] + "-screen").className = "screen" + (names[i] === name ? " show" : "");
  }
}

function say(text) { document.getElementById("message").textContent = text; }
function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]; }

const wrongTaunts = ["Reading is hard, huh?", "A seagull could do better.", "Bold choice. Wrong, but bold."];
const lateTaunts = ["Tick tock, baker.", "They aged a year waiting.", "Slow like a snail in pudding."];
const goodTaunts = ["The bare minimum. Gold star!", "Luck. Pure luck.", "Impressive... for a beginner."];

function startGame(isTutorial) {
  game = {
    isTutorial: isTutorial,
    running: true,
    line: [],              // customers waiting in line (first one is at index 0)
    atCounter: null,       // the customer being served right now
    leaving: [],           // customers walking away (just for the animation)
    customerCount: 0,      // used to number the customers
    served: 0,
    score: 0,
    combo: 0,
    lives: START_LIVES,
    level: 1,
    timeUsed: 0,           // seconds of the shift that have passed
    patience: 0,           // seconds the current person has waited
    patienceMax: 1,        // seconds they are allowed to wait
    nextArrival: 2,        // seconds until the next customer joins the line
    nextRush: 15,          // shift time when the next rush hour starts
    rushArrivals: [],      // countdowns for customers arriving in a rush
    levelCustomers: [],
    levelSpawned: 0,
    flyingCake: null,      // the cake sliding onto the counter
    particles: [],         // little hearts and stars
    banner: null,          // "RUSH HOUR!" and "LEVEL UP!" messages
    happyTimer: 0,         // makes the baker smile after a good serve
    targetHit: false,
    finalRewardPaid: false,
    step: 0,               // tutorial step
    lastBeepSecond: 0
  };
  showScreen("game");
  document.getElementById("coach").style.display = isTutorial ? "block" : "none";
  say("");
  if (isTutorial) {
    showTutorialStep(0);
  } else {
    game.levelCustomers = buildLevelCustomers(1);
    for (let i = 0; i < 3; i++) { addToLine(game.levelCustomers[game.levelSpawned++]); }
    say("The cafe is open! Serve all 6 customers in Level 1.");
  }
  refreshScreen();
}

// =====================================================
// 6. CUSTOMERS AND THE LINE
// =====================================================

// Make one customer. Special visitors keep their display name and visual traits.
function makeCustomer(kind, orders, displayName) {
  const isGirl = kind === "lola" || kind === "queen" || kind === "princess" ? true :
                 kind === "lolo" || kind === "king" || kind === "prince" ? false : Math.random() < 0.5;
  const outfits = { student: "#7fb2ff", employee: "#8d93a8", senior: "#d8a6e6", lolo: "#b7c6d9", lola: "#e7b6d4", pwd: "#91c9bd", queen: "#d8a0d8", princess: "#f2a6c5", prince: "#8eb8e8", king: "#d9b45b" };
  let hair = pickRandom(hairColors), style = pickRandom(hairStyles);
  if (["senior", "lolo", "lola"].includes(kind)) { hair = pickRandom(["#e9e9ef", "#cfcfd8"]); style = "short"; }
  if (["queen", "princess", "king", "prince"].includes(kind)) { hair = kind === "king" || kind === "prince" ? "#6a4937" : "#5a3a2e"; style = "long"; }
  game.customerCount++;
  const done = orders.map(() => false);
  const waitKey = ["lolo", "lola", "senior"].includes(kind) ? "senior" : kind === "employee" ? "employee" : "student";
  let serveTime = WAIT_TIME[waitKey];
  if (kind === "employee") serveTime += 2 * (orders.length - 1);
  return {
    id: game.customerCount, kind: kind, displayName: displayName || NAMES[kind] || kind,
    look: { kind: kind, girl: isGirl, skin: pickRandom(skinColors), hair, style, outfit: outfits[kind] || outfits.student },
    orders, done, waitTime: kind === "pwd" ? 22 : WAIT_TIME[waitKey], serveTime: kind === "pwd" ? 22 : serveTime,
    x: 950, state: "line", mood: "neutral"
  };
}

const LEVEL_CUSTOMER_COUNTS = [6, 8, 10, 12, 13];
const ROYAL_VISITORS = [
  [],
  [{kind:"queen", name:"Ma'am Sharyl"}],
  [{kind:"queen", name:"Ma'am Sharyl"},{kind:"princess", name:"Ma'am Sarah"}],
  [{kind:"queen", name:"Ma'am Sharyl"},{kind:"princess", name:"Ma'am Sarah"},{kind:"princess", name:"Ma'am Desire"},{kind:"prince", name:"Sir Lito"}],
  [{kind:"king", name:"Sir Jackson"},{kind:"queen", name:"Ma'am Sharyl"},{kind:"princess", name:"Ma'am Sarah"},{kind:"princess", name:"Ma'am Desire"},{kind:"prince", name:"Sir Lito"}]
];
function randomCitizenSpec() {
  const kind = pickRandom(["student", "lolo", "lola", "employee", "pwd"]);
  const howMany = kind === "employee" ? (game.level >= 3 ? 3 : 2) : 1;
  const orders = Array.from({length: howMany}, () => Math.floor(Math.random() * CAKES.length));
  const labels = {student:"Citizen", lolo:"Lolo", lola:"Lola", employee:"Employee", pwd:"PWD"};
  return {kind, orders, displayName: labels[kind]};
}
function buildLevelCustomers(level) {
  const total = LEVEL_CUSTOMER_COUNTS[level - 1];
  const royals = ROYAL_VISITORS[level - 1].map(v => ({kind:v.kind, displayName:v.name, orders:[Math.floor(Math.random()*CAKES.length)]}));
  const specs = royals.slice();
  while (specs.length < total) specs.push(randomCitizenSpec());
  // Mix the royal visitors into the queue so they arrive as special guests, not all at once.
  for (let i = specs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [specs[i], specs[j]] = [specs[j], specs[i]]; }
  return specs;
}
function randomCustomerSpec() { return randomCitizenSpec(); }
function addToLine(spec) {
  if (game.line.length >= MAX_LINE) return false;
  if (spec === null) spec = randomCustomerSpec();
  game.line.push(makeCustomer(spec.kind, spec.orders, spec.displayName));
  if (game.line.length === 1 && game.atCounter === null) startPatience(game.line[0].waitTime);
  return true;
}

// Start the patience timer. People get less patient as the shift goes on.
function shiftProgress() {
  if (game.isTutorial) { return 0; }
  return Math.min(1, game.timeUsed / SHIFT_SECONDS);   // 0 at the start, 1 at the end
}
function startPatience(seconds) {
  game.patience = 0;
  game.patienceMax = seconds * (1 - 0.5 * shiftProgress())
}
function patienceLeft() {                               // 1 = full, 0 = out of patience
  return Math.max(0, 1 - game.patience / game.patienceMax)
}
function startPatienceForFront() {
  if (game.line.length > 0) { startPatience(game.line[0].waitTime); }
}

// =====================================================
// 7. PLAYER ACTIONS
// =====================================================

// Bring the first person in line to the counter
function callNext() {
  if (game === null || !game.running || currentScreen !== "game") { return; }
  if (game.atCounter !== null) { say("You're still serving someone!"); return; }
  if (game.line.length === 0) { say("Nobody is in line!"); return; }

  const customer = game.line.shift();      // take the first person out of the line
  customer.x = 950;
  customer.state = "walking";
  game.atCounter = customer;
  startPatience(customer.serveTime);
  soundClick();
  say("");
  refreshScreen();
}

// The player tapped a customer card in the line
function tapLine(position) {
  if (!game.running) { return; }
  if (position > 0) {                      // tried to skip the line
    if (game.isTutorial) { showCoach("First come, first served! Tap the FIRST customer."); return; }
    game.combo = 0;
    game.score = Math.max(0, game.score - 5);
    soundBad();
    say("No skipping the line! -5 points.");
    updateHud();
    return;
  }
   callNext();
}

// The player pressed a cake button
function serveCake(cakeIndex) {
  if (currentScreen !== "game" || !game.running) { return; }
  soundClick();

  const customer = game.atCounter;
  if (customer === null || customer.state !== "waiting") {
    say("Call the next customer from the line first!");
    return;
  }

  // Is this cake on their order (and not already served)?
  let found = -1;
  for (let i = 0; i < customer.orders.length; i++) {
    if (customer.orders[i] === cakeIndex && !customer.done[i]) { found = i; break; }
  }

  if (found === -1) {                      // wrong cake
    if (game.isTutorial) { showCoach("That's not on their order. Look at the bubble!"); return; }
    game.combo = 0;
    game.score = Math.max(0, game.score - 3);
    game.patience = game.patience + 1.5;   // they get grumpier
    soundBad();
    say("Wrong cake! -3 points. " + pickRandom(wrongTaunts));
   
    return;
  }

  customer.done[found] = true;
  game.flyingCake = { cake: cakeIndex, time: 0 };

  // Are there still cakes left on the order?
  let allDone = true;
  for (let i = 0; i < customer.done.length; i++) { if (!customer.done[i]) { allDone = false; } }
  if (!allDone) { soundGood(); return; }

  // The whole order is finished!
  let points = 0;
  if (!game.isTutorial) { points = 10 + Math.round(patienceLeft() * 10) + game.combo * 2; }
  game.served = game.served + 1;
  game.combo = game.combo + 1;
  game.score = game.score + points;
  game.happyTimer = 1.2;
  soundGood();
  addParticles(customer.x, 260, "💖");

  game.atCounter = null;
  customer.mood = "happy";
  customer.state = "leaving";
  customer.leaveTimer = 1;
  game.leaving.push(customer);
  startPatienceForFront();

  if (!game.isTutorial) {
    say("+" + points + " points! " + pickRandom(goodTaunts));
    if (game.served >= TARGET && !game.targetHit) {
      game.targetHit = true;
      soundWin();
      say("Target reached: " + TARGET + " customers served! The shift goes on.");
    }
  } else if (game.line.length === 0) {
    const stepNow = game.step;             // go to the next tutorial step shortly
    setTimeout(function () {
      if (game !== null && game.isTutorial && game.step === stepNow) { showTutorialStep(stepNow + 1); }
    }, 1000);
  }
  refreshScreen();
}

function loseLife(message, tauntList) {
  game.lives = game.lives - 1;
  game.combo = 0;
  soundBad();
  say(message + " " + pickRandom(tauntList));
  addParticles(560, 260, "💔");
  updateHud();
  if (game.lives <= 0) { endGame(false); }
}

function startRush() {
  game.banner = { text: "RUSH HOUR!", time: 1.6, color: "#d9442b" };
  soundRush();
  say("RUSH HOUR! Here comes the crowd!");
  const howMany = 3 + Math.floor(shiftProgress() * 3);
  for (let i = 0; i < howMany; i++) { game.rushArrivals.push(0.65 + i); }   // one every second
}

function addParticles(x, y, emoji) {
  for (let i = 0; i < 6; i++) {
    game.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 1, emoji: emoji });
  }
}

function endGame(won) {
  game.running = false;
  if (game.score > bestScore) { bestScore = game.score; }
  let title = "Shop closed. Because of you.";
  if (won) {
    let stars = "⭐";
    if (game.lives === 2) { stars = "⭐⭐"; }
    if (game.lives >= 3) { stars = "⭐⭐⭐"; }
    title = "Shift complete! " + stars;
    soundWin();
  } else {
    playTone(392, 0.35, "sawtooth"); playTone(370, 0.35, "sawtooth", 0.3); playTone(330, 0.5, "sawtooth", 0.6);
  }
  document.getElementById("over-title").textContent = title;
  document.getElementById("over-score").textContent = game.score;
  document.getElementById("over-served").textContent = game.served + (game.targetHit ? " 🎯" : "/" + TARGET);
  document.getElementById("over-best").textContent = bestScore;
  document.getElementById("over-title").textContent += "  💎 " + gems + " gems total";
  showScreen("over");
}

// =====================================================
// GEM REWARDS AND ACCESSORY SHOP
// =====================================================
function awardLevelGems(levelNumber) {
  const reward = LEVEL_GEMS[levelNumber - 1] || 0;
  gems += reward;
  localStorage.setItem("sweetNookGems", String(gems));
  say("Level " + levelNumber + " complete! You earned " + reward + " gems 💎");
}
function openShop(fromScreen) {
  returnFromShop = fromScreen || "over";
  renderShop();
  showScreen("shop");
}
function renderShop() {
  document.getElementById("shop-gems").textContent = gems;
  const holder = document.getElementById("shop-items");
  holder.innerHTML = "";
  ACCESSORIES.forEach(function(item) {
    const owned = ownedAccessories.includes(item.id);
    const equipped = selectedAccessory === item.id;
    const button = document.createElement("button");
    button.className = "choice";
    button.style.padding = "12px";
    button.innerHTML = item.icon + "<br>" + item.name + "<br>" + (owned ? (equipped ? "Equipped ✓" : "Equip") : item.price + " 💎");
    button.disabled = !owned && gems < item.price;
    button.onclick = function() {
      if (!owned) {
        if (gems < item.price) return;
        gems -= item.price; ownedAccessories.push(item.id);
        localStorage.setItem("sweetNookGems", String(gems));
        localStorage.setItem("sweetNookAccessories", JSON.stringify(ownedAccessories));
      }
      selectedAccessory = item.id;
      localStorage.setItem("sweetNookSelectedAccessory", selectedAccessory);
      soundClick(); renderShop(); drawPreview();
    };
    holder.appendChild(button);
  });
  const none = document.createElement("button");
  none.className = "choice"; none.textContent = "Remove accessory";
  none.onclick = function(){ selectedAccessory = ""; localStorage.removeItem("sweetNookSelectedAccessory"); renderShop(); drawPreview(); };
  holder.appendChild(none);
}

// =====================================================
// 8. TUTORIAL
// =====================================================
const tutorialSteps = [
  { text: "Welcome to Sweet Nook! Customers line up and order cakes. Let's practice.", button: "Show me", customers: [] },
  { text: "Tap the FIRST customer in line (or press Call next), then tap the cake they ordered.", button: "", customers: [{ kind: "student", orders: [0] }] },
  { text: "Employees order 2 or more cakes and only wait 10 seconds. Students wait 15, Seniors 20. Timers are paused while you practice.", button: "", customers: [{ kind: "employee", orders: [1, 3] }, { kind: "senior", orders: [4] }] },
  { text: "A real shift is 2 minutes with 4 levels. Rush Hour fills the line every 20 seconds. A full line or empty timer costs a heart. Ready?", button: "Open the shop", customers: [] }
];

function showTutorialStep(number) {
  game.step = number;
  const step = tutorialSteps[number];
  document.getElementById("coach-text").textContent = step.text;
  const button = document.getElementById("coach-button");
  button.style.display = step.button === "" ? "none" : "inline-block";
  button.textContent = step.button;
  game.line = [];
  game.atCounter = null;
  for (let i = 0; i < step.customers.length; i++) { addToLine(step.customers[i]); }
  refreshScreen();
}

function showCoach(text) { document.getElementById("coach-text").textContent = text; }

// =====================================================
// 9. UPDATING THE GAME (runs about 60 times per second)
// =====================================================
function updateGame(dt) {      // dt = seconds since the last update
  // animations
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
    if (p.life <= 0) { game.particles.splice(i, 1); }
  }
  if (game.happyTimer > 0) { game.happyTimer -= dt; }
  if (game.flyingCake !== null) { game.flyingCake.time += dt; }
  if (game.banner !== null) { game.banner.time -= dt; if (game.banner.time <= 0) { game.banner = null; } }
  for (let i = game.leaving.length - 1; i >= 0; i--) {
    const person = game.leaving[i];
    person.leaveTimer -= dt;
    if (person.leaveTimer <= 0) { person.x += 700 * dt; }
    if (person.x > 960) { game.leaving.splice(i, 1); }
  }

  // the customer at the counter walks in from the right
  const atCounter = game.atCounter;
  if (atCounter !== null && atCounter.state === "walking") {
    atCounter.x += (560 - atCounter.x) * Math.min(1, dt * 6);
    if (Math.abs(atCounter.x - 560) < 2) { atCounter.x = 560; atCounter.state = "waiting"; }
  }
  if (atCounter !== null) {
    atCounter.mood = (atCounter.state === "waiting" && patienceLeft() < 0.3) ? "sad" : "neutral";
  }

  // the tutorial has no timers, no arrivals
  if (game.isTutorial) { updateFrontBar(); return; }

  // the shift clock
  game.timeUsed += dt;
  if (game.timeUsed >= SHIFT_SECONDS) {
    if (game.level === LEVEL_COUNT && !game.finalRewardPaid) { awardLevelGems(5); game.finalRewardPaid = true; }
    endGame(true); return;
  }

  // Five stages, each with its own gem reward
  const newLevel = Math.min(LEVEL_COUNT, 1 + Math.floor(game.timeUsed / LEVEL_SECONDS));
  if (newLevel > game.level) {
    awardLevelGems(game.level);
    game.level = newLevel;
    game.levelCustomers = buildLevelCustomers(newLevel);
    game.levelSpawned = 0;
    game.nextArrival = 0.8;
    game.rushArrivals = [];
    game.score += 20;
    game.banner = { text: "LEVEL UP!", time: 1.6, color: "#1b998b" };
    playTone(523, 0.15, "triangle"); playTone(659, 0.15, "triangle", 0.1); playTone(880, 0.2, "triangle", 0.2);
    say("Level " + newLevel + " of 5! " + LEVEL_CUSTOMER_COUNTS[newLevel - 1] + " customers, including special guests. +20 points");
    refreshScreen();
  }

  // Spawn only the planned customers for this level (no surprise extras).
  game.nextArrival -= dt;
  if (game.nextArrival <= 0 && game.levelSpawned < game.levelCustomers.length) {
    const remaining = game.levelCustomers.length - game.levelSpawned;
    const spec = game.levelCustomers[game.levelSpawned];
    if (addToLine(spec)) {
      game.levelSpawned++;
      refreshScreen();
    } else {
      loseLife("The line is full! A customer is waiting outside.", lateTaunts);
    }
    game.nextArrival = Math.max(1.15, (LEVEL_SECONDS - (game.timeUsed % LEVEL_SECONDS)) / Math.max(1, remaining));
  }
  if (!game.running) { return; }

  // patience: only ONE person's timer runs at a time -
  // the customer at the counter, or the first one in line if the counter is empty
  const someoneIsTiming = (atCounter !== null && atCounter.state === "waiting") || (atCounter === null && game.line.length > 0);
  if (someoneIsTiming) {
    game.patience += dt;
    const secondsLeft = Math.ceil(game.patienceMax - game.patience);
    if (secondsLeft <= 3 && secondsLeft > 0 && secondsLeft !== game.lastBeepSecond) {
      game.lastBeepSecond = secondsLeft;
      soundTick();
    }
    if (game.patience >= game.patienceMax) {                // ran out of patience!
      if (atCounter !== null) {
        game.atCounter = null;
        atCounter.mood = "sad"; atCounter.state = "leaving"; atCounter.leaveTimer = 1;
        game.leaving.push(atCounter);
        startPatienceForFront();
        loseLife(NAMES[atCounter.kind] + " #" + atCounter.id + " stormed out!", lateTaunts);
      } else {
        const gone = game.line.shift();
        startPatienceForFront();
        loseLife(NAMES[gone.kind] + " #" + gone.id + " got tired of waiting!", lateTaunts);
      }
      if (game.running) { refreshScreen(); }
    }
  }
  updateFrontBar();
}

// =====================================================
// 10. UPDATING THE TEXT AND BUTTONS ON THE PAGE
// =====================================================
function updateHud() {
  let hearts = "";
  for (let i = 0; i < START_LIVES; i++) { hearts += (i < game.lives) ? "♥" : "♡"; }
  document.getElementById("hud-lives").textContent = hearts;
  document.getElementById("hud-served").textContent = game.served + (game.targetHit ? " 🎯" : "/" + TARGET);
  document.getElementById("hud-score").textContent = game.score;
  document.getElementById("hud-level").textContent = game.level;
  document.getElementById("hud-combo").textContent = "x" + game.combo;
  const secondsLeft = Math.ceil(Math.max(0, SHIFT_SECONDS - game.timeUsed));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  document.getElementById("hud-time").textContent = minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

// Rebuild the little customer cards under the canvas
function showLine() {
  const holder = document.getElementById("line");
  holder.innerHTML = "";
  if (game.line.length === 0) { holder.textContent = "Nobody in line."; return; }

  for (let i = 0; i < game.line.length; i++) {
    const customer = game.line[i];
    const card = document.createElement("button");
    card.className = "customer-card" + (i === 0 ? " first" : "");

    const small = document.createElement("canvas");
    small.width = 88; small.height = 112;
    const smallCtx = small.getContext("2d");
    drawPerson(smallCtx, 44, 68, 0.5, customer.look, "neutral", 0);
    if (i === 0) {                                           // only the first order is visible
      for (let k = 0; k < customer.orders.length; k++) {
        drawCake(smallCtx, 44 + (k - (customer.orders.length - 1) / 2) * 30, 108, 0.24, customer.orders[k]);
      }
    }
    card.appendChild(small);
    card.appendChild(document.createElement("br"));
    card.appendChild(document.createTextNode("#" + customer.id + " " + customer.displayName));
    if (i === 0) {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.innerHTML = '<div id="front-bar"></div>';
      card.appendChild(bar);
    }
    card.onclick = (function (position) { return function () { tapLine(position); }; })(i);
    holder.appendChild(card);
  }
}

function updateFrontBar() {
  updateHud();
  const bar = document.getElementById("front-bar");
  if (bar !== null) {
    const amount = game.atCounter !== null ? 1 : patienceLeft();
    bar.style.width = (amount * 100) + "%";
    bar.style.background = amount < 0.35 ? "#ff6b8b" : "#1b998b";
  }
}

// In the tutorial, make the next thing to press glow
function showGlow() {
  const callButton = document.getElementById("call-button");
  callButton.classList.remove("glow");
  const cakeButtons = document.getElementsByClassName("cake-button");
  for (let i = 0; i < cakeButtons.length; i++) { cakeButtons[i].classList.remove("glow"); }
  if (!game.isTutorial) { return; }

  const customer = game.atCounter;
  if (customer !== null) {
    for (let i = 0; i < customer.orders.length; i++) {
      if (!customer.done[i]) { cakeButtons[customer.orders[i]].classList.add("glow"); break; }
    }
  } else if (game.line.length > 0) {
    callButton.classList.add("glow");
  }
}

function refreshScreen() { showLine(); updateHud(); showGlow(); }

// =====================================================
// 11. DRAWING THE CAFE SCENE
// =====================================================
function drawScene() {
  ctx.fillStyle = "#ffe4ec";                                  // pink wall
  ctx.fillRect(0, 0, 800, 460);
  for (let x = 0; x < 800; x += 40) {                         // striped awning
    ctx.fillStyle = (x / 40) % 2 === 0 ? "#ff9eb8" : "#fffaf1";
    ctx.fillRect(x, 0, 40, 30);
    drawOval(ctx, x + 20, 30, 20, 12, ctx.fillStyle, false);
  }
  drawBox(ctx, 40, 70, 130, 120, 16, "#d6f0ff");              // window
  drawBox(ctx, 640, 110, 130, 10, 4, "#c9966b");              // shelves with tiny cakes
  drawCake(ctx, 675, 110, 0.28, 0); drawCake(ctx, 735, 110, 0.28, 3);
  drawBox(ctx, 640, 170, 130, 10, 4, "#c9966b");
  drawCake(ctx, 675, 170, 0.28, 1); drawCake(ctx, 735, 170, 0.28, 4);
}

function drawCounter() {
  ctx.fillStyle = "#fff3dd";
  ctx.fillRect(0, 345, 800, 115);
  ctx.fillStyle = "#ffc2d4";
  ctx.fillRect(0, 345, 800, 24);
  for (let x = 0; x < 800; x += 24) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x, 345, 12, 24); }
  ctx.fillStyle = "#d9a98f";
  ctx.font = "bold 22px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sweet Nook ♡", 400, 435);
}

// The speech bubble above the customer at the counter
function drawOrderBubble(customer) {
  const x = customer.x;
  const count = customer.orders.length;

  // label chip
  drawBox(ctx, x - 112, 30, 224, 22, 11, "#fffaf1");
  ctx.fillStyle = OUTLINE;
  ctx.font = "bold 14px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Order #" + customer.id + " - " + customer.displayName + " - " + Math.round(game.patienceMax) + "s", x, 46);

  // bubble
  drawBox(ctx, x - 112, 58, 224, 120, 22, "#fffaf1");
  drawTriangle(ctx, x - 14, 177, x + 14, 177, x, 198, "#fffaf1");
  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(x - 13, 174, 26, 5);

  if (count === 1) {                                          // one cake: big picture + name
    drawCake(ctx, x - 62, 128, 0.62, customer.orders[0]);
    ctx.fillStyle = OUTLINE;
    ctx.textAlign = "left";
    ctx.font = "bold 21px Trebuchet MS, sans-serif";
    ctx.fillText(CAKES[customer.orders[0]].name, x - 22, 100);
    ctx.font = "16px Trebuchet MS, sans-serif";
    ctx.fillText("cake, please!", x - 22, 122);
  } else {                                                    // many cakes: small row, finished ones faded
    const space = 200 / count;
    let cakesLeft = 0;
    for (let i = 0; i < count; i++) {
      const cakeX = x - 100 + space * (i + 0.5);
      ctx.globalAlpha = customer.done[i] ? 0.3 : 1;
      drawCake(ctx, cakeX, 126, Math.min(0.42, space / 150), customer.orders[i]);
      ctx.globalAlpha = 1;
      if (customer.done[i]) { ctx.fillStyle = "#3fae6a"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✓", cakeX, 108); }
      else { cakesLeft++; }
    }
    ctx.fillStyle = OUTLINE;
    ctx.font = "bold 16px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cakesLeft + " of " + count + " cakes left", x, 82);
  }

  // patience bar
  const left = patienceLeft();
  drawBox(ctx, x - 96, 150, 192, 12, 6, "#eadbd0");
  if (left > 0) {
    const color = left > 0.5 ? "#7ccf9a" : (left > 0.25 ? "#ffc94d" : "#ff6b8b");
    drawBox(ctx, x - 96, 150, Math.max(12, 192 * left), 12, 6, color);
  }
}

function drawGame() {
  drawScene();

  // people behind the counter
  for (let i = 0; i < game.leaving.length; i++) {
    drawPerson(ctx, game.leaving[i].x, 395, 1.6, game.leaving[i].look, game.leaving[i].mood, clock);
  }
  const customer = game.atCounter;
  if (customer !== null) { drawPerson(ctx, customer.x, 395, 1.6, customer.look, customer.mood, clock); }
  drawPerson(ctx, 130, 395, 1.6, getBakerLook(), game.happyTimer > 0 ? "happy" : "neutral", clock);

  drawCounter();

  // the cake sliding onto the counter
  if (game.flyingCake !== null && game.flyingCake.time < 1.2) {
    const t = Math.min(1, game.flyingCake.time / 0.35);
    const slide = 1 - Math.pow(1 - t, 3);
    drawCake(ctx, 400 + 80 * slide, 470 - 95 * slide, 0.8, game.flyingCake.cake);
  }

  // speech bubble, or a hint
  if (customer !== null && customer.state === "waiting") {
    drawOrderBubble(customer);
  } else if (customer === null) {
    drawBox(ctx, 430, 150, 260, 40, 20, "#fffaf1");
    ctx.fillStyle = OUTLINE;
    ctx.font = "bold 17px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(game.line.length > 0 ? "Tap the first customer in line" : "Waiting for customers...", 560, 176);
  }

  // big banner
  if (game.banner !== null) {
    ctx.save();
    ctx.translate(400, 110);
    ctx.rotate(-0.07);
    drawBox(ctx, -150, -32, 300, 64, 18, game.banner.color);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(game.banner.text, 0, 13);
    ctx.restore();
  }

  // hearts and stars floating up
  ctx.font = "24px serif";
  ctx.textAlign = "center";
  for (let i = 0; i < game.particles.length; i++) {
    const p = game.particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillText(p.emoji, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function drawPreview() {
  const previewCtx = document.getElementById("preview").getContext("2d");
  previewCtx.fillStyle = "#ffe4ec";
  previewCtx.fillRect(0, 0, 220, 250);
  drawPerson(previewCtx, 110, 225, 1.75, getBakerLook(), "happy", clock);
}

// =====================================================
// 12. THE MAIN LOOP - runs every frame
// =====================================================
let lastTime = 0;
function mainLoop(now) {
  let dt = (now - lastTime) / 1000;
  if (!(dt > 0)) { dt = 0; }
  if (dt > 0.05) { dt = 0.05; }       // never jump too far if the tab was asleep
  lastTime = now;
  clock += dt;

  if (currentScreen === "pick") { drawPreview(); }
  if (currentScreen === "game" && game !== null) {
    if (game.running) { updateGame(dt); }
    if (currentScreen === "game") { drawGame(); }
  }
  requestAnimationFrame(mainLoop);
}

// =====================================================
// 13. CONNECTING BUTTONS AND KEYS
// =====================================================
// make the five cake buttons
const cakeButtonsHolder = document.getElementById("cake-buttons");
CAKES.forEach(function (cake, index) {
  const button = document.createElement("button");
  button.className = "cake-button";
  const small = document.createElement("canvas");
  small.width = 96; small.height = 82;
  drawCake(small.getContext("2d"), 48, 70, 0.72, index);
  button.appendChild(small);
  button.appendChild(document.createElement("br"));
  button.appendChild(document.createTextNode(cake.name));
  button.onclick = function () { serveCake(index); };
  cakeButtonsHolder.appendChild(button);
});

document.getElementById("play-button").onclick = function () { soundPlay(); showScreen("pick"); };
document.getElementById("girl-button").onclick = function () { setGender(true); };
document.getElementById("boy-button").onclick = function () { setGender(false); };
document.getElementById("start-button").onclick = function () { soundClick(); startGame(true); };
document.getElementById("call-button").onclick = callNext;
document.getElementById("again-button").onclick = function () { soundClick(); startGame(false); };
document.getElementById("change-button").onclick = function () { soundClick(); showScreen("pick"); };
document.getElementById("shop-button").onclick = function () { soundClick(); openShop("over"); };
document.getElementById("shop-back").onclick = function () { soundClick(); showScreen(returnFromShop); };
document.getElementById("skip-button").onclick = function () { soundClick(); startGame(false); };
document.getElementById("coach-button").onclick = function () {
  soundClick();
  if (game.step < tutorialSteps.length - 1) { showTutorialStep(game.step + 1); }
  else { startGame(false); }
};

// keyboard: Space = call next, 1-5 = serve that cake
document.addEventListener("keydown", function (event) {
  if (currentScreen !== "game" || game === null) { return; }
  if (event.code === "Space") { event.preventDefault(); callNext(); }
  const number = parseInt(event.key, 10);
  if (number >= 1 && number <= CAKES.length) { serveCake(number - 1); }
});

makePresetButtons();
refreshPickScreen();
requestAnimationFrame(mainLoop);
