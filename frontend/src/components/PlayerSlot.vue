<template>
  <div class="player-pod" :class="{ 'is-active': player.isTurn, 'is-folded': player.status === 'FOLDED' }">
    
    <div class="avatar-wrapper">
      <img :src="player.avatar" class="avatar-img" alt="avatar" />
      
      <div v-if="player.isDealer" class="dealer-btn">D</div>
      <span v-if="player.isHost" class="crown">👑</span>
    </div>

    <div class="info-panel">
      <div class="player-name">{{ player.name }}</div>
      
      <div class="chips-display">
        <span v-if="player.status === 'ALLIN'" class="allin-text">ALL-IN</span>
        <span v-else class="chips-amount">
          <span class="currency">$</span>{{ Number(player.chips).toLocaleString() }}
        </span>
      </div>
    </div>

    <div class="hand-cards-slot">
        <template v-if="player.cards && player.cards.length > 0">
            <img v-for="(card, i) in player.cards" :key="i" :src="getCardSrc(card)" class="mini-card-img"/>
        </template>
        <template v-else-if="player.hasCards && player.status !== 'FOLDED'">
            <img src="/cards/back.png" class="mini-card-img" />
            <img src="/cards/back.png" class="mini-card-img" />
        </template>
    </div>

  </div>
</template>

<script setup>
defineProps(['player']);

// 圖片路徑轉換函式 (保持不變)
const getCardSrc = (cardObj) => {
  if (!cardObj) return '';
  const suitMap = { '♠': 'spade', '♥': 'heart', '♦': 'diamond', '♣': 'club' };
  const valueMap = { 'A': 1, 'J': 11, 'Q': 12, 'K': 13 };
  const rank = valueMap[cardObj.value] || cardObj.value;
  const suit = suitMap[cardObj.suit];
  return `/cards/${suit}_${rank}.png`;
};
</script>

<style scoped>
/* --- 整體容器 --- */
.player-pod {
  display: flex; flex-direction: column; align-items: center;
  position: relative; width: 120px; /* 固定寬度 */
  transition: all 0.3s;
}
.is-folded { opacity: 0.6; filter: grayscale(80%); }

/* --- 1. 頭像樣式 --- */
.avatar-wrapper {
  width: 70px; height: 70px;
  background: #2c3e50; /* 深色底 */
  border-radius: 50%;
  border: 3px solid #34495e; /* 深灰色邊框 */
  overflow: hidden; /* 讓圖片變成圓形 */
  position: relative; z-index: 5; /* 疊在資訊面板上面 */
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

/* 輪到該玩家時的發光效果 */
.is-active .avatar-wrapper {
  border-color: #f1c40f; box-shadow: 0 0 20px #f1c40f;
}

/* 莊家和皇冠 */
.dealer-btn {
  position: absolute; bottom: 0; right: 0;
  width: 24px; height: 24px; background: white; border: 2px solid #333;
  border-radius: 50%; font-weight: bold; font-size: 14px; color: black;
  display: flex; justify-content: center; align-items: center;
}
.crown { position: absolute; top: -12px; left: -10px; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }

/* --- 2. 資訊面板樣式 (參考圖風格) --- */
.info-panel {
  background: #212121; /* 極深黑色背景 */
  width: 100%;
  padding: 35px 10px 10px 10px; /* 上方留多一點空間給頭像蓋住 */
  border-radius: 12px;
  margin-top: -35px; /* 往上拉，讓頭像蓋住它 */
  text-align: center;
  border: 2px solid #3a3a3a;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  z-index: 1;
}
.is-active .info-panel { border-color: #f1c40f; }

.player-name {
  color: #ffffff; font-weight: bold; font-size: 0.95rem;
  margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; /* 名字太長省略 */
}

.chips-display { font-size: 0.9rem; }
.chips-amount { color: #f1c40f; /* 金黃色籌碼文字 */ font-weight: bold; }
.currency { color: #aaa; font-size: 0.8rem; margin-right: 2px;}
.allin-text { color: #e74c3c; font-weight: 900; letter-spacing: 1px; }

/* --- 3. 手牌區域 --- */
.hand-cards-slot { display: flex; gap: 4px; margin-top: 8px; height: 40px; justify-content: center; }
.mini-card-img { width: 28px; height: auto; border-radius: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
</style>