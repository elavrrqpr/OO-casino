// backend/HandEvaluator.js
const Hand = require('pokersolver').Hand;

class HandEvaluator {

    // 主函數：輸入玩家列表與公用牌，回傳贏家列表（支援平手）
    static determineWinners(players, communityCards) {
        // 1. 過濾出還在玩且沒蓋牌的玩家
        const activePlayers = players.filter(p => p.status !== 'FOLDED' && p.status !== 'SIT_OUT');
        
        if (activePlayers.length === 0) return [];

        // 2. 準備給 pokersolver 的資料
        const solvedHands = activePlayers.map(player => {
            // 結合 手牌 + 公用牌 (共 7 張)
            const sevenCards = [...player.cards, ...communityCards];
            
            // 轉成字串格式 (例如: ['As', 'Kd', 'Th'...])
            const cardStrings = sevenCards.map(c => this._convertCardToString(c));
            
            // 呼叫套件計算牌力
            const hand = Hand.solve(cardStrings);
            
            // 把原始玩家物件綁定上去，方便等一下找人
            hand.originalPlayer = player; 
            
            return hand;
        });

        // 3. 找出贏家 (pokersolver 自帶 winners 方法，會自動處理平手 Split Pot)
        const winningHands = Hand.winners(solvedHands);

        // 4. 回傳原本的 Player 物件
        return winningHands;
    }

    // --- 格式轉換 ---
    // 將 { suit: '♠', value: '10' } 轉成 'Ts' (Ten of Spades)
    static _convertCardToString(card) {
        const suitMap = {
            '♠': 's', // Spades
            '♥': 'h', // Hearts
            '♦': 'd', // Diamonds
            '♣': 'c'  // Clubs
        };

        const valueMap = {
            '10': 'T', // T 代表 10
            'J': 'J',
            'Q': 'Q',
            'K': 'K',
            'A': 'A'
        };
        // 如果是 2~9 直接用，如果是 10,J,Q,K,A 查表
        const val = valueMap[card.value] || card.value; 
        const suit = suitMap[card.suit];

        return `${val}${suit}`; // 例如 "As", "Td", "7h"
    }
}

module.exports = HandEvaluator;