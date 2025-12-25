// backend/Player.js

class Player {
    constructor(id, name, socketId, chips = 20000, isBot = false) {
        // --- 1. 身分識別 ---
        this.id = id;             // 使用者的資料庫 ID 或 UUID
        this.name = name;         // 顯示名稱
        this.socketId = socketId; // 【關鍵】Socket.IO 的連線 ID，用來傳送私密訊息
        this.isBot = isBot;       // 是否為 AI 玩家 (預設不是)

        // --- 2. 資產與手牌 ---
        this.chips = chips;       // 攜帶上桌的籌碼 (Buy-in)
        this.cards = [];          // 手牌 (2張)
        
        // --- 3. 該局遊戲狀態 ---
        // 'WAITING' (等待下一局), 'ACTIVE' (遊戲中), 'FOLDED' (棄牌), 'ALLIN' (全押)
        this.status = 'WAITING'; 
        
        // --- 4. 下注相關數據 ---
        this.roundBet = 0;        // 在這個「下注圈」(Street) 已經下注多少 (用來計算要補多少錢)
        this.totalHandBet = 0;    // 這整局遊戲總共投入多少 (若這局贏了，退水或統計用)
        this.isDealer = false;    // 是否為莊家位 (Button)
        this.isTurn = false;      // 是否輪到我行動
        this.hasActed = false;   // 是否在本輪下注圈已經行動過 (用來判斷是否可以結束該圈)
    }

    // 重置單局狀態 (每局開始時呼叫)
    resetForNewHand() {
        this.cards = [];
        if (this.chips > 0) {
            this.status = 'ACTIVE';
        } else {
            this.status = 'SIT_OUT'; // 沒錢就只能旁觀
        }
        this.roundBet = 0;
        this.totalHandBet = 0;
        this.isTurn = false;
        this.hasActed = false;
        // 注意：chips 不重置，isDealer 由遊戲邏輯控制
    }

    // 重置下注圈 (進入 Flop, Turn, River 時呼叫)
    resetRoundBet() {
        this.roundBet = 0;
    }

    // --- 【關鍵】資料過濾 ---
    // 傳給前端時，不要把別人的牌傳出去！
    getPublicData(isShowdown = false) {
        return {
            id: this.id,
            name: this.name,
            chips: this.chips,
            status: this.status,
            roundBet: this.roundBet,
            isDealer: this.isDealer,
            isTurn: this.isTurn,
            isBot: this.isBot, // 告訴前端這個人是不是機器人 (可以顯示機器人圖示)
            // 如果是攤牌階段(Showdown)或是自己看自己，才給牌，否則給 null 或背面圖示代碼
            cards: isShowdown ? this.cards : null, 
            hasCards: this.cards.length > 0 // 讓前端知道他有牌，只是蓋著
        };
    }
}

module.exports = Player;