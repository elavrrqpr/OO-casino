<template>
  <div class="table-wrapper">
    
    <button class="btn-back" @click="$emit('leave')">
      ⬅
    </button>

    <div class="poker-table">
      
      <div class="community-cards">
        <div class="card-slot">🂠</div>
        <div class="card-slot">🂠</div>
        <div class="card-slot">🂠</div>
        <div class="card-slot">🂠</div>
        <div class="card-slot">🂠</div>
      </div>

      <div 
        v-for="(player, index) in roomData?.players || []" 
        :key="player.id"
        class="player-position"
        :style="getPlayerStyle(index, roomData.players.length)"
      >
        <PlayerSlot :player="player" />
      </div>

    </div>

  </div>
</template>

<script setup>
import PlayerSlot from './PlayerSlot.vue'; 

// 【新增】定義 emit，用來告訴 App.vue 我們要離開
const emit = defineEmits(['leave']);
const props = defineProps(['roomData']);

// 計算玩家在圓桌上的位置
const getPlayerStyle = (index, total) => {
  if (total === 0) return {};
  const angle = (index / total) * 2 * Math.PI + (Math.PI / 2); 
  const radius = 220; 
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  return {
    transform: `translate(${x}px, ${y}px)`
  };
};
</script>

<style scoped>
.table-wrapper {
  display: flex; justify-content: center; align-items: center;
  height: 100vh; width: 100vw;
  /* 注意：這裡的背景色可能會蓋住 App.vue 的動態背景 */
  /* 如果想要看到藍色動態背景，建議把下面這行 background-color 拿掉或改成 transparent */
  background-color: #333; 
  position: relative; /* 讓按鈕可以針對這個容器定位 */
}

/* 【新增】Gartic 風格返回按鈕 */
.btn-back {
  position: absolute;
  top: 30px;
  left: 30px;
  
  width: 60px;
  height: 60px;
  border-radius: 50%;
  
  background-color: white;
  border: 4px solid black;
  box-shadow: 0 4px 0px rgba(0,0,0,0.3);
  
  font-size: 2rem;
  color: #3b4861;
  cursor: pointer;
  
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: 4px; /* 視覺修正 */
  z-index: 100;
  transition: all 0.1s;
}

.btn-back:hover {
  transform: scale(1.1);
}

.btn-back:active {
  transform: scale(0.95) translateY(4px);
  box-shadow: 0 0 0px rgba(0,0,0,0);
}

/* --- 原本的牌桌樣式 --- */
.poker-table {
  width: 600px; height: 300px;
  background: #27ae60;
  border: 10px solid #1e8449;
  border-radius: 300px; 
  position: relative;
  display: flex; justify-content: center; align-items: center;
  box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
}

.community-cards {
  display: flex; gap: 10px;
}

.card-slot {
  width: 40px; height: 60px;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
  display: flex; justify-content: center; align-items: center;
  color: rgba(255,255,255,0.5);
  font-size: 20px;
  border: 2px dashed rgba(255,255,255,0.2);
}

.player-position {
  position: absolute;
  top: 50%; left: 50%;
  margin-top: -40px; 
  margin-left: -40px; 
}
</style>