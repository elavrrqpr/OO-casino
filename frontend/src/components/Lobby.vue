<template>
  <div class="gartic-body">
    
    <div class="game-header">
      <h1 class="main-game-title-container">
        <span class="title-part blue" data-text="梭哈">梭哈</span>
        <span class="title-part yellow" data-text="火葬">火葬</span>
        <span class="title-part blue" data-text="場">場</span>
      </h1>

      <div class="main-subtitle">
        羞辱，猜忌，背叛
      </div>
    </div>

    <div class="main-card">
      
      <div class="card-header-area">
        <h2 class="card-title">開始遊玩</h2>
      </div>

      <div class="content-row">
        
        <div class="avatar-section">
          <div class="avatar-selector">
            <button class="arrow-btn" @click="prevAvatar">◀</button>
            <div class="avatar-circle">
              <img :src="currentAvatar.src" class="avatar-img" />
            </div>
            <button class="arrow-btn" @click="nextAvatar">▶</button>
          </div>
          <div class="character-name">
            {{ currentAvatar.name }}
          </div>
        </div>

        <div class="input-section">
          
          <div class="input-group">
            <label>暱稱</label>
            <input 
              v-model="nickname" 
              type="text" 
              placeholder="輸入你的名字..." 
              maxlength="10"
              :class="{ 'input-error': nicknameError }"
              @keyup.enter="startGame"
            >

            <div v-if="nicknameError" class="error-msg">
              ⚠️ 請輸入暱稱才能開始！
            </div>
          </div> 
          
          <div class="input-group">
            <label>遊戲模式</label>
            <select v-model="selectedGameMode" class="game-select">
              <option value="poker">🃏 德州撲克</option>
              <option value="slots" disabled>🎰 拉霸機 (Coming Soon)</option>
              <option value="blackjack" disabled>♠️ 21點 (Coming Soon)</option>
            </select>
            </div>

          <button class="btn-play" @click="startGame">
            進入火葬場
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const nickname = ref('');
// 預設選擇德州撲克
const selectedGameMode = ref('poker'); 
const emit = defineEmits(['select']);
// 新增錯誤狀態變數
const nicknameError = ref(false);

// 角色清單
const avatarList = [
  { src: '/avatars/1.jpg', name: '邱桑' },
  { src: '/avatars/2.jpg', name: '呂大槌' },
  { src: '/avatars/3.jpg', name: '王king' },
  { src: '/avatars/4.jpg', name: '馮南京' },
  { src: '/avatars/5.jpg', name: 'michael' },
  { src: '/avatars/6.jpg', name: '蘿莉' }
];

const currentIndex = ref(0);
const currentAvatar = computed(() => avatarList[currentIndex.value]);

const nextAvatar = () => currentIndex.value = (currentIndex.value + 1) % avatarList.length;
const prevAvatar = () => currentIndex.value = (currentIndex.value - 1 + avatarList.length) % avatarList.length;

const startGame = () => {
  if (!nickname.value.trim()){
    nicknameError.value = true;
    return;
  }
  sessionStorage.setItem('player_nickname', nickname.value); 
  sessionStorage.setItem('player_avatar', currentAvatar.value.src); 
  
  // 傳出選到的遊戲模式 (雖然目前只有 poker 能玩)
  emit('select', selectedGameMode.value);
};

watch(nickname, (newVal) => {
  if (newVal) {
    nicknameError.value = false;
  }
});
</script>

<style scoped>
/* --- 1. 整體佈局 --- */
.gartic-body {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  height: 100vh; width: 100vw; position: relative; z-index: 1;
}

/* --- 2. 標題容器 --- */
.game-header { text-align: center; margin-bottom: 20px; z-index: 10; }

.main-game-title-container {
  display: flex; justify-content: center; align-items: center; margin: 0;
  font-family: 'ZCOOL KuaiLe', 'Microsoft JhengHei', sans-serif;
  font-size: 5rem; line-height: 1.2; letter-spacing: 5px; font-weight: 900;
}

.title-part { position: relative; color: transparent; z-index: 10; margin: 0 5px; }

.title-part::before {
  content: attr(data-text); position: absolute; top: 0; left: 0; z-index: -1;
  -webkit-text-stroke: 12px black; color: black; stroke-linejoin: round;
}

.title-part::after {
  content: attr(data-text); position: absolute; top: 0; left: 0; z-index: 1;
  -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 0;
}

