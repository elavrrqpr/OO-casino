<template>
  <div class="room-list-container">
    <div class="header-bar">
      <button class="btn-back" @click="$emit('back')">⬅ 返回</button>
      <h2 class="title">選擇房間</h2>
      <button class="btn-refresh" @click="fetchRooms">🔄</button>
    </div>

    <div class="grid-container">
      <div 
        v-for="room in rooms" 
        :key="room.id" 
        class="room-card"
        @click="selectRoom(room)"
      >
        <div class="room-icon">
            <span v-if="room.hasPassword">🔒</span>
            <span v-else>🃏</span>
        </div>
        <div class="room-info">
          <div class="room-name">{{ room.name }}</div>
          <div class="room-status">
            <span :class="{'status-wait': room.status==='LOBBY', 'status-play': room.status==='PLAYING'}">
                {{ room.status === 'LOBBY' ? '等待中' : '遊戲中' }}
            </span>
            <span class="player-count">👤 {{ room.players }}/{{ room.maxPlayers }}</span>
          </div>
        </div>
        <button class="btn-join">加入</button>
      </div>

      <div v-if="rooms.length === 0" class="empty-msg">
        目前沒有房間，快來創建一個吧！
      </div>
    </div>

    <div class="footer-bar">
      <button class="btn-create" @click="showCreateModal = true">
        創建新房間
      </button>
    </div>

    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-box">
        <h3>創建房間</h3>
        <input v-model="newRoomName" type="text" placeholder="房間名稱" maxlength="12" class="modal-input">
        <input v-model="newRoomPwd" type="text" placeholder="密碼 (可選)" maxlength="6" class="modal-input">
        <div class="modal-btns">
            <button class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button class="btn-confirm" @click="createRoom">確定創建</button>
        </div>
      </div>
    </div>

    <div v-if="showPwdModal" class="modal-overlay">
      <div class="modal-box">
        <h3>🔒此房間需要密碼</h3>
        <input v-model="inputPwd" type="text" placeholder="輸入密碼" class="modal-input">
        <div class="modal-btns">
            <button class="btn-cancel" @click="showPwdModal = false">取消</button>
            <button class="btn-confirm" @click="confirmJoin">加入</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../services/socket';

const emit = defineEmits(['join', 'back']);

const rooms = ref([]);
const showCreateModal = ref(false);
const showPwdModal = ref(false);

const newRoomName = ref('');
const newRoomPwd = ref('');
const inputPwd = ref('');
const selectedRoomId = ref(null);

const fetchRooms = () => {
  socket.emit('getRooms');
};

const selectRoom = (room) => {
  if (room.hasPassword) {
    selectedRoomId.value = room.id;
    inputPwd.value = '';
    showPwdModal.value = true;
  } else {
    // 沒密碼直接加入
    emitJoin(room.id, '');
  }
};

const confirmJoin = () => {
  if (selectedRoomId.value) {
    emitJoin(selectedRoomId.value, inputPwd.value);
    showPwdModal.value = false;
  }
};

const emitJoin = (roomId, password) => {
  // 觸發加入事件回傳給 App.vue
  emit('join', { roomId, password });
};

const createRoom = () => {
  if (!newRoomName.value) newRoomName.value = "德州撲克";
  
  const nickname = sessionStorage.getItem('player_nickname');
  const avatar = sessionStorage.getItem('player_avatar');

  // 發送創建請求
  socket.emit('createRoom', {
    roomName: newRoomName.value,
    password: newRoomPwd.value,
    nickname,
    avatar
  });
  
  showCreateModal.value = false;
};

// --- Socket 監聽 ---
onMounted(() => {
  fetchRooms();
  
  // 接收房間列表
  socket.on('roomList', (data) => {
    rooms.value = data;
  });

  // 接收列表更新訊號
  socket.on('roomListUpdate', () => {
    fetchRooms();
  });

  // 創建成功後，後端會叫我們自動加入
  socket.on('roomCreated', ({ roomId, password }) => {
    emitJoin(roomId, password);
  });
});

onUnmounted(() => {
    socket.off('roomList');
    socket.off('roomListUpdate');
    socket.off('roomCreated');
});
</script>

<style scoped>
/* 容器樣式 */
.room-list-container {
  width: 90%; max-width: 850px; height: 80vh;
  background: white; border-radius: 20px;
  display: flex; flex-direction: column;
  box-shadow: 0 10px 0px rgba(0,0,0,0.2);
  overflow: hidden; padding: 20px;
}

/* 頂部欄 */
.header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-family: 'ZCOOL KuaiLe', sans-serif; font-size: 2.5rem; color: #3b4861; margin: 0; }

.btn-back, .btn-refresh {
    background: #f0f4f8; border: 2px solid #dae1e7; border-radius: 12px;
    padding: 10px 15px; cursor: pointer; font-weight: bold; color: #556070;
    transition: all 0.2s;
}
.btn-back:hover, .btn-refresh:hover { background: #e1e8ef; }

/* 網格列表 */
.grid-container {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 15px; padding: 5px;
}

/* 房間卡片 */
.room-card {
  background: #f0f4f8; border: 3px solid #dae1e7; border-radius: 15px;
  padding: 15px; cursor: pointer; transition: all 0.2s;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  position: relative;
}
.room-card:hover { border-color: #4facfe; transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

.room-icon { font-size: 3.5rem; }
.room-name { font-weight: bold; color: #3b4861; font-size: 1.3rem; text-align: center; }

.room-status { display: flex; gap: 10px; font-size: 0.95rem; }
.status-wait { color: #2ecc71; font-weight: bold; }
.status-play { color: #e74c3c; font-weight: bold; }
.player-count { color: #888; font-weight: bold; }

.btn-join {
    width: 100%; background: #4facfe; color: white; border: none; padding: 10px;
    border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: auto;
}

.empty-msg { width: 100%; text-align: center; color: #888; font-size: 1.2rem; margin-top: 50px; }

/* 底部創建按鈕 */
.footer-bar { margin-top: 20px; display: flex; justify-content: center; }
.btn-create {
    background: #2ecc71; color: white; border: none; border-bottom: 5px solid #27ae60;
    padding: 15px 50px; border-radius: 50px; font-size: 1.5rem; font-weight: bold;
    cursor: pointer; transition: all 0.1s;
}
.btn-create:active { transform: translateY(5px); border-bottom: 0px; }

/* 彈窗樣式 */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); z-index: 200;
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(3px);
}
.modal-box {
  background: white; padding: 30px; border-radius: 20px;
  width: 320px; display: flex; flex-direction: column; gap: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-input {
    width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 10px;
    font-size: 1.1rem; text-align: center; outline: none;
}
.modal-input:focus { border-color: #4facfe; }

.modal-btns { display: flex; gap: 15px; justify-content: center; }
.btn-confirm { background: #4facfe; color: white; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; flex: 1; }
.btn-cancel { background: #95a5a6; color: white; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; flex: 1; }
</style>