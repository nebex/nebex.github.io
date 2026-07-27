/**
 * Combined DevTools detection
 * Redirects the page if DevTools appears to be open.
 *
 * Usage: set REDIRECT_URL below, then include this file:
 *   <script src="devtools-detect.js"></script>
 *
 * Notes:
 * - This is client-side only. It can always be bypassed by anyone who
 *   disables JS, edits the script, or reads the page source directly.
 * - Tune the thresholds/intervals below if you get false positives
 *   (multi-monitor setups, browser zoom, slow machines, etc).
 */
(function () {
  'use strict';

  const REDIRECT_URL = 'https://www.youtube.com/watch?v=jy4qYmf3TxA'; // <-- change this
  const CHECK_INTERVAL_MS = 500;
  const SIZE_THRESHOLD = 160;      // px difference to count as "docked devtools"
  const DEBUGGER_THRESHOLD_MS = 100; // pause time to count as "breakpoint hit"
  const REQUIRED_SIGNALS = 1;      // how many methods must agree before redirecting (1 = any single one triggers)

  let redirected = false;
  let signalCount = 0;

  function redirect() {
    if (redirected) return;
    redirected = true;
    window.location.href = REDIRECT_URL;
  }

  function reportSignal(name) {
    signalCount++;
    if (signalCount >= REQUIRED_SIGNALS) {
      redirect();
    }
  }

  // --- Method 1: window size delta (docked devtools) ---
  function checkWindowSize() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD) {
      reportSignal('window-size');
    }
  }

  // --- Method 2: debugger statement timing ---
  function checkDebuggerTiming() {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    if (end - start > DEBUGGER_THRESHOLD_MS) {
      reportSignal('debugger-timing');
    }
  }

  // --- Method 3: console.log getter trap ---
  const trapElement = new Image();
  Object.defineProperty(trapElement, 'id', {
    get() {
      reportSignal('console-trap');
      return '';
    }
  });

  function checkConsoleTrap() {
    console.log(trapElement);
    console.clear();
  }

  // Run all checks on an interval
  setInterval(function () {
    if (redirected) return;
    checkWindowSize();
    checkDebuggerTiming();
    checkConsoleTrap();
  }, CHECK_INTERVAL_MS);

})();
