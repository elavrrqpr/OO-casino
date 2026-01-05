// backend/Player.js

class Player {
    // 建構子：這裡的 = '/avatars/1.jpg' 只是「備胎」
    // 當 server.js 傳入正確的圖片路徑時，這個備胎就不會被使用
    constructor(id, name, socketId, chips = 20000, avatar = '/avatars/1.jpg', character) {
        
        // --- 1. 身分識別 ---
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        
        // 儲存真正傳進來的圖片 (例如 /avatars/6.jpg)
        this.avatar = avatar; 

        // --- 2. 資產與手牌 ---
        this.chips = chips;
        this.cards = [];
        this.character = character || '林';
        // --- 3. 該局遊戲狀態 ---
        this.status = 'WAITING'; 
        
        // --- 4. 下注相關數據 ---
        this.roundBet = 0;
        this.totalHandBet = 0;
        this.isDealer = false;
        this.isTurn = false;
        this.hasActed = false;

        this.isReady = true;
    }

    resetForNewHand() {
        this.cards = [];
        if (this.chips > 0) {
            this.status = 'ACTIVE';
        } else {
            this.status = 'SIT_OUT';
        }
        this.roundBet = 0;
        this.totalHandBet = 0;
        this.isTurn = false;
        this.hasActed = false;
    }

    resetRoundBet() {
        this.roundBet = 0;
    }

    getPublicData(isShowdown = false) {
        return {
            id: this.id,
            name: this.name,
            chips: this.chips,
            status: this.status,
            
            //  把這個頭像資料傳給前端，前端才能顯示出來
            avatar: this.avatar, 
            character: this.character,
            roundBet: this.roundBet,
            isDealer: this.isDealer,
            isTurn: this.isTurn,
            cards: isShowdown ? this.cards : null, 
            hasCards: this.cards.length > 0,

            isReady: this.isReady
        };
    }
}

module.exports = Player;