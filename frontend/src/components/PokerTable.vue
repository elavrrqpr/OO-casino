<template>
  <div class="table-wrapper">
    
    <button class="btn-sound-toggle" @click="toggleGlobalMute">
        {{ audioState.isGlobalMute ? '🔇' : '🔊' }}
    </button>
    <transition name="pop-up">
      <div v-if="gameResult" class="victory-overlay">
        <div class="victory-modal">
          
          <div class="victory-header">
            {{ (gameResult.winners && gameResult.winners.length > 1) ? '平手' : ' 贏家 ' }}
          </div>

          <div class="winners-list">
            <div 
              v-for="winner in gameResult.winners" 
              :key="winner.id" 
              class="winner-card"
            >
              <div class="winner-header">
                <div class="winner-info">
                  <span class="winner-name">{{ winner.name }}</span>
                  <span class="win-amount">+ ${{ winner.profit.toLocaleString() }}</span>
                </div>
                <div class="hand-type-badge">{{ winner.handTitle }}</div>
              </div>
              
              <div class="card-section">
                <div class="section-label">底牌</div>
                <div class="cards-row">
                  <img 
                    v-for="(card, i) in getWinnerCards(winner.id)" 
                    :key="'hole-'+i" 
                    :src="getCardSrc(card)" 
                    class="result-card-img"
                  />
                </div>
              </div>

              <div class="card-section" v-if="winner.winningCombination && winner.winningCombination.length > 0">
                <div class="section-label">獲勝組合 ({{ winner.handTitle }})</div>
                <div class="cards-row highlight-bg">
                  <img 
                    v-for="(card, i) in winner.winningCombination" 
                    :key="'best-'+i" 
                    :src="getCardSrc(card)" 
                    class="result-card-img"
                    :class="{ 'dimmed': isKicker(card, winner.winningCombination, winner.handTitle) }"
                    :style="{ 'animation-delay': `${i * 0.1 + 0.3}s` }"
                  />
                </div>
              </div>

            </div>
          </div>

          <div class="next-game-timer">
            {{ gameResult.newGameCountdown }} 秒後開始下一局...
          </div>

        </div>
      </div>
    </transition>
    <div 
      v-if="roomData?.gameState === 'LOBBY' || myPlayer?.status === 'WAITING'" 
      class="start-game-overlay"
    >
      
      <div class="waiting-box">
    
        <h2 class="waiting-title">
            {{ roomData?.gameState === 'LOBBY' ? '準備室' : '遊戲進行中' }}
        </h2>

        <div v-if="roomData?.gameState === 'LOBBY'" class="lobby-player-list">
            <div v-for="p in roomData?.players" :key="p.id" class="lobby-player-item">
                <span class="p-name">{{ p.name }}</span>
                <span v-if="p.id === roomData.hostId">👑</span>
                <span v-else-if="p.isReady" class="ready-icon">✅</span>
                <span v-else class="waiting-icon">⏳</span>
            </div>
        </div>

        <div v-else class="mid-game-status">
          <div class="spectator-icon">👀</div>
          <div class="spectator-hint">
            遊戲正在進行中...<br>
            <span class="sub-hint">本局結束後您將自動加入</span>
          </div>
        </div>

        <div class="waiting-info">
          目前人數: <span class="highlight-num">{{ roomData?.players?.length || 0 }}</span> / 6
        </div>
        <div v-if="roomData?.gameState === 'LOBBY'">
            <div v-if="isHost">
                <button 
                    class="btn-start" 
                    @click="startGame" 
                    :disabled="(roomData?.players?.length || 0) < 2 || !allPlayersReady"
                >
                    {{ !allPlayersReady ? '等待玩家...' : '開始遊戲' }}
                </button>
                
                <div v-if="(roomData?.players?.length || 0) < 2" class="hint-text">
                    (至少需要 2 人才能開始)
                </div>
            </div>
            
            <div v-else class="waiting-text">
                <span v-if="myPlayer?.isReady">等待房主開始遊戲...</span>
                <span v-else>請確認狀態...</span>
            </div>
        </div>

      </div>
    </div>

    <div v-if="showContinueModal" class="continue-overlay">
      <div class="continue-box">
        <h2 class="continue-title">本局結束</h2>
        <div class="current-chips">
            目前籌碼: <span class="money">${{ myPlayer?.chips?.toLocaleString() }}</span>
        </div>
        <div class="continue-btns">
            <button class="btn-quit" @click="$emit('leave')">退出遊戲</button>
            <button class="btn-continue" @click="handleContinue">繼續遊玩</button>
        </div>
      </div>
    </div>

    <div class="poker-table" ref="tableRef">
      
      <div class="community-cards">
        <div 
          v-for="(card, i) in 5" 
          :key="i" 
          class="card-slot"
          :class="{ 'revealed': getCommunityCard(i) }"
        >
          <img 
            v-if="getCommunityCard(i)" 
            :src="getCardSrc(getCommunityCard(i))" 
            class="card-img"
            :class="{ 'winner-anim': isWinningCardOnTable(getCommunityCard(i)) }"
            :style="{ 'animation-delay': isWinningCardOnTable(getCommunityCard(i)) ? `${i * 0.1}s` : '0s' }"
          />
        </div>
      </div>

      <div class="pot-display" v-if="roomData?.pot > 0">
        POT: ${{ roomData.pot.toLocaleString() }}
      </div>

      <div 
        v-for="(player, index) in rotatedPlayers" 
        :key="player.id"
        class="player-position"
        :style="getSeatStyle(index, rotatedPlayers.length)"
      >
        <PlayerSlot :player="player" :action-feedback="actionFeedbacks[player.id]"/>
        <div v-if="player.isDealer" class="dealer-btn">D</div>
      </div>
    </div>

    <div class="my-controls-area">
      
      <div class="my-hand" v-if="myCards.length > 0">
        <img 
          v-for="(card, i) in myCards" 
          :key="i" 
          :src="getCardSrc(card)"
          class="hand-card-img"
        />
      </div>
      <div class="my-hand-placeholder" v-else>
        {{ roomData?.gameState === 'PLAYING' ? '等待發牌...' : '' }}
      </div>

      <div class="action-bar" v-if="isMyTurn">
        
        <div v-if="showRaiseSlider" class="slider-container">
          <div class="slider-info">加注: ${{ raiseAmount }}</div>
          <div class="slider-wrapper">
            <span>{{ minRaise }}</span>
            <input type="range" v-model.number="raiseAmount" :min="minRaise" :max="maxRaise" step="50">
            <span>{{ maxRaise }}</span>
          </div>
          <div class="slider-btns">
             <button class="btn-action confirm" @click="sendAction('raise', raiseAmount)">確定</button>
             <button class="btn-action cancel" @click="showRaiseSlider = false">取消</button>
          </div>
        </div>

        <div v-else class="normal-btns">
          <button class="btn-action fold" @click="sendAction('fold')">棄牌</button>
          
          <button v-if="currentTableBet > (myPlayer?.roundBet || 0)" class="btn-action call" @click="sendAction('call')">
            跟注 ${{ currentTableBet - (myPlayer?.roundBet || 0) }}
          </button>
          <button v-else class="btn-action check" @click="sendAction('check')">過牌</button>

          <button class="btn-action raise" @click="sendAction('toggle-raise')">加注</button>
          <button class="btn-action allin" @click="sendAction('allin')">All In</button>
        </div>

      </div>

      <div class="status-msg" v-else>
        <span v-if="roomData?.gameState === 'PLAYING'">
            {{ currentTurnPlayerName ? `等待 ${currentTurnPlayerName} 行動...` : '' }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import PlayerSlot from './PlayerSlot.vue'; 
import socket from '../services/socket'; 

// ▼▼▼ 【新增】引入聲音管理器 ▼▼▼
import { playCharacterSound, toggleGlobalMute, audioState } from '../services/AudioManager';

const props = defineProps(['roomData', 'roomId']);
const emit = defineEmits(['leave']);
const showContinueModal = ref(false); 
const justFinishedGame = ref(false); 
const actionFeedbacks = reactive({}); 

const gameResult = ref(null);
const raiseAmount = ref(0); 
const showRaiseSlider = ref(false); 
const myCards = ref([]);

const tableRef = ref(null);
const tableRect = reactive({ width: 0, height: 0 });
const winningCardSet = ref(new Set());
const getCardId = (card) => `${card.suit}_${card.value}`;

const updateTableSize = () => {
  if (tableRef.value) {
    tableRect.width = tableRef.value.offsetWidth;
    tableRect.height = tableRef.value.offsetHeight;
  }
};

const getCardSrc = (cardObj) => {
  if (!cardObj) return '';
  const suitMap = { '♠': 'spade', '♥': 'heart', '♦': 'diamond', '♣': 'club' };
  const valueMap = { 'A': 1, 'J': 11, 'Q': 12, 'K': 13 };
  const rank = valueMap[cardObj.value] || cardObj.value;
  const suit = suitMap[cardObj.suit];
  return `/cards/${suit}_${rank}.png`;
};

const getWinnerCards = (winnerId) => {
  if (!props.roomData?.players) return [];
  const player = props.roomData.players.find(p => p.id === winnerId);
  return player ? player.cards : [];
};

const isKicker = (card, all5Cards, handTitle) => {
  if (!handTitle) return false;
  const title = handTitle.toLowerCase();
  const val = card.value; 
  
  // 1. 先統計「勝利5張牌」的點數分佈
  const handCounts = {};
  all5Cards.forEach(c => handCounts[c.value] = (handCounts[c.value] || 0) + 1);

  // 2. 統計「公牌區」的點數分佈 (用來檢查核心是否在桌上)
  const boardCounts = {};
  if (props.roomData?.communityCards) {
      props.roomData.communityCards.forEach(c => {
          if(c) boardCounts[c.value] = (boardCounts[c.value] || 0) + 1;
      });
  }

  // 輔助：檢查某個點數是否「完全由公牌提供」
  const isFromBoard = (val, needed) => (boardCounts[val] || 0) >= needed;

  // --- 開始判斷 ---

  // 1. 四條: 還是維持變暗 (因為四條本身太搶眼了，踢腳通常不重要，除非公牌四條)
  if (title.includes('four')) {
      // 進階：如果公牌就有四條，那踢腳全亮；否則踢腳變暗
      const quadRank = all5Cards.find(c => handCounts[c.value] >= 4).value;
      if (isFromBoard(quadRank, 4)) return false; 
      return handCounts[val] < 4; 
  }

  // 2. 葫蘆 / 順子 / 同花: 5張都是核心，全亮
  if (title.includes('full house') || title.includes('straight') || title.includes('flush')) {
      return false; 
  }

  // 3. 三條 (Three of a Kind)
  if (title.includes('three')) {
      if (handCounts[val] >= 3) return false; // 三條本體 -> 亮

      // 踢腳判斷：如果桌上已經有三條 (公牌三條)，踢腳就很重要 -> 全亮
      const tripRank = all5Cards.find(c => handCounts[c.value] >= 3).value;
      if (isFromBoard(tripRank, 3)) return false;

      return true; // 普通三條 -> 踢腳變暗
  }

  // 4. 兩對 (Two Pair) - 這是你最在意的！
  if (title.includes('two pair')) {
      if (handCounts[val] >= 2) return false; // 對子本體 -> 亮

      // 踢腳判斷：找出這兩對的點數
      const pairRanks = Object.keys(handCounts).filter(r => handCounts[r] >= 2);
      
      // 檢查是否「兩對都在公牌上」
      const isBoardTwoPair = pairRanks.every(r => isFromBoard(r, 2));

      if (isBoardTwoPair) return false; // 情況A：公牌兩對 -> 踢腳全亮 (因為踢腳是關鍵)
      return true; // 情況B：手牌湊的 -> 踢腳變暗 (凸顯對子)
  }

  // 5. 一對 (Pair)
  if (title.includes('pair')) {
      if (handCounts[val] >= 2) return false; // 對子本體 -> 亮

      // 踢腳判斷：如果桌上已經有一對 (公牌對子)，踢腳全亮
      const pairRank = all5Cards.find(c => handCounts[c.value] >= 2).value;
      if (isFromBoard(pairRank, 2)) return false;

      return true; // 普通對子 -> 踢腳變暗
  }

  // 6. 高牌: 只亮最大那張
  if (title.includes('high card')) {
     return all5Cards.indexOf(card) > 0; 
  }

  return false;
};

const isWinningCardOnTable = (card) => {
    if (!card) return false;
    return winningCardSet.value.has(getCardId(card));
};

const handleContinue = () => {
    socket.emit('playerReady', props.roomId);
    showContinueModal.value = false;
};

const allPlayersReady = computed(() => {
    if (!props.roomData?.players) return false;
    return props.roomData.players.every(p => p.isReady);
});

onMounted(() => {
  socket.on('receiveCards', (data) => myCards.value = data.myCards);

  socket.on('gameEnded', (data) => {
    justFinishedGame.value = true;

    winningCardSet.value.clear();
    if (data.winners && data.winners.length > 0) {
        // 把所有贏家的獲勝組合都加進去 (考慮平手 Split Pot 會有兩組)
        data.winners.forEach(w => {
            if (w.winningCombination) {
                w.winningCombination.forEach(c => {
                    winningCardSet.value.add(getCardId(c));
                });
            }
        });
    }

    setTimeout(() => {
        if (data.winners && data.winners.length > 0) {
            const mainWinner = data.winners[0];
            if (mainWinner.character) {
                 playCharacterSound(mainWinner.character, 'win', mainWinner.id);
            }
        }
        gameResult.value = data; 
    }, 2000);
  });

  socket.on('gameStarted', () => {
    myCards.value = [];
    showRaiseSlider.value = false;
    gameResult.value = null;
  });

  socket.on('roomUpdated', (data) => {
    if (data.gameState === 'LOBBY' && justFinishedGame.value) {
        gameResult.value = null;
        myCards.value = [];
        if (!isHost.value) {
            showContinueModal.value = true;
        }
        justFinishedGame.value = false; 
    }
  });

  socket.on('playerActed', (data) => {
    const { playerId, action, value } = data;

    // ▼▼▼ 【新增】動作語音觸發 ▼▼▼
    const player = props.roomData?.players?.find(p => p.id === playerId);
    if (player && player.character) {
        // action 對應: 'fold', 'check', 'call', 'raise', 'allin'
        playCharacterSound(player.character, action, playerId);
    }
    // ▲▲▲ 新增結束 ▲▲▲

    let text = '';
    if (action === 'fold') text = '棄牌';
    else if (action === 'check') text = '過牌';
    else if (action === 'call') text = `跟注 $${value}`;
    else if (action === 'raise') text = `加注 $${value}`;
    else if (action === 'allin') text = 'ALL IN';

    actionFeedbacks[playerId] = { text, action };

    setTimeout(() => {
        if (actionFeedbacks[playerId]?.text === text) {
            delete actionFeedbacks[playerId];
        }
    }, 2000);
  });
  
  updateTableSize();
  window.addEventListener('resize', updateTableSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTableSize);
  socket.off('receiveCards');
  socket.off('gameEnded');
  socket.off('gameStarted');
});

const isHost = computed(() => props.roomData?.hostId === socket.id);
const hostName = computed(() => {
  const host = props.roomData?.players?.find(p => p.id === props.roomData.hostId);
  return host ? host.name : '未知';
});
const isMyTurn = computed(() => props.roomData?.currentTurn === socket.id);
const currentTurnPlayerName = computed(() => {
  const p = props.roomData?.players?.find(p => p.id === props.roomData.currentTurn);
  return p ? p.name : '';
});
const myPlayer = computed(() => props.roomData?.players?.find(p => p.id === socket.id));
const currentTableBet = computed(() => props.roomData?.players ? Math.max(...props.roomData.players.map(p => p.roundBet || 0)) : 0);
const minRaise = computed(() => Math.min(currentTableBet.value === 0 ? 200 : currentTableBet.value * 2, maxRaise.value));
const maxRaise = computed(() => myPlayer.value ? myPlayer.value.chips + (myPlayer.value.roundBet || 0) : 0);
const getCommunityCard = (index) => props.roomData?.communityCards?.[index] || null;

const rotatedPlayers = computed(() => {
  if (!props.roomData?.players) return [];
  const players = props.roomData.players;
  const myIndex = players.findIndex(p => p.id === socket.id);
  if (myIndex === -1) return players; 

  const others = [];
  for (let i = 1; i < players.length; i++) {
    const idx = (myIndex + i) % players.length;
    others.push(players[idx]);
  }
  return others;
});

const SEAT_LAYOUTS = {
  2: [{ x: 0, y: -1.5 }],
  3: [{ x: -1.15, y: -0.8 }, { x: 0.88, y: -0.8 }],
  4: [{ x: -1.2, y: -0.4 }, { x: -0.1, y: -1.5 }, { x: 0.92, y: -0.4 }],
  5: [{ x: -1.1, y: 0.3 }, { x: -1, y: -1.2 }, { x: 0.7, y: -1.2 }, { x: 0.8, y: 0.3 }],
  6: [{ x: -1, y: 0.4 }, { x: -1.1, y: -0.9 }, { x: -0.1, y: -1.37 }, { x: 0.85, y: -0.9 }, { x: 0.75, y: 0.4 }]
};

const getSeatStyle = (index, totalOthers) => {
  const totalPlayers = totalOthers + 1;
  const layout = SEAT_LAYOUTS[totalPlayers];
  if (tableRect.width === 0 || !layout || !layout[index]) return {};
  const w = tableRect.width;
  const h = tableRect.height;
  const radiusX = w / 2;
  const radiusY = h / 2;
  const pos = layout[index]; 
  const x = pos.x * radiusX;
  const y = pos.y * radiusY;
  return { transform: `translate(${x}px, ${y}px)` };
};

const startGame = () => {
  console.log("嘗試開始遊戲，房間ID:", props.roomId); 
  socket.emit('startGame', props.roomId); 
};
const sendAction = (type, amount = 0) => {
  if (type === 'toggle-raise') {
    raiseAmount.value = minRaise.value;
    showRaiseSlider.value = true;
    return;
  }
  socket.emit('action', { roomId: props.roomId, type, amount });
  showRaiseSlider.value = false;
};
</script>

<style scoped>
/* ▼▼▼ 【新增】靜音按鈕樣式 ▼▼▼ */
.btn-sound-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 2000;
    width: 50px; 
    height: 50px;
    border-radius: 50%;
    border: 3px solid #fff;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    transition: all 0.2s;
}
.btn-sound-toggle:hover {
    background: #e74c3c;
    transform: scale(1.1);
}
/* ▲▲▲ 新增結束 ▲▲▲ */

