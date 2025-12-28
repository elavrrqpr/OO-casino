<template>
  <div class="room-list-container">
    <div class="header-bar">
      <button class="btn-back" @click="$emit('back')">⬅ 返回</button>
      <h2 class="title">選擇房間</h2>
    </div>

    <div class="grid-container">
      <div 
        v-for="room in rooms" 
        :key="room.id" 
        class="room-card"
        :class="{ 'card-disabled': isRoomUnavailable(room) }"
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
        <button 
          class="btn-join"
          :disabled="isRoomUnavailable(room)"
        >
          {{ getButtonText(room) }}
        </button>
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
        <input v-model="inputPwd" type="text" placeholder="輸入密碼" class="modal-input" :class="{ 'input-error': passwordError }"
            @keyup.enter="confirmJoin">
        <div v-if="passwordError" class="error-msg">
            ⚠️ {{ passwordError }}
        </div>
        <div class="modal-btns">
            <button class="btn-cancel" @click="showPwdModal = false">取消</button>
            <button class="btn-confirm" @click="confirmJoin">加入</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import socket from '../services/socket';

const emit = defineEmits(['join', 'back']);

const rooms = ref([]);
const showCreateModal = ref(false);
const showPwdModal = ref(false);

const newRoomName = ref('');
const newRoomPwd = ref('');
const inputPwd = ref('');
const selectedRoomId = ref(null);
const selectedRoom = ref(null);
const passwordError = ref('');

const isRoomUnavailable = (room) => {
  return room.status === 'PLAYING' || room.players >= (room.maxPlayers || 6);
};

// 根據狀態回傳按鈕文字
const getButtonText = (room) => {
  if (room.status === 'PLAYING') return '遊戲中';
  if (room.players >= (room.maxPlayers || 6)) return '客滿';
  return '加入';
};

const fetchRooms = () => {
  socket.emit('getRooms');
};

const selectRoom = (room) => {
  if (isRoomUnavailable(room)) return; // 停用狀態不可點擊

  selectedRoom.value = room;
  passwordError.value = ''; // 重置錯誤

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
    //showPwdModal.value = false;
  }
};

// 關閉視窗的輔助函式 (給取消按鈕用)
const closePwdModal = () => {
    showPwdModal.value = false;
    passwordError.value = ''; // 清除錯誤訊息
    inputPwd.value = '';
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

  socket.on('errorMsg', (msg) => {
      // 如果目前正在顯示密碼輸入框，就把錯誤顯示在框框下
      if (showPwdModal.value) {
          passwordError.value = msg; // 例如："密碼錯誤"
      }
  });

});

onUnmounted(() => {
    socket.off('roomList');
    socket.off('roomListUpdate');
    socket.off('roomCreated');
});

watch(inputPwd, () => {
    if (passwordError.value) {
        passwordError.value = '';
    }
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
.header-bar { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; position: relative; }
.title { font-family: 'ZCOOL KuaiLe', sans-serif; font-size: 2.5rem; color: #3b4861; margin: 0; }

.btn-back {
    position: absolute;
    left: 0;
    background: #f0f4f8; border: 2px solid #dae1e7; border-radius: 12px;
    padding: 10px 15px; cursor: pointer; font-weight: bold; color: #556070;
    transition: all 0.2s;
}
.btn-back:hover { background: #e1e8ef; }

/* 網格列表 */
.grid-container {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 15px; padding: 5px;
  position: relative;
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

/* ▼▼▼ 【修改】成這樣 ▼▼▼ */
.empty-msg {
  position: absolute;      /* 絕對定位，無視網格 */
  top: 50%;                /* 頂部推到 50% */
  left: 50%;               /* 左邊推到 50% */
  transform: translate(-50%, -50%); /* 修正自身寬高的偏移，達成完美正中心 */
  
  width: 100%;             /* 寬度全滿，避免文字換行太醜 */
  text-align: center;      /* 文字置中 */
  color: #888; 
  font-size: 1.2rem; 
  font-weight: bold;
  pointer-events: none;    /* (選用) 讓滑鼠可以直接穿透，不擋到後面的操作 */
}

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

/* 停用狀態樣式 */

/* 1. 整個卡片變暗，滑鼠游標變禁止符號 */
.room-card.card-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(80%); /* 讓它變黑白，更有「無法使用」的感覺 */
}

/* 移除停用卡片的 hover 效果 (原本卡片會上浮) */
.room-card.card-disabled:hover {
  transform: none;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1); /* 維持原本的影子，不要變大 */
}

/* 2. 按鈕變灰 */
.btn-join:disabled {
  background: #95a5a6;
  border-bottom: 5px solid #7f8c8d;
  cursor: not-allowed;
  transform: none; /* 防止點擊動畫 */
}

/* 錯誤訊息樣式 */
.error-msg {
    color: #e74c3c;
    font-size: 0.9rem;
    font-weight: bold;
    margin-top: -10px; /* 讓它緊貼輸入框下方 */
    margin-bottom: 10px;
    animation: fadeIn 0.3s;
}

.input-error {
    border-color: #e74c3c !important;
    background-color: #fceceb;
}

/* 視窗震動動畫 (密碼錯誤時觸發) */
.shake-anim {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>