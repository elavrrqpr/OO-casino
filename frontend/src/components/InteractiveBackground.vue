<template>
  <div class="background-container">
    <div class="pattern-layer"></div>
    <canvas ref="canvasRef" class="draw-layer"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref(null);
let ctx = null;
let points = [];
let animationFrameId = null;
let lastPos = null;

const STROKE_LIFETIME = 1500; 
const LINE_WIDTH = 5;         

// 背景變藍，線條要改白色才清楚
const STROKE_COLOR = '#ffffff'; 

const resizeCanvas = () => {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
  }
};

const handleMouseMove = (e) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  points.push({
    x, y,
    time: Date.now(),
    isStart: lastPos === null
  });
  lastPos = { x, y };
};

const handleInteractionEnd = () => {
  lastPos = null;
};

const animate = () => {
  if (!ctx || !canvasRef.value) return;

  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  const now = Date.now();
  
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.lineWidth = LINE_WIDTH;

  points = points.filter(p => now - p.time < STROKE_LIFETIME);

  if (points.length < 2) {
    animationFrameId = requestAnimationFrame(animate);
    return;
  }

  ctx.beginPath();
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p2.isStart) {
      ctx.stroke();
      ctx.beginPath();
      continue;
    }

    const age = now - p1.time;
    const opacity = 1 - (age / STROKE_LIFETIME);
    if (opacity <= 0) continue;

    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(STROKE_COLOR, opacity);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  animationFrameId = requestAnimationFrame(animate);
};

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('mouseout', handleInteractionEnd);
    animate();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleInteractionEnd);
  window.removeEventListener('mouseout', handleInteractionEnd);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden;
  
  /* 【修改 2】這裡就是控制顏色的地方！ */
  /* Gartic 的經典藍色 */
  background-color: #0066FF; 
}

.pattern-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  
  /* 你的圖片 */
  background-image: url('/poker.png'); 
  background-repeat: repeat;
  background-size: 400px;
  
  /* 如果你的圖案是黑色的，用這個混合模式會讓它融入藍色 */
  mix-blend-mode: multiply; 
  opacity: 0.3; /* 讓圖案淡淡的 */
}

.draw-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
</style>