.table-wrapper {
  position: relative; 
  width: 100vw; 
  height: 100vh;
  background-image: url('/tableback.jpg');
  background-size: cover; 
  background-position: center;
  background-repeat: no-repeat;
  display: flex; 
  justify-content: center; 
  align-items: center;
  overflow: hidden;
}
.btn-back { position: absolute; top: 20px; left: 20px; z-index: 100; width: 40px; height: 40px; border-radius: 50%; border: none; font-size: 1.5rem; cursor: pointer; background: white; }

.start-game-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7); 
  z-index: 999; 
  display: flex; justify-content: center; align-items: center;
}
.waiting-box {
  background: white; padding: 30px 50px; border-radius: 20px;
  text-align: center; border: 5px solid #f1c40f;
  box-shadow: 0 0 30px rgba(241, 196, 15, 0.5);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.waiting-title { margin: 0 0 10px; font-size: 2rem; color: #333; }
.waiting-info { font-size: 1.2rem; color: #666; margin-bottom: 20px; }
.highlight-num { font-weight: bold; color: #e74c3c; font-size: 1.5rem; }

.btn-start {
  background: linear-gradient(to bottom, #2ecc71, #27ae60);
  border: none; border-bottom: 5px solid #1e8449;
  color: white; font-size: 1.5rem; font-weight: bold;
  padding: 10px 40px; border-radius: 50px; cursor: pointer;
  transition: all 0.1s;
}
.btn-start:active { transform: translateY(4px); border-bottom: 0px; }
.btn-start:disabled { background: #95a5a6; border-bottom: 5px solid #7f8c8d; cursor: not-allowed; }
.hint-text { color: #e74c3c; margin-top: 10px; font-weight: bold; }
.waiting-text { color: #2980b9; font-weight: bold; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

.lobby-player-list {
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 20px; text-align: left;
  background: #f8f9fa; padding: 15px; border-radius: 10px;
  max-height: 200px; overflow-y: auto;
}

.lobby-player-item {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 5px;
}

.p-name { font-weight: bold; color: #2c3e50; }
.ready-icon { color: #2ecc71; }
.waiting-icon { color: #95a5a6; animation: spin 2s infinite linear; }

@keyframes spin { 100% { transform: rotate(360deg); } }

.poker-table {
  width: 70vw;           
  height: 35vw;          
  max-width: 1000px;     
  max-height: 500px;
  background-image: url('/images/table.png'); 
  background-size: 100% 100%; 
  background-repeat: no-repeat;
  background-position: center;
  position: relative;
  margin: 0 auto;
}
.community-cards { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 8px; }
.card-slot { width: 50px; height: 70px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 2px dashed rgba(255,255,255,0.3); display: flex; justify-content: center; align-items: center; }

.card-img { width: 100%; height: 100%; object-fit: contain; }
.pot-display { position: absolute; top:28%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.5); color: #f1c40f; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
.player-position { position: absolute; top: 50%; left: 50%; width: 0; height: 0; }
.dealer-btn { position: absolute; top: -10px; right: -20px; width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 12px; border: 2px solid black; }

.my-controls-area { position: absolute; bottom: 20px; display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%; }
.my-hand { display: flex; gap: 10px; }
.hand-card-img {
  width: 110px; 
  height: auto;
  border-radius: 6px; 
  box-shadow: 0 5px 15px rgba(0,0,0,0.5); 
  transition: transform 0.2s;
  object-fit: contain; 
}

.hand-card-img:hover {
  transform: translateY(-20px) scale(1.05); 
}

.action-bar { display: flex; gap: 10px; background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 30px; min-height: 60px; align-items: center; }
.slider-container { display: flex; flex-direction: column; align-items: center; gap: 8px; background: rgba(0,0,0,0.85); padding: 15px 25px; border-radius: 20px; border: 2px solid #f1c40f; transform: translateY(-20px); }
.slider-info { color: white; font-size: 1.1rem; font-weight: bold; }
.slider-wrapper { display: flex; align-items: center; gap: 10px; color:white;}
.slider-btns { display: flex; gap: 10px; margin-top: 5px; }
.normal-btns { display: flex; gap: 10px; }
.btn-action { padding: 10px 20px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; color: white; transition: transform 0.1s; }
.btn-action:active { transform: scale(0.95); }
.fold { background: #c0392b; }
.check { background: #f39c12; }
.call { background: #2980b9; }
.raise { background: #27ae60; }
.allin { background: #8e44ad; }
.confirm { background: #2ecc71; }
.cancel { background: #95a5a6; }
.status-msg { color: white; font-size: 1.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }

.victory-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.85); 
  z-index: 2000; 
  display: flex; justify-content: center; align-items: center;
  backdrop-filter: blur(5px); 
}

.victory-modal {
  background: linear-gradient(135deg, #fff, #f0f0f0);
  padding: 40px;
  border-radius: 20px;
  border: 5px solid #f1c40f; 
  box-shadow: 0 0 50px rgba(241, 196, 15, 0.6);
  text-align: center;
  min-width: 400px;
  max-width: 90vw;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.victory-header {
  font-size: 3rem; font-weight: 900; color: #d35400;
  margin-bottom: 20px;
  text-shadow: 2px 2px 0px #f1c40f;
}

.winner-card {
  background: #2c3e50;
  padding: 15px;
  border-radius: 15px;
  margin-bottom: 20px;
  border: 2px solid #34495e;
  text-align: left; 
}

.winner-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;
}

.winner-name { color: white; font-size: 1.5rem; font-weight: bold; }
.win-amount { color: #f1c40f; font-size: 1.5rem; font-weight: 900; margin-left: 10px;}

.card-section {
  margin-top: 10px;
}

.section-label {
  color: #bdc3c7; font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;
}

.cards-row {
  display: flex; gap: 8px;
}

.highlight-bg {
  background: rgba(241, 196, 15, 0.1); 
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed rgba(241, 196, 15, 0.3);
}

.result-card-img {
  width: 60px; 
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.win-amount {
  color: #f1c40f; font-size: 2.5rem; font-weight: 900;
  text-shadow: 0 2px 4px black;
}

.next-game-timer {
  color: #7f8c8d; font-weight: bold; margin-top: 10px;
}

.pop-up-enter-active, .pop-up-leave-active { transition: all 0.3s ease; }
.pop-up-enter-from, .pop-up-leave-to { opacity: 0; transform: scale(0.8); }

.continue-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.85); z-index: 2500; 
  display: flex; justify-content: center; align-items: center;
}

.continue-box {
  background: white; padding: 30px 50px; border-radius: 20px;
  text-align: center; border: 5px solid #3498db;
  box-shadow: 0 0 30px rgba(52, 152, 219, 0.5);
  animation: popIn 0.3s;
}

.continue-title { font-size: 2rem; color: #2c3e50; margin-bottom: 20px; }
.current-chips { font-size: 1.5rem; margin-bottom: 30px; font-weight: bold; color: #555; }
.money { color: #f1c40f; font-size: 1.8rem; margin-left: 10px; }

.continue-btns { display: flex; gap: 20px; }
.btn-quit {
  background: #e74c3c; color: white; border: none; padding: 12px 30px;
  border-radius: 10px; font-size: 1.2rem; font-weight: bold; cursor: pointer;
}
.btn-continue {
  background: #2ecc71; color: white; border: none; padding: 12px 30px;
  border-radius: 10px; font-size: 1.2rem; font-weight: bold; cursor: pointer;
}
.btn-quit:hover, .btn-continue:hover { transform: scale(1.05); }


.mid-game-status {
  margin: 20px 0;
  padding: 20px;
}

.spectator-icon {
  font-size: 4rem;
  margin-bottom: 10px;
  animation: float 3s ease-in-out infinite;
}

.spectator-hint {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
  line-height: 1.5;
}

.sub-hint {
  font-size: 0.9rem;
  color: #7f8c8d;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
/* 原本的圖片樣式保持不變 */
.result-card-img {
  width: 60px; 
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  transition: all 0.3s; /* 加個過渡動畫 */
}

/* ▼▼▼ 新增：變暗樣式 ▼▼▼ */
.result-card-img.dimmed {
  opacity: 0.5;        /* 透明度 50% */
  filter: grayscale(80%); /* 變成黑白 */
  transform: scale(0.9);  /* 稍微縮小一點 */
  box-shadow: none;       /* 去掉陰影 */
}

@keyframes cardUpFloat {
  0% {
    transform: translateY(0);
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  100% {
    /* 往上移動 25px */
    transform: translateY(-25px) scale(1.05); 
    /* 加深陰影，製造懸浮感 */
    box-shadow: 0 15px 30px rgba(0,0,0,0.5);
    /* 確保邊框高亮更明顯 */
    border: 2px solid #f1c40f;
  }
}

/* 2. 套用到目標牌上 */
/* 選擇器翻譯：在 .victory-modal 裡面的 .highlight-bg 區塊裡面的 .result-card-img，且它「不是」.dimmed 的時候 */
.victory-modal .highlight-bg .result-card-img:not(.dimmed) {
  /* 套用上面定義的動畫：時長0.5秒，緩出效果，結尾停留在最後狀態(forwards) */
  animation: cardUpFloat 0.5s ease-out forwards;
  
  /* 初始狀態先往下藏一點點，讓它跳起來的感覺更強烈 (非必要，可自行調整) */
  transform: translateY(5px);
  /* 重要：因為有設定 animation-delay，在動畫開始前要保持初始狀態 */
  animation-fill-mode: both; 
}

@keyframes tableCardJump {
  0% { transform: translateY(0); }
  50% { transform: translateY(-20px) scale(1.1); box-shadow: 0 0 15px #f1c40f; border: 2px solid #f1c40f; }
  100% { transform: translateY(-20px) scale(1.1); box-shadow: 0 0 15px #f1c40f; border: 2px solid #f1c40f; }
}

.winner-anim {
  /* 0.5秒跳上去，然後停在那邊 (forwards) */
  animation: tableCardJump 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  z-index: 100; /* 確保浮起來時蓋過隔壁的牌 */
}

</style>