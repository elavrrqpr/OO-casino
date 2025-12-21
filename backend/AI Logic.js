// BotLogic.js
const makeDecision = (handStrength) => {
    const rand = Math.random() * 100;

    // handStrength 0-1 (0很爛, 1最強)
    if (handStrength < 0.3) {
        if (rand < 70) return 'FOLD'; // 爛牌 70% 蓋掉
        return 'CHECK';               // 30% 偷雞看看
    } else {
        if (rand < 50) return 'CALL'; // 好牌 50% 跟注
        if (rand < 80) return 'RAISE';// 30% 加注
        return 'ALL_IN';              // 20% 嚇死真人玩家
    }
}

module.exports = { makeDecision };