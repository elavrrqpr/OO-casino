// BaseGame.js
class BaseGame {
    constructor(roomId, type) {
        this.roomId = roomId;
        this.gameType = type; // 'poker', 'slots' 等
        this.players = [];
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, MAINTENANCE
    }

    addPlayer(player) {
        if (this.players.some(p => p.id === player.id)) {
            // 已經在裡面了，可能要擋掉或者更新 socketId
            return; 
        }
        this.players.push(player);
        console.log(`玩家 ${player.name} 加入了 ${this.roomId}`);
    }

    removePlayer(playerId) {
        // 1. 先把要刪除的人找出來
        const removedPlayer = this.players.find(p => p.id === playerId);

        // 2. 執行刪除
        this.players = this.players.filter(p => p.id !== playerId);

        // 3. 把刪除的人回傳出去，讓 server.js 可以處理後事（存錢、廣播）
        return removedPlayer; 
    }
}

module.exports = BaseGame; // 這行沒寫，PokerGame 會找不到它