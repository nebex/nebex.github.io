const starContainer = document.getElementById("star-container");

// Number of stars based on screen area
// Adjust multiplier to taste
const starsPerPixel = 0.00008; 
const starCount = Math.floor(window.innerWidth * window.innerHeight * starsPerPixel);

// Base size for consistent physical size across devices (accounts for pixel density)
let baseSize = 8 / window.devicePixelRatio;

// Scale up on mobile hi-res devices for better visibility
if (window.innerWidth < 768 && window.devicePixelRatio > 1) {
    baseSize *= 3;
}

const starFiles = [
  "stars/star1.svg",
  "stars/star2.svg",
  "stars/star3.svg",
  "stars/star4.svg",
  "stars/star5.svg"
];

function createStar() {
  const img = document.createElement("img");
  img.src = starFiles[Math.floor(Math.random() * starFiles.length)];
  img.classList.add("star");

  const x = Math.random() * 100;
  const y = Math.random() * 100;

  const randomScale = 0.5 + Math.random() * 0.8;
  const size = baseSize * randomScale;

  img.style.width = size + 'px';
  img.style.height = size + 'px';

  const rotation = Math.random() * 360;

  img.style.filter = `hue-rotate(${Math.random() * 30}deg) brightness(${0.8 + Math.random() * 0.4})`;

  img.style.left = x + "%";
  img.style.top = y + "%";
  img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

  img.style.animationDelay = `${Math.random() * 4}s`;

  starContainer.appendChild(img);
}

for (let i = 0; i < starCount; i++) {
  createStar();

}
