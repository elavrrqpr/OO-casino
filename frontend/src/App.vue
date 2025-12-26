<script setup>
import { ref, onMounted } from 'vue';
import Lobby from './components/Lobby.vue';
import PokerTable from './components/PokerTable.vue';
import socket from './services/socket';
// 引入 RoomList
import RoomList from './components/RoomList.vue';
import InteractiveBackground from './components/InteractiveBackground.vue';

// 狀態機 (LOBBY -> ROOM_LIST -> PLAYING)
const currentView = ref('LOBBY');
const roomData = ref(null);

// 3. 監聽後端數據
onMounted(() => {
  // 監聽房間更新
  socket.on('roomUpdated', (data) => {
    roomData.value = data;
  });

  // ▼▼▼ 【修正重點】監聽加入成功訊號 ▼▼▼
  // 只有收到這個，才會切換畫面到遊戲桌
  socket.on('joinSuccess', () => {
    currentView.value = 'PLAYING';
  });

  socket.on('errorMsg', (msg) => alert(msg));
});

// 4. UI 跳轉邏輯
const selectGame = (type) => {
  if (type === 'poker') {
    const name = sessionStorage.getItem('player_nickname');
    if (name) {
       currentView.value = 'ROOM_LIST'; 
    } else {
       // 如果沒名字，理論上應該擋在 Lobby，這裡只是防呆
       alert("請先輸入暱稱");
    }
  }
};

const handleJoinRoom = ({ roomId, password }) => {
    const nickname = sessionStorage.getItem('player_nickname');
    const avatar = sessionStorage.getItem('player_avatar');

    // 發送加入請求
    socket.emit('joinRoom', { 
        roomId, 
        nickname, 
        avatar: avatar || '/avatars/1.jpg',
        password 
    });
};

// 從房間列表返回大廳
const backToLobby = () => {
  currentView.value = 'LOBBY';
};

// 從遊戲桌離開 (通常是回到房間列表比較合理，看你需求)
const leaveGame = () => {
  socket.emit('leaveRoom'); // 通知後端離開
  currentView.value = 'ROOM_LIST'; // 回到房間列表
  roomData.value = null;
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
      
      <RoomList 
        v-else-if="currentView === 'ROOM_LIST'"
        @join="handleJoinRoom"
        @back="backToLobby" 
      />
      
      <PokerTable 
        v-else-if="currentView === 'PLAYING'" 
        :room-data="roomData" 
        @leave="leaveGame"
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