/**
 * gesture.js
 * ----------
 * Runs entirely client-side. MediaPipe's HandLandmarker (Tasks Vision,
 * loaded from a CDN as a WASM module) analyzes the live webcam feed in
 * the browser to detect a sustained thumbs-up. The raw video stream
 * never leaves this page - only the single frame captured at the
 * moment of a confirmed gesture is sent to the Flask backend, and only
 * for in-memory enhancement (see /api/process-image).
 */
import { HandLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const video = document.getElementById('cameraVideo');
const overlay = document.getElementById('overlayCanvas');
const overlayCtx = overlay.getContext('2d');
const statusPill = document.getElementById('gestureStatus');
const statusLabel = document.getElementById('gestureStatusLabel');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNum = document.getElementById('countdownNum');
const flashEl = document.getElementById('cameraFlash');
const qualityWarning = document.getElementById('qualityWarning');
const previewWrap = document.getElementById('capturedPreviewWrap');
const previewImg = document.getElementById('capturedPreviewImg');
const startPuzzleBtn = document.getElementById('startPuzzleBtn');
const retakeBtn = document.getElementById('retakeBtn');
const cameraFrame = document.getElementById('cameraFrame');
const captureBtn = document.getElementById('manualCaptureBtn');

let handLandmarker = null;
let detecting = false;
let thumbsUpStreak = 0;
const STREAK_NEEDED = 12; // ~0.4s at 30fps
let countdownActive = false;
let capturedDataUrl = null;

const captureCanvas = document.createElement('canvas');
const captureCtx = captureCanvas.getContext('2d');

async function init() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    cameraFrame.classList.add('ready');
  } catch (err) {
    statusLabel.textContent = 'Camera permission denied';
    qualityWarning.classList.add('show');
    qualityWarning.querySelector('span').textContent = 'Enable camera access to play, or use Manual Capture once granted.';
    return;
  }

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );
  handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 1,
  });

  detecting = true;
  requestAnimationFrame(detectLoop);
}

function resizeOverlay() {
  overlay.width = video.videoWidth || 960;
  overlay.height = video.videoHeight || 720;
}

let lastVideoTime = -1;
function detectLoop() {
  if (!detecting) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    if (overlay.width !== video.videoWidth) resizeOverlay();

    const result = handLandmarker.detectForVideo(video, performance.now());
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    let gestureNow = false;
    if (result.landmarks && result.landmarks.length > 0) {
      const lm = result.landmarks[0];
      drawLandmarks(lm);
      gestureNow = isThumbsUp(lm);
    }

    updateGestureState(gestureNow);
  }
  requestAnimationFrame(detectLoop);
}

function drawLandmarks(lm) {
  const w = overlay.width, h = overlay.height;
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17],
  ];
  overlayCtx.strokeStyle = 'rgba(51,225,237,0.85)';
  overlayCtx.lineWidth = 2;
  connections.forEach(([a, b]) => {
    overlayCtx.beginPath();
    overlayCtx.moveTo(lm[a].x * w, lm[a].y * h);
    overlayCtx.lineTo(lm[b].x * w, lm[b].y * h);
    overlayCtx.stroke();
  });
  overlayCtx.fillStyle = 'rgba(124,92,255,0.9)';
  lm.forEach((p) => {
    overlayCtx.beginPath();
    overlayCtx.arc(p.x * w, p.y * h, 3.2, 0, Math.PI * 2);
    overlayCtx.fill();
  });
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isThumbsUp(lm) {
  const wrist = lm[0];
  const thumbTip = lm[4], thumbIp = lm[3];
  const idxTip = lm[8], idxMcp = lm[5];
  const midTip = lm[12], midMcp = lm[9];
  const ringTip = lm[16], ringMcp = lm[13];
  const pinkyTip = lm[20], pinkyMcp = lm[17];

  const thumbExtended = dist(wrist, thumbTip) > dist(wrist, thumbIp) * 1.15;
  const curled = [
    [idxTip, idxMcp], [midTip, midMcp], [ringTip, ringMcp], [pinkyTip, pinkyMcp],
  ].every(([tip, mcp]) => dist(wrist, tip) < dist(wrist, mcp) * 1.05);
  const thumbHighest = thumbTip.y < Math.min(idxTip.y, midTip.y, ringTip.y, pinkyTip.y);

  return thumbExtended && curled && thumbHighest;
}

