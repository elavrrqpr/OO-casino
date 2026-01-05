<template>
  <div class="player-pod" :class="{ 'is-active': player.isTurn, 'is-folded': player.status === 'FOLDED', 'is-spectator': isSpectator}">
    
    <div class="avatar-wrapper">
      <img :src="player.avatar" class="avatar-img" alt="avatar" />
      
      <span v-if="player.isHost" class="crown">👑</span>
    </div>

    <transition name="pop-up">
        <div v-if="actionFeedback" class="action-bubble" :class="actionFeedback.action">
            {{ actionFeedback.text }}
        </div>
    </transition>

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
            <img v-for="(card, i) in player.cards" :key="i" :src="getCardSrc(card)" class="mini-card-img":class="{ 'winner-anim': isWinningHandCard(card) }"/>         
        </template>

        <template v-else-if="player.hasCards && player.status !== 'FOLDED'">
            <img src="/cards/back.png" class="mini-card-img" />
            <img src="/cards/back.png" class="mini-card-img" />
        </template>

        <div v-else-if="player.status === 'WAITING' || player.status === 'SIT_OUT'" class="spectator-label">
            等待遊玩中
        </div>
    </div>


  </div>
</template>

<script setup>
// 圖片路徑轉換函式 (保持不變)
const getCardSrc = (cardObj) => {
  if (!cardObj) return '';
  const suitMap = { '♠': 'spade', '♥': 'heart', '♦': 'diamond', '♣': 'club' };
  const valueMap = { 'A': 1, 'J': 11, 'Q': 12, 'K': 13 };
  const rank = valueMap[cardObj.value] || cardObj.value;
  const suit = suitMap[cardObj.suit];
  return `/cards/${suit}_${rank}.png`;
};

const props = defineProps(['player', 'actionFeedback', 'winningCardSet']);
const isWinningHandCard = (card) => {
    if (!card || !props.winningCardSet) return false;
    const id = `${card.suit}_${card.value}`; // 產生跟 PokerTable 一樣的 ID
    return props.winningCardSet.has(id);
};
</script>

<style scoped>
/* --- 整體容器 --- */
.player-pod {
  display: flex; flex-direction: column; align-items: center;
  position: relative; width: 120px; /* 固定寬度 */
  transition: all 0.3s ease;
}

.is-folded { opacity: 0.6; filter: grayscale(80%); }

/* 觀戰者稍微變暗一點，區分場上玩家 */
.is-spectator {
  opacity: 0.5 !important;       /* 更透明一點，原本 0.8 可能看不出來 */
  transform: scale(0.85);        /* 縮更小，原本 0.95 可能不明顯 */
  filter: grayscale(100%);       /* 讓觀戰者變成黑白，更明顯 */
}

/* 觀戰中文字標籤 */
.spectator-label {
  color: #bdc3c7;         
  font-weight: bold;
  font-size: 0.8rem;
  background: rgba(0,0,0,0.6); /* 背景深一點 */
  padding: 4px 10px;
  border-radius: 12px;
  margin-top: 0;
  line-height: 1;
  letter-spacing: 1px;
  border: 1px solid #7f8c8d;
  white-space: nowrap;
}

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
.hand-cards-slot { display: flex; gap: 4px; margin-top: 8px; height: 40px; justify-content: center; align-items: center; }
.mini-card-img { width: 28px; height: auto; border-radius: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); }

/* 動作氣泡樣式 */
.action-bubble {
  position: absolute;
  top: 15px; /* 蓋在頭像中間偏上 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 20; /* 最上層 */
  
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 900;
  font-size: 1rem;
  color: white;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  border: 2px solid white;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

/* 不同動作的顏色 */
.action-bubble.fold { background: #7f8c8d; } /* 灰 */
.action-bubble.check { background: #e67e22; } /* 橘 */
.action-bubble.call { background: #3498db; } /* 藍 */
.action-bubble.raise { background: #2ecc71; transform: translateX(-50%) scale(1.1); } /* 綠 (稍微大一點) */
.action-bubble.allin { 
    background: #e74c3c; 
    font-size: 1.2rem; 
    border-color: #f1c40f; 
    box-shadow: 0 0 15px #e74c3c;
}

/* 氣泡彈出動畫 */
.pop-up-enter-active { animation: bubble-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.pop-up-leave-active { transition: opacity 0.3s; }
.pop-up-leave-to { opacity: 0; }

@keyframes bubble-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.5) translateY(20px); }
  100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
}

@keyframes slotCardJump {
  0% { transform: translateY(0); }
  50% { transform: translateY(-15px) scale(1.2); box-shadow: 0 0 10px #f1c40f; border: 1px solid #f1c40f; }
  100% { transform: translateY(-15px) scale(1.2); box-shadow: 0 0 10px #f1c40f; border: 1px solid #f1c40f; }
}

.winner-anim {
  animation: slotCardJump 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  z-index: 100;
  position: relative; /* 確保 z-index 生效 */
}

</style>