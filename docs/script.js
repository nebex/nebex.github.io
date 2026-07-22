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

    // Track percentage positions so other effects (constellation lines) can
    // find stars without re-reading layout from the DOM every frame.
    const starPositions = [];

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
      starPositions.push({ xPercent: x, yPercent: y });
    }

    for (let i = 0; i < starCount; i++) createStar();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      const auroraCanvas = initAurora();
      const constellationCanvas = initConstellation(starPositions);
      initParallax(starContainer, auroraCanvas, constellationCanvas);
    }
  } catch (err) {
    console.error('Error creating stars:', err);
  }
});

// ---------------------------------------------------------------------------
// WebGL aurora: a few noise-warped "curtains" near the top of the screen,
// drifting slowly, with a very slow overall hue cycle (color temperature
// drift). Returns the canvas element (or null if WebGL isn't available) so
// the parallax effect can move it too.
// ---------------------------------------------------------------------------
function initAurora() {
  try {
    const canvas = document.createElement('canvas');
    canvas.id = 'aurora-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not available, skipping aurora');
      canvas.remove();
      return null;
    }

    const vertexSrc = `
    attribute vec2 aPos;
    void main() {
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
    `;

    const fragmentSrc = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uRot1;
    uniform float uRot2;
    uniform float uRot3;
    uniform float uCurve1;
    uniform float uCurve2;
    uniform float uCurve3;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 5; i++) {
        v += amp * noise(p);
        p *= 2.02;
        amp *= 0.5;
      }
      return v;
    }

    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
    }

    vec2 rotateAround(vec2 p, vec2 center, float angle) {
      vec2 d = p - center;
      float s = sin(angle);
      float c = cos(angle);
      return center + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
    }

    // One thin undulating curtain of light, arced across the screen and
    // tilted at a random angle (rotation/curveAmp are randomized once per
    // page load in JS, passed in as uniforms). centerY is in 0..1 screen
    // space (0 = bottom, 1 = top). "sigma" controls thickness — kept
    // small so this reads as a ribbon, not a wash covering the screen.
    // An extra fbm term breaks it into vertical streamers instead of a
    // single smooth stroke.
    float curtain(vec2 p, float t, float speed, float centerY, float freq, float warpAmp, float driftAmp, float sigma, float curveAmp, float rotation, vec2 center) {
      vec2 rp = rotateAround(p, center, rotation);
      float drift = sin(t * speed * 0.5) * driftAmp;
      float warp = fbm(vec2(rp.x * freq + t * speed * 0.6, t * speed * 0.25)) * warpAmp;
      float edge = (rp.x - center.x) / center.x;
      float curve = curveAmp * (1.0 - edge * edge);
      float y = centerY + drift + warp + curve;
      float d = rp.y - y;
      float band = exp(-(d * d) / (sigma * sigma));
      float streamers = 0.5 + 0.5 * fbm(vec2(rp.x * 7.0 + t * speed * 2.2, 3.0));
      return band * streamers;
    }

    // Big, slow, low-contrast cloud coverage — soft nebula-like haze
    // spread across more of the screen than the curtains, much dimmer.
    float nebula(vec2 p, float t, float scale, float speed, float seed) {
      vec2 q = p * scale + vec2(t * speed, t * speed * 0.35) + seed;
      return fbm(q);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      float aspect = uResolution.x / uResolution.y;
      vec2 p = vec2(uv.x * aspect, uv.y);
      vec2 center = vec2(aspect * 0.5, 0.55);
      float t = uTime;

      float l1 = curtain(p, t, 0.045, 0.80, 2.2, 0.05, 0.035, 0.05, uCurve1, uRot1, center);
      float l2 = curtain(p, t, 0.030, 0.72, 1.6, 0.06, 0.045, 0.06, uCurve2, uRot2, center);
      float l3 = curtain(p, t, 0.055, 0.65, 2.6, 0.04, 0.030, 0.045, uCurve3, uRot3, center);

      // full hue cycle roughly every ~3.5 minutes
      float hue = fract(t * 0.0047);
      vec3 c1 = hsl2rgb(vec3(hue + 0.55, 0.70, 0.50));
      vec3 c2 = hsl2rgb(vec3(hue + 0.40, 0.65, 0.50));
      vec3 c3 = hsl2rgb(vec3(hue + 0.72, 0.55, 0.50));

      vec3 auroraColor = c1 * l1 + c2 * l2 + c3 * l3;
      float auroraAlpha = clamp((l1 + l2 + l3) * 0.5, 0.0, 0.55);

      float n1 = nebula(p, t, 0.9, 0.006, 0.0);
      float n2 = nebula(p, t, 0.5, -0.004, 50.0);
      float cloud = pow(clamp(n1 * 0.6 + n2 * 0.4, 0.0, 1.0), 1.3);
      vec3 cloudColor = mix(
        hsl2rgb(vec3(hue + 0.62, 0.5, 0.42)),
                            hsl2rgb(vec3(hue + 0.45, 0.45, 0.38)),
                            n2
      );
      float cloudAlpha = cloud * 0.32;

      vec3 color = auroraColor + cloudColor * cloudAlpha;
      float alpha = clamp(auroraAlpha + cloudAlpha * 0.9, 0.0, 0.75);

      gl_FragColor = vec4(color, alpha);
    }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Aurora shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Aurora program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    // Full-screen triangle (covers the viewport without a second triangle)
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRot1 = gl.getUniformLocation(program, 'uRot1');
    const uRot2 = gl.getUniformLocation(program, 'uRot2');
    const uRot3 = gl.getUniformLocation(program, 'uRot3');
    const uCurve1 = gl.getUniformLocation(program, 'uCurve1');
    const uCurve2 = gl.getUniformLocation(program, 'uCurve2');
    const uCurve3 = gl.getUniformLocation(program, 'uCurve3');

    // Randomized once per page load: a gentle tilt (roughly ±14°) and an
    // arc height for each curtain, so the aurora isn't the same flat,
    // dead-straight shape every time the page loads.
    gl.uniform1f(uRot1, (Math.random() - 0.5) * 0.5);
    gl.uniform1f(uRot2, (Math.random() - 0.5) * 0.5);
    gl.uniform1f(uRot3, (Math.random() - 0.5) * 0.5);
    gl.uniform1f(uCurve1, 0.05 + Math.random() * 0.09);
    gl.uniform1f(uCurve2, 0.05 + Math.random() * 0.09);
    gl.uniform1f(uCurve3, 0.05 + Math.random() * 0.09);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    gl.clearColor(0, 0, 0, 0);

    const startTime = performance.now();
    function render(now) {
      const t = (now - startTime) / 1000;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    return canvas;
  } catch (err) {
    console.error('Error creating aurora:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Constellation lines: nearby stars link up to the cursor as it moves, and
// every so often a random cluster of stars near a "hub" star lights up with
// a web of connecting lines for a few seconds before fading out.
// ---------------------------------------------------------------------------
function initConstellation(starPositions) {
  try {
    if (!starPositions.length) return null;

    const canvas = document.createElement('canvas');
    canvas.id = 'constellation-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function pixelPositions() {
      return starPositions.map((s) => ({
        x: (s.xPercent / 100) * width,
                                       y: (s.yPercent / 100) * height
      }));
    }

    const mouse = { x: -9999, y: -9999, active: false };
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });
    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });
    const CURSOR_RADIUS = 150;

    let burst = null; // { center, targets, start, duration }
    function triggerBurst() {
      const positions = pixelPositions();
      if (positions.length < 4) return;
      const center = positions[Math.floor(Math.random() * positions.length)];
      const radius = 160 + Math.random() * 120;
      const targets = positions.filter((p) => {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const distSq = dx * dx + dy * dy;
        return distSq > 1 && distSq < radius * radius;
      }).slice(0, 7);
      if (targets.length < 2) return;
      burst = { center, targets, start: performance.now(), duration: 3400 };
    }
    function scheduleBurst() {
      const delay = 6000 + Math.random() * 9000;
      setTimeout(() => {
        triggerBurst();
        scheduleBurst();
      }, delay);
    }
    scheduleBurst();

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const positions = pixelPositions();

      if (mouse.active) {
        for (const p of positions) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_RADIUS) {
            const alpha = (1 - dist / CURSOR_RADIUS) * 0.45;
            ctx.strokeStyle = `rgba(173, 206, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      if (burst) {
        const elapsed = performance.now() - burst.start;
        const progress = elapsed / burst.duration;
        if (progress >= 1) {
          burst = null;
        } else {
          const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
          for (const p of burst.targets) {
            ctx.strokeStyle = `rgba(150, 175, 255, ${0.45 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(burst.center.x, burst.center.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    return canvas;
  } catch (err) {
    console.error('Error creating constellation lines:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parallax: since the page doesn't scroll, depth comes from cursor position
// instead. Stars shift a little more than the aurora, which sits "further
// back" and moves less — classic parallax depth cue. Movement is eased
// (lerped) toward the cursor target each frame rather than snapping.
//
// The constellation canvas moves by the exact same amount as the star
// layer (not a smaller "further back" amount) — its lines are computed
// from the stars' raw, un-shifted percentage positions, so the canvas
// itself has to travel with them pixel-for-pixel or the lines would drift
// away from the dots they're supposed to connect.
// ---------------------------------------------------------------------------
function initParallax(starContainer, auroraCanvas, constellationCanvas) {
  try {
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    const STAR_FACTOR = 10;
    const AURORA_FACTOR = 4;

    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function loop() {
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
      starContainer.style.transform = `translate(${curX * STAR_FACTOR}px, ${curY * STAR_FACTOR}px)`;
      if (auroraCanvas) {
        auroraCanvas.style.transform = `translate(${curX * AURORA_FACTOR}px, ${curY * AURORA_FACTOR}px)`;
      }
      if (constellationCanvas) {
        constellationCanvas.style.transform = `translate(${curX * STAR_FACTOR}px, ${curY * STAR_FACTOR}px)`;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  } catch (err) {
    console.error('Error setting up parallax:', err);
  }
}
