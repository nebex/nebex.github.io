document.addEventListener('DOMContentLoaded', () => {
  try {
    let starContainer = document.getElementById("star-container");
    if (!starContainer) {
      console.warn('star-container not found, creating one');
      starContainer = document.createElement('div');
      starContainer.id = 'star-container';
      document.body.appendChild(starContainer);
    }

    // Number of stars based on screen area (adjust multiplier to taste)
    const starsPerPixel = 0.00008;
    const starCount = Math.floor(window.innerWidth * window.innerHeight * starsPerPixel);

    // Base size for consistent physical size across devices (accounts for pixel density)
    let baseSize = 8 / (window.devicePixelRatio || 1);
    if (window.innerWidth < 768 && (window.devicePixelRatio || 1) > 1) baseSize *= 2;
    if (baseSize < 1) baseSize = 1; // avoid invisible stars on extreme DPR

    const STAR_BASE = window.STARS_BASE || '/stars/';
    console.log('STAR_BASE=', STAR_BASE, 'starCount=', starCount, 'baseSize=', baseSize);

    const starFiles = [
      STAR_BASE + 'star1.svg',
      STAR_BASE + 'star2.svg',
      STAR_BASE + 'star3.svg',
      STAR_BASE + 'star4.svg',
      STAR_BASE + 'star5.svg'
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

    for (let i = 0; i < starCount; i++) createStar();
  } catch (err) {
    console.error('Error creating stars:', err);
  }
});