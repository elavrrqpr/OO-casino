// backend/PokerGame.js
const BaseGame = require('./BaseGame');
const Deck = require('./Deck');

class PokerGame extends BaseGame {
    constructor(roomId, walletService) {
        super(roomId, 'poker');
        this.walletService = walletService;
        this.minPlayers = 2;
        this.deck = new Deck();
        this.communityCards = [];
        this.hostId = null; // 【新增】紀錄房主 ID
    }

    addPlayer(player) {
        // 第一個進來的人自動變成房主
        if (this.players.length === 0) {
            this.hostId = player.id;
        }
        super.addPlayer(player);
    }

    // 【新增】手動開賽方法
    manualStart(requestPlayerId) {
        // 檢查：請求者必須是房主、人數必須夠、且狀態必須在 LOBBY
        if (requestPlayerId !== this.hostId) return { success: false, msg: "只有房主可以開始遊戲" };
        if (this.players.length < this.minPlayers) return { success: false, msg: "人數不足 2 人" };
        if (this.gameState !== 'LOBBY') return { success: false, msg: "遊戲已在進行中" };

        this.beginGame();
        return { success: true };
    }

    beginGame() {
        this.gameState = 'PLAYING';
        this.deck.reset();
        this.communityCards = [];

        this.players.forEach(player => {
            player.cards = this.deck.draw(2);
            // 初始狀態下，設定牌為「蓋著」的狀態（在後端紀錄，不傳給別人）
            player.isShowingCards = false; 
        });

        this.communityCards = this.deck.draw(5);
        console.log("--- 遊戲開始：私密發牌完成 ---");
    }
}

module.exports = PokerGame;