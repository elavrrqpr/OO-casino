// src/services/AudioManager.js
import { reactive } from 'vue';

export const audioState = reactive({
  isGlobalMute: false,
  mutedPlayers: {},
});
// 用來記錄當前正在播放的音效物件
let currentAudio = null;

const soundMap = {
  // 1. 呂大槌 (OK)
  '呂大槌': {
    'allin': '呂all in.mp3',
    'fold': '呂fold.mp3',
    'raise': '呂raise.mp3',
    'check': '呂過牌.mp3',
    'call': '呂跟牌.mp3',
    'win': '呂勝利語音.mp3',
    'hurry': '呂誇啥小趕快出.mp3',
  },
  
  // 2. 蘿莉 (已修正：原本寫成 '羅'，改成 Lobby 的 '蘿')
  '蘿莉': { 
    'allin': '林 all in.mp3',
    'fold': '林 fold.mp3',
    'raise': '林 raise.mp3',
    'check': '林 check.mp3',
    'call': '林 跟.mp3',
    'win': '林 勝利.mp3',
    'normal': '林 平常.mp3'
  },
  
  // 3. 邱桑 (OK)
  '邱桑': {
    'allin': '邱 all in.mp3',
    'fold': '邱 fold.mp3',
    'raise': '邱 raise.mp3',
    'check': '邱 check.mp3',
    'call': '邱 跟.mp3',
    'win': '邱 勝利.mp3',
    'normal': '邱 平常.mp3'
  },
  
  // 4. michael (OK)
  'michael': {
    'allin': '許 all in.mp3',
    'fold': '許fold.mp3',
    'raise': '許 raise.mp3',
    'check': '許 check.mp3',
    'call': '許 跟牌.mp3',
    'win': '許 勝利.mp3',
    'normal': '許 平常.mp3'
  },
  
  // 5. 馮南京 (OK)
  '馮南京': {
    'allin': '馮 all in.mp3',
    'fold': '馮 fold.mp3',
    'raise': '馮 raise.mp3',
    'check': '馮 check.mp3',
    'call': '馮 跟牌.mp3',
    'win': '馮 勝利.mp3',
  },

  // 6. 王king (新增：原本漏掉這一位)
  '王king': {
    'allin': '林 all in.mp3', // 暫時借用林的聲音，你可以之後改
    'fold': '林 fold.mp3',
    'raise': '林 raise.mp3',
    'check': '林 check.mp3',
    'call': '林 跟.mp3',
    'win': '林 勝利.mp3',
  }
};

export function playCharacterSound(characterName, action, playerId = null) {
  if (audioState.isGlobalMute) return;
  if (playerId && audioState.mutedPlayers[playerId]) return;

  const charSounds = soundMap[characterName];
  if (!charSounds) return;

  const fileName = charSounds[action];
  if (!fileName) return;

  // ▼▼▼ 修改重點：切斷上一句 ▼▼▼
  if (currentAudio) {
    currentAudio.pause();      // 暫停上一句
    currentAudio.currentTime = 0; // 歸零
  }

  const audio = new Audio(`/voices/${fileName}`);
  currentAudio = audio; // 記錄新的這句
  
  audio.play().catch(e => console.error("播放失敗:", e));
  
  // 播放結束後清空記錄 (非必要，但好習慣)
  audio.onended = () => {
      if (currentAudio === audio) {
          currentAudio = null;
      }
  };
}

export function toggleGlobalMute() {
  audioState.isGlobalMute = !audioState.isGlobalMute;
  // 如果靜音了，當下的聲音也要馬上停掉
  if (audioState.isGlobalMute && currentAudio) {
      currentAudio.pause();
  }
}

export function togglePlayerMute(playerId) {
  if (audioState.mutedPlayers[playerId]) {
    delete audioState.mutedPlayers[playerId];
  } else {
    audioState.mutedPlayers[playerId] = true;
  }
}