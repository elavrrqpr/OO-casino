<template>
  <div class="voice-panel">
    <h3>🔊 語音控制</h3>
    
    <div class="control-group">
      <button 
        @click="toggleGlobalMute" 
        :class="{ 'active': audioState.isGlobalMute }"
        class="mute-btn global-mute"
      >
        {{ audioState.isGlobalMute ? '🔇 已關閉所有語音' : '🔊 遊戲音效：開' }}
      </button>
    </div>

    <div class="player-list">
      <h4>單獨屏蔽玩家：</h4>
      <div v-for="player in players" :key="player.id" class="player-mute-item">
        <span>{{ player.name }} ({{ player.character }})</span>
        <button 
          @click="togglePlayerMute(player.id)"
          class="mute-icon-btn"
        >
          {{ isPlayerMuted(player.id) ? '🔇' : '🔈' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// 引入我們寫好的服務
import { audioState, toggleGlobalMute, togglePlayerMute } from '../services/AudioManager';

export default {
  name: "VoicePanel",
  props: {
    // 從父元件傳入玩家列表
    players: {
      type: Array,
      default: () => [] // [{id: 1, name: 'UserA', character: '林'}, ...]
    }
  },
  setup() {
    // 將 reactive state 暴露給 template 使用
    return { 
      audioState, 
      toggleGlobalMute, 
      togglePlayerMute 
    };
  },
  methods: {
    isPlayerMuted(pid) {
      return !!this.audioState.mutedPlayers[pid];
    }
  }
};
</script>

<style scoped>
/* 簡單樣式 */
.voice-panel {
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 10px;
  color: white;
}
.mute-btn {
  width: 100%;
  padding: 10px;
  background: #2ecc71;
  border: none;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  font-weight: bold;
}
.mute-btn.active {
  background: #e74c3c; /* 紅色表示靜音 */
}
.player-mute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 5px;
  background: #333;
  border-radius: 4px;
}
.mute-icon-btn {
  background: transparent;
  border: 1px solid #555;
  color: white;
  cursor: pointer;
  border-radius: 50%;
  width: 30px;
  height: 30px;
}
</style>