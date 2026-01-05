<script setup>
import { ref, onMounted } from 'vue';
import Lobby from './components/Lobby.vue';
import PokerTable from './components/PokerTable.vue';
import socket from './services/socket';
import RoomList from './components/RoomList.vue';
import InteractiveBackground from './components/InteractiveBackground.vue';

// 狀態機 (LOBBY -> ROOM_LIST -> PLAYING)
const currentView = ref('LOBBY');
const roomData = ref(null);
const currentRoomId = ref(''); // 用來存目前所在的房間 ID
const kickedMsg = ref('');

// 3. 監聽後端數據
onMounted(() => {
  // 監聽房間更新
  socket.on('roomUpdated', (data) => {
    roomData.value = data;
  });

  // 監聽加入成功訊號
  socket.on('joinSuccess', ({ roomId }) => { // 也可以這裡接收 roomId 確保同步
    currentView.value = 'PLAYING';
  });

  //socket.on('errorMsg', (msg) => alert(msg));

  socket.on('kicked', (data) => {
    kickedMsg.value = data.msg;
    //currentView.value = 'ROOM_LIST'; // 強制跳轉回房間列表
    roomData.value = null;
    currentRoomId.value = '';
  });
});

// 4. UI 跳轉邏輯
const selectGame = (type) => {
  if (type === 'poker') {
    const name = sessionStorage.getItem('player_nickname');
    if (name) {
       currentView.value = 'ROOM_LIST'; 
    } else {
       alert("請先輸入暱稱");
    }
  }
};

const handleJoinRoom = ({ roomId, password}) => {
    // ▼▼▼ 【修正 1】記住房間 ID！ ▼▼▼
    currentRoomId.value = roomId; 
    
    const nickname = sessionStorage.getItem('player_nickname');
    const avatar = sessionStorage.getItem('player_avatar');
    const character = sessionStorage.getItem('player_character');
    // 發送加入請求
    socket.emit('joinRoom', { 
        roomId, 
        nickname, 
        avatar: avatar || '/avatars/1.jpg',
        password ,
        character: character || '林'
    });
};

const backToLobby = () => {
  currentView.value = 'LOBBY';
};

const leaveGame = () => {
  socket.emit('leaveRoom'); 
  currentView.value = 'ROOM_LIST'; 
  roomData.value = null;
  currentRoomId.value = ''; // 離開時清空 ID
};

const confirmKicked = () => {
  kickedMsg.value = '';      // 關閉彈窗
  currentView.value = 'ROOM_LIST'; // 跳轉回房間列表
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
        :room-id="currentRoomId"
        @leave="leaveGame"
      />

    </transition>

    <transition name="fade">
      <div v-if="kickedMsg" class="modal-overlay">
        <div class="kicked-box">
          <div class="kicked-icon">💸</div>
          <h2 class="kicked-title">破產通知</h2>
          <p class="kicked-content">{{ kickedMsg }}</p>
          <button class="btn-confirm-kick" @click="confirmKicked">
            返回大廳 (重新做人)
          </button>
        </div>
      </div>
    </transition>
    </div>
</template>

<style>
@import "./assets/main.css"; 

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

.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8); z-index: 3000;
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(5px);
}

.kicked-box {
  background: white; padding: 30px; border-radius: 20px;
  width: 350px; text-align: center;
  border: 5px solid #e74c3c; /* 紅色警告框 */
  box-shadow: 0 0 30px rgba(231, 76, 60, 0.6);
  animation: shake 0.5s;
}

.kicked-icon { font-size: 4rem; margin-bottom: 10px; }
.kicked-title { color: #c0392b; font-size: 2rem; margin: 0; font-weight: 900; }
.kicked-content { font-size: 1.2rem; color: #555; margin: 20px 0; font-weight: bold; }

.btn-confirm-kick {
  background: #e74c3c; color: white; border: none;
  padding: 12px 30px; border-radius: 50px; font-size: 1.2rem; font-weight: bold;
  cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 0 #c0392b;
}
.btn-confirm-kick:hover { transform: translateY(-2px); }
.btn-confirm-kick:active { transform: translateY(2px); box-shadow: none; }

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-10px) rotate(-5deg); }
  50% { transform: translateX(10px) rotate(5deg); }
  75% { transform: translateX(-10px) rotate(-5deg); }
  100% { transform: translateX(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>