function updateGestureState(gestureNow) {
  if (countdownActive) return;

  if (gestureNow) {
    thumbsUpStreak++;
    statusPill.classList.add('detected');
    statusLabel.textContent = 'Thumbs up detected';
  } else {
    thumbsUpStreak = 0;
    statusPill.classList.remove('detected');
    statusLabel.textContent = 'Show a thumbs-up to capture';
  }

  if (thumbsUpStreak >= STREAK_NEEDED) {
    thumbsUpStreak = 0;
    beginCountdown();
  }
}

function beginCountdown() {
  countdownActive = true;
  countdownOverlay.classList.add('active');
  let n = 3;
  countdownNum.textContent = n;
  window.PSAudio && PSAudio.countdownTick();

  const interval = setInterval(() => {
    n -= 1;
    if (n > 0) {
      countdownNum.textContent = n;
      window.PSAudio && PSAudio.countdownTick();
    } else {
      clearInterval(interval);
      countdownNum.textContent = '📸';
      window.PSAudio && PSAudio.countdownGo();
      setTimeout(() => doCapture(), 180);
    }
  }, 800);
}

async function doCapture() {
  window.PSAudio && PSAudio.shutter();
  flashEl.style.transition = 'none';
  flashEl.style.opacity = '0.9';
  requestAnimationFrame(() => {
    flashEl.style.transition = 'opacity .5s ease';
    flashEl.style.opacity = '0';
  });

  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  // mirror horizontally so the saved photo matches what the user saw
  captureCtx.translate(captureCanvas.width, 0);
  captureCtx.scale(-1, 1);
  captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  captureCtx.setTransform(1, 0, 0, 1, 0, 0);

  const rawDataUrl = captureCanvas.toDataURL('image/jpeg', 0.92);

  countdownOverlay.classList.remove('active');
  countdownActive = false;
  statusLabel.textContent = 'Enhancing photo...';

  try {
    const res = await fetch('/api/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: rawDataUrl }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    capturedDataUrl = data.image;
    showQualityWarning(data);
    showPreview(capturedDataUrl);
  } catch (err) {
    statusLabel.textContent = 'Capture failed — try again';
  }
}

function showQualityWarning(data) {
  if (data.is_blurry || data.is_low_light) {
    qualityWarning.classList.add('show');
    qualityWarning.querySelector('span').textContent = data.is_blurry
      ? 'That shot looks a little soft — consider retaking it.'
      : 'Low light detected — consider retaking in brighter light.';
  } else {
    qualityWarning.classList.remove('show');
  }
}

function showPreview(dataUrl) {
  previewImg.src = dataUrl;
  previewWrap.style.display = 'block';
  startPuzzleBtn.disabled = false;
  statusLabel.textContent = 'Captured! Ready to play.';
  previewWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

retakeBtn?.addEventListener('click', () => {
  capturedDataUrl = null;
  previewWrap.style.display = 'none';
  startPuzzleBtn.disabled = true;
  statusLabel.textContent = 'Show a thumbs-up to capture';
  qualityWarning.classList.remove('show');
});

captureBtn?.addEventListener('click', () => {
  if (!countdownActive) beginCountdown();
});

startPuzzleBtn?.addEventListener('click', () => {
  if (!capturedDataUrl) return;
  // Held only in sessionStorage: cleared automatically when the tab/
  // session ends, and explicitly cleared by puzzle.js once solved.
  sessionStorage.setItem('ps_captured_image', capturedDataUrl);
  window.location.href = '/play';
});

init();