// BaseGame.js
class BaseGame {
    constructor(roomId, type) {
        this.roomId = roomId;
        this.gameType = type; // 'poker', 'slots' 等
        this.players = [];
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, MAINTENANCE
    }

    addPlayer(player) {
        this.players.push(player);
        console.log(`玩家 ${player.name} 加入了 ${this.roomId}`);
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }
}

module.exports = BaseGame; // 這行沒寫，PokerGame 會找不到它