/* 顏色設定 */
.title-part.blue::after {
  background-image: linear-gradient(180deg, #FFFFFF 0%, #D0F0FF 15%, #54C6FF 49%, #0069D1 50%, #0069D1 100%);
}
.title-part.yellow::after {
  background-image: linear-gradient(180deg, #FFFFFF 0%, #FFFBD0 15%, #FFD54F 49%, #F57F17 50%, #F57F17 100%);
}

.main-subtitle {
  font-family: 'ZCOOL KuaiLe', 'Microsoft JhengHei', sans-serif;
  color: white; font-size: 1.8rem; margin-top: 5px; letter-spacing: 3px;
  -webkit-text-stroke: 4px black; paint-order: stroke fill;
}

/* --- 卡片與內容 --- */
.main-card {
  background: white; width: 90%; max-width: 750px; border-radius: 20px; padding: 40px;
  box-shadow: 0 10px 0px rgba(0, 0, 0, 0.2); display: flex; flex-direction: column; align-items: center;
}
.card-header-area { margin-bottom: 30px; text-align: center; }
.card-title { font-family: 'Titan One', 'Arial Black', cursive; font-size: 2.5rem; color: #3b4861; margin: 0; }

.content-row { display: flex; gap: 50px; width: 100%; justify-content: center; align-items: center; }
.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.avatar-selector { display: flex; align-items: center; gap: 10px; }

.avatar-circle {
  width: 180px; height: 180px; background: #eef2f5; border-radius: 50%; border: 5px solid #ddd;
  display: flex; justify-content: center; align-items: center; overflow: hidden;
  box-shadow: 0 8px 15px rgba(0,0,0,0.1); transition: transform 0.2s;
}
.avatar-circle:hover { transform: scale(1.05); border-color: #5cb85c; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.character-name { font-size: 1.5rem; font-weight: bold; color: #3b4861; background: #f0f4f8; padding: 5px 20px; border-radius: 20px; min-width: 100px; text-align: center; }
.arrow-btn { background: none; border: none; font-size: 30px; color: #3b4861; cursor: pointer; padding: 0 10px; transition: transform 0.1s; }
.arrow-btn:hover { color: #5cb85c; transform: scale(1.2); }

.input-section { flex: 1; display: flex; flex-direction: column; gap: 20px; max-width: 320px; width: 100%; }
.input-group { display: flex; flex-direction: column; gap: 8px; width: 100%; text-align: left; }
label { font-weight: bold; color: #3b4861; font-size: 1rem; margin-left: 5px; }

/* === 核心修改：統一樣式 === */
/* 讓 input 和 select 長得一模一樣 */
input, 
select {
  width: 100%;
  padding: 15px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 12px;
  box-sizing: border-box; 
  text-align: center; /* 文字置中 */
  text-align-last: center; /* 讓 select 的文字也強制置中 */
  
  background-color: #f0f4f8; 
  border: 3px solid #dae1e7; 
  color: #556070;
  
  outline: none;
  transition: all 0.2s;
  
  /* 讓 select 也有自定義外觀 */
  appearance: none; 
  -webkit-appearance: none;
  cursor: pointer;
}

/* 為了讓下拉選單旁邊有個小箭頭 (因為 appearance: none 把它藏起來了) */
.input-group { position: relative; }
select {
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23556070%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center; /* 箭頭靠右 */
  background-size: 12px;
}

input:focus, select:focus {
  border-color: #4facfe;
  background-color: white;
}

.btn-play { 
  background-color: #4facfe; color: rgb(23, 43, 110); font-size: 1.6rem; font-weight: 800; 
  border: 4px solid black; box-shadow: 0 6px 0px black; 
  border-radius: 12px; padding: 15px 20px; cursor: pointer; transition: all 0.1s; width: 100%; 
  display: flex; justify-content: center; align-items: center; gap: 15px; 
}

.btn-play:active { transform: translateY(6px); box-shadow: 0 0 0px black; }

@media (max-width: 850px) {
  .main-game-title-container { font-size: 3.5rem; }
  .title-part::before { -webkit-text-stroke: 6px black; }
  .content-row { flex-direction: column; gap: 30px; }
  .main-card { padding: 30px 20px; width: 85%; }
}

/* 1. 輸入框錯誤狀態 (紅框 + 紅底) */
/* 使用 !important 確保覆蓋原本的樣式 */
.input-error {
  border-color: #e74c3c !important;
  background-color: #fceceb !important;
  color: #c0392b !important;
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; /* 觸發震動 */
}

/* 2. 錯誤文字訊息 */
.error-msg {
  color: #e74c3c;
  font-size: 0.9rem;
  font-weight: bold;
  margin-top: 5px;
  margin-left: 5px;
  animation: fadeIn 0.3s;
}

/* 3. 震動動畫 Keyframes */
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