const starContainer = document.getElementById("star-container");

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const STAR_DENSITY = 0.00008;
const PARALLAX_LAYERS = 3;
const SHOOTING_STAR_INTERVAL = 6000;
const SHOOTING_STAR_CHANCE = 0.25;

let baseSize = 8 / window.devicePixelRatio;
if (window.innerWidth < 768 && window.devicePixelRatio > 1) {
  baseSize *= 2;
}

const starFiles = [
  "/stars/star1.svg",
  "/stars/star2.svg",
  "/stars/star3.svg",
  "/stars/star4.svg",
  "/stars/star5.svg"
];

let starfieldEnabled = true;
let parallaxFrameId = null;
let shootingIntervalId = null;

// --------------------------------------------------
// FOG + NEBULA
// --------------------------------------------------

function createFogAndNebula() {
  const fog1 = document.createElement("div");
  fog1.className = "fog-layer fog-layer-1";

  const fog2 = document.createElement("div");
  fog2.className = "fog-layer fog-layer-2";

  const nebula = document.createElement("div");
  nebula.className = "nebula-layer";

  starContainer.appendChild(fog1);
  starContainer.appendChild(fog2);
  starContainer.appendChild(nebula);
}

// --------------------------------------------------
// STAR CREATION
// --------------------------------------------------

function createStar(layer) {
  const img = document.createElement("img");
  img.className = "star";

  img.src = starFiles[(Math.random() * starFiles.length) | 0];

  const x = Math.random() * 100;
  const y = Math.random() * 100;

  const size = baseSize * (0.4 + Math.random() * 0.9);
  const rotation = Math.random() * 360;

  const hue = Math.random() * 30;
  const brightness = 0.8 + Math.random() * 0.4;

  img.style.width = `${size}px`;
  img.style.height = `${size}px`;
  img.style.left = `${x}%`;
  img.style.top = `${y}%`;
  img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  img.style.filter = `hue-rotate(${hue}deg) brightness(${brightness})`;

  img.style.animationDelay = `${Math.random() * 4}s`;
  img.style.animationDuration = `${3 + Math.random() * 3}s`;

  img.dataset.layer = layer;
  img.dataset.rotation = rotation;

  return img;
}

// --------------------------------------------------
// RENDER STARFIELD
// --------------------------------------------------

function buildStarfield() {
  starContainer.innerHTML = "";
  createFogAndNebula();

  const fragment = document.createDocumentFragment();
  const starCount = Math.floor(window.innerWidth * window.innerHeight * STAR_DENSITY);

  for (let layer = 1; layer <= PARALLAX_LAYERS; layer++) {
    for (let i = 0; i < starCount / PARALLAX_LAYERS; i++) {
      fragment.appendChild(createStar(layer));
    }
  }

  starContainer.appendChild(fragment);
}

// --------------------------------------------------
// PARALLAX + DRIFT
// --------------------------------------------------

function parallaxLoop() {
  if (!starfieldEnabled) {
    parallaxFrameId = requestAnimationFrame(parallaxLoop);
    return;
  }

  const stars = document.querySelectorAll(".star");
  const t = performance.now() * 0.00003;

  stars.forEach(star => {
    const layer = Number(star.dataset.layer);
    const rotation = Number(star.dataset.rotation);

    const driftX = Math.sin(t + layer) * (layer * 0.2);
    const driftY = Math.cos(t + layer) * (layer * 0.15);

    star.style.transform =
      `translate(-50%, -50%) rotate(${rotation}deg) translate(${driftX}px, ${driftY}px)`;
  });

  parallaxFrameId = requestAnimationFrame(parallaxLoop);
}

function startParallax() {
  if (parallaxFrameId) cancelAnimationFrame(parallaxFrameId);
  parallaxFrameId = requestAnimationFrame(parallaxLoop);
}

// --------------------------------------------------
// TOGGLE STARFIELD (DESTROY / REBUILD)
// --------------------------------------------------

function enableStarfield() {
  starfieldEnabled = true;
  starContainer.style.opacity = "1";
  buildStarfield();
  startParallax();
  startShootingStars();
}

function disableStarfield() {
  starfieldEnabled = false;
  starContainer.style.opacity = "0";
  if (parallaxFrameId) {
    cancelAnimationFrame(parallaxFrameId);
    parallaxFrameId = null;
  }
  stopShootingStars();
  starContainer.innerHTML = "";
}

const watermark = document.querySelector(".watermark");
if (watermark) {
  watermark.addEventListener("click", () => {
    if (starfieldEnabled) {
      disableStarfield();
    } else {
      enableStarfield();
    }
  });
}

// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

enableStarfield();

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (starfieldEnabled) {
      enableStarfield();
    }
  }, 300);
});