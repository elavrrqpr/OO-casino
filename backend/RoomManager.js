// backend/RoomManager.js
const PokerGame = require('./PokerGame');
const Player = require('./Player');

class RoomManager {
    constructor() {
        this.rooms = {}; // 存放所有房間 ID -> PokerGame 實例
    }

    // 取得給前端顯示的房間列表 (不包含密碼等敏感資訊)
    getPublicRoomList() {
        return Object.values(this.rooms).map(game => ({
            id: game.roomId,
            name: game.roomName,
            players: game.players.length,
            maxPlayers: game.maxPlayers || 6,
            hasPassword: !!game.password, // 轉成布林值，告訴前端有沒有鎖就好
            status: game.gameState // LOBBY 或 PLAYING
        }));
    }

    createRoom({ roomName, password, hostName, hostId }) {
        // 產生唯一 ID (例如: room_170988...)
        const roomId = 'room_' + Date.now();
        
        // 實例化遊戲
        const newGame = new PokerGame(roomId, roomName, password);
        this.rooms[roomId] = newGame;

        console.log(`[RoomManager] ${hostName} 創建了房間: ${roomName} (${roomId})`);
        return roomId;
    }

    joinRoom(roomId, playerSocketId, nickname, avatar, password, character) {
        const game = this.rooms[roomId];

        if (!game) return { success: false, msg: '房間不存在' };
        if (game.players.length >= (game.maxPlayers || 6)) return { success: false, msg: '房間已滿' };
        
        // 驗證密碼
        if (game.password && game.password !== password) {
            return { success: false, msg: '密碼錯誤' };
        }

        // 建立玩家物件
        // 如果是第一個加入的，PokerGame 內部會自動設為 hostId
        const newPlayer = new Player(playerSocketId, nickname, playerSocketId, 20000, avatar,character);
        game.addPlayer(newPlayer);
        
        return { success: true, game };
    }

    leaveRoom(roomId, socketId) {
        const game = this.rooms[roomId];
        if (!game) return null;

        // ▼▼▼ 修改點 3: 接收被刪除的玩家並處理房主轉移 ▼▼▼
        const removedPlayer = game.removePlayer(socketId);
        
        if (removedPlayer) {
            console.log(`[RoomManager] 玩家 ${removedPlayer.name} 離開房間 ${roomId}`);

            // 如果房間空了，就刪除
            if (game.players.length === 0) {
                delete this.rooms[roomId];
                console.log(`[RoomManager] 房間 ${roomId} 已清空並刪除`);
                return null; // 房間沒了，回傳 null
            }

            // 【關鍵】如果離開的人是房主，將權限交給下一位 (陣列第 0 人)
            if (game.hostId === socketId && game.players.length > 0) {
                game.hostId = game.players[0].id;
                console.log(`[RoomManager] 👑 房主變更為: ${game.players[0].name}`);
            }
        }
        // ▲▲▲ ▲▲▲

        return game; // 回傳遊戲物件，讓外部可以廣播更新
    }

    getGame(roomId) {
        return this.rooms[roomId];
    }
}

module.exports = new RoomManager(); // 匯出單例模式 (Singleton)