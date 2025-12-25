<script setup>
import { ref, onMounted } from 'vue';
import Lobby from './components/Lobby.vue';
import RoomSetup from './components/RoomSetup.vue';
import PokerTable from './components/PokerTable.vue';
import socket from './services/socket';

// 1. 引入背景元件
import InteractiveBackground from './components/InteractiveBackground.vue';

// 2. 狀態機 (LOBBY -> SETUP -> PLAYING)
const currentView = ref('LOBBY');
const roomData = ref(null);

// 3. 監聽後端數據
onMounted(() => {
  socket.on('roomUpdated', (data) => {
    roomData.value = data;
    if (data.gameState === 'PLAYING' && currentView.value === 'LOBBY') {
       // 選擇性邏輯
    }
  });

  socket.on('errorMsg', (msg) => alert(msg));
});

// 4. UI 跳轉邏輯
const selectGame = (type) => {
  if (type === 'poker') {
    const name = sessionStorage.getItem('player_nickname');
    if (name) {
       console.log("偵測到暱稱，直接加入房間:", name);
       socket.emit('joinRoom', { roomId: 'poker_table_1', nickname: name });
       currentView.value = 'PLAYING'; 
    } else {
       currentView.value = 'SETUP';
    }
  }
};

const joinRoom = () => {
  currentView.value = 'PLAYING';
};

// 【新增】返回大廳的函式
const backToLobby = () => {
  // 如果後端需要知道玩家離開，可以在這裡加 socket.emit('leaveRoom');
  currentView.value = 'LOBBY';
};
</script>

<template>
  <div class="game-wrapper">
    
    <InteractiveBackground />

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
        @leave="backToLobby"
      />

    </transition>
  </div>
</template>

<style>
/* 引入 Gartic 風格全域樣式 */
@import "./assets/main.css"; 

/* 轉場動畫 */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.view-fade-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.game-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
</style>