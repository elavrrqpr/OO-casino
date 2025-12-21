<script setup>
import { ref, onMounted } from 'vue';
import Lobby from './components/Lobby.vue';
import RoomSetup from './components/RoomSetup.vue';
import PokerTable from './components/PokerTable.vue';
import socket from './services/socket'; // 引入通訊層

// 1. 定義狀態機 (LOBBY -> SETUP -> PLAYING)
const currentView = ref('LOBBY');
const roomData = ref(null);

// 2. 監聽後端數據更新
onMounted(() => {
  socket.on('roomUpdated', (data) => {
    roomData.value = data;
    // 如果後端狀態變更為開始，自動切換畫面
    if (data.gameState === 'PLAYING') {
      currentView.value = 'PLAYING';
    }
  });

  socket.on('errorMsg', (msg) => alert(msg));
});

// 3. UI 跳轉邏輯
const selectGame = (type) => {
  if (type === 'poker') currentView.value = 'SETUP';
};

const joinRoom = () => {
  currentView.value = 'PLAYING';
};
</script>

<template>
  <div class="game-wrapper">
    <transition name="view-fade" mode="out-in">
      <Lobby 
        v-if="currentView === 'LOBBY'" 
        @select="selectGame" 
      />
      <RoomSetup 
        v-else-if="currentView === 'SETUP'" 
        @join="joinRoom" 
      />
      <PokerTable 
        v-else-if="currentView === 'PLAYING'" 
        :room-data="roomData" 
      />
    </transition>
  </div>
</template>

<style>
/* 這裡放全域樣式，或者直接引入您之前的 style.css */
@import "./assets/main.css"; 

/* 介面切換的轉場動畫：淡入淡出且帶有些微位移 */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: all 0.3s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.game-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #e5e5e5; /* Gartic 經典淡灰底 */
}
</style>