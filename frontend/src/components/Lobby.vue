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
            @keyup.enter="startGame"
          >
          </div> 
          <div class="input-group">
            <label>遊戲模式</label>
            <div class="mode-box styled-box">
                🃏 德州撲克
            </div>
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
import { ref, computed } from 'vue';

const nickname = ref('');
const emit = defineEmits(['select']);

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
  if (!nickname.value) return alert("請輸入暱稱！");
  sessionStorage.setItem('player_nickname', nickname.value); 
  sessionStorage.setItem('player_avatar', currentAvatar.value.src); 
  emit('select', 'poker');
};
</script>

<style scoped>
/* --- 1. 整體佈局 --- */
.gartic-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  position: relative;
  z-index: 1;
}

/* --- 2. 標題容器 --- */
.game-header {
  text-align: center;
  margin-bottom: 20px;
  z-index: 10;
}

/* --- 2. 標題容器 (微調) --- */
.main-game-title-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  /* 確保字體夠肥，ZCOOL KuaiLe 本身就很適合，若用微軟正黑體則需要最粗 */
  font-family: 'ZCOOL KuaiLe', 'Microsoft JhengHei', sans-serif;
  font-size: 5rem;
  line-height: 1.2;
  letter-spacing: 5px; /* 字距拉開一點點以免描邊打架 */
  font-weight: 900;    /* 強制最粗 */
}

/* --- 3. 單個文字塊設定 --- */
.title-part {
  position: relative;
  color: transparent;
  z-index: 10;
  margin: 0 5px;
}

/* === 底層：黑色粗框 (微調) === */
.title-part::before {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0;
  z-index: -1;
  /* Gartic 的邊框通常很圓潤，這裡加強描邊寬度 */
  -webkit-text-stroke: 12px black; 
  color: black;
  /* 稍微修正描邊產生的尖角問題 (非標準屬性但有幫助) */
  stroke-linejoin: round;
}

/* === 上層：漸層貼紙 (核心修改) === */
.title-part::after {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0;
  z-index: 1;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 0;
}

/* === 顏色設定：卡通風格斷層漸層 === */

/* 藍色樣式 (梭哈、場) */
.title-part.blue::after {
  background-image: linear-gradient(180deg, 
    /* 上半部：亮面與高光 */
    #FFFFFF 0%,      /* 頂部反光 */
    #D0F0FF 15%,     /* 過渡到淺藍 */
    #54C6FF 49%,     /* 上半部主色 (淺藍) 停在 49% */
    
    /* 下半部：陰影面 (製造斷層) */
    #0069D1 50%,     /* 下半部主色 (深藍) 從 50% 開始，製造銳利切線 */
    #0069D1 100%     /* 底部維持深色平面感 */
  );
}

/* 黃色樣式 (火葬) */
.title-part.yellow::after {
  background-image: linear-gradient(180deg, 
    /* 上半部：亮面與高光 */
    #FFFFFF 0%,
    #FFFBD0 15%,
    #FFD54F 49%,     /* 上半部主色 (亮黃) */
    
    /* 下半部：陰影面 (製造斷層) */
    #F57F17 50%,     /* 下半部主色 (橘黃/深黃) */
    #F57F17 100%
  );
}

/* --- 副標題 --- */
.main-subtitle {
  font-family: 'ZCOOL KuaiLe', 'Microsoft JhengHei', sans-serif;
  color: white;
  font-size: 1.8rem;
  margin-top: 5px;
  letter-spacing: 3px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
}

/* --- 卡片與其他內容 (保持原本設定) --- */
.main-card {
  background: white;
  width: 90%; max-width: 750px;
  border-radius: 20px; padding: 40px;
  box-shadow: 0 10px 0px rgba(0, 0, 0, 0.2); 
  display: flex; flex-direction: column; align-items: center;
}

.card-header-area { margin-bottom: 30px; text-align: center; }
.card-title {
  font-family: 'Titan One', 'Arial Black', cursive; /* 這裡保留英文胖胖字體 */
  font-size: 2.5rem;
  color: #3b4861;
  margin: 0;
}

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

.input-section { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  gap: 20px; /* 拉開每一行的間距 */
  max-width: 320px; 
  width: 100%;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px; /* Label 跟框框的距離 */
  width: 100%;
  text-align: left; /* 確保 Label 靠左 */
}
label { 
  font-weight: bold; 
  color: #3b4861; 
  font-size: 1rem; 
  margin-left: 5px; /* 稍微往右縮一點，對齊框框圓角 */
}

/* 標籤文字樣式 */
label { 
  font-weight: bold; 
  color: #3b4861; 
  font-size: 1rem; 
  margin-left: 5px; /* 稍微往右縮一點，對齊框框圓角 */
}

/* === 核心修改：統一樣式 === */
/* 設定 input 和 mode-box 長得一模一樣 */
input, 
.styled-box {
  width: 100%;
  padding: 15px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 12px;
  box-sizing: border-box; /* 確保 padding 不會撐大寬度 */
  text-align: center; /* 文字置中 */
  
  /* 統一的灰藍色風格 (參考你的圖片) */
  background-color: #f0f4f8; 
  border: 3px solid #dae1e7; 
  color: #556070;
  
  /* 去掉原本 input 可能有的預設外觀 */
  outline: none;
  transition: all 0.2s;
}

/* 輸入框被點選時的顏色 */
input:focus {
  border-color: #4facfe;
  background-color: white;
}

/* 遊戲模式框框不需要點選效果，但要確保 Flex 置中 (為了圖案) */
.styled-box {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: default; /* 滑鼠游標 */
}

/* 修改按鈕樣式：加入黑色粗框 */
.btn-play { 
  background-color: #4facfe; 
  color: rgb(23, 43, 110); 
  font-size: 1.6rem; 
  font-weight: 800; 
  
  /* 【修改 1】這裡加上 4px 黑色實線邊框 */
  border: 4px solid black; 
  
  /* 【修改 2】用黑色陰影來做立體厚度 (取代原本的 border-bottom) */
  box-shadow: 0 6px 0px black; 
  
  border-radius: 12px; 
  padding: 15px 20px; 
  cursor: pointer; 
  transition: all 0.1s; 
  width: 100%; 

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px; 
}

/* 按下時的效果也要跟著改 */
.btn-play:active { 
  /* 因為陰影是 6px，所以往下移 6px */
  transform: translateY(6px); 
  
  /* 按下時陰影消失 (歸零) */
  box-shadow: 0 0 0px black; 
}

/* 圖案保持不變 */
.btn-icon {
  font-size: 2rem;
  line-height: 1;
}

/* 新增圖案設定 */
.btn-icon {
  font-size: 2rem; /* 圖案稍微大一點 */
  line-height: 1;
}
@media (max-width: 850px) {
  .main-game-title-container { font-size: 3.5rem; }
  .title-part::before { -webkit-text-stroke: 6px black; }
  .content-row { flex-direction: column; gap: 30px; }
  .main-card { padding: 30px 20px; width: 85%; }
}
</style>