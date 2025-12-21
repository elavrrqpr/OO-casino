// server.js 核心邏輯
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const PokerGame = require('./PokerGame');
const WalletService = require('./WalletService');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const wallet = new WalletService();
const rooms = {}; // 存放所有 PokerGame 實例

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

io.on('connection', (socket) => {
    console.log('玩家連接:', socket.id);

    // --- A. 玩家加入房間 ---
    socket.on('joinRoom', ({ roomId, nickname }) => {
        wallet.initWallet(socket.id);
        const balance = wallet.getBalance(socket.id);

        if (!rooms[roomId]) {
            rooms[roomId] = new PokerGame(roomId, wallet);
        }

        const player = { id: socket.id, name: nickname, chips: balance };
        rooms[roomId].addPlayer(player);
        socket.join(roomId);

        io.to(roomId).emit('roomUpdated', {
            players: rooms[roomId].players,
            gameState: rooms[roomId].gameState
        });
    });

    // --- B. 手動添加 AI ---
    socket.on('addAI', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].addBot();
            io.to(roomId).emit('roomUpdated', {
                players: rooms[roomId].players
            });
        }
    });

    // --- C. 房主點擊開始 (原本這段在外面，現在移進來了) ---
    socket.on('startGame', (roomId) => {
        const game = rooms[roomId];
        if (game) {
            const result = game.manualStart(socket.id);
            
            if (result.success) {
                // 1. 廣播遊戲狀態為 PLAYING
                io.to(roomId).emit('gameStarted', { gameState: 'PLAYING' });

                // 2. 私密發牌 (這裡 socket 變數才有效)
                game.players.forEach(player => {
                    if (!player.isBot) {
                        io.to(player.id).emit('receiveCards', { myCards: player.cards });
                    }
                });

                // 3. 更新全房間資訊
                io.to(roomId).emit('roomUpdated', {
                    players: game.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        chips: p.chips,
                        isHost: p.id === game.hostId
                    })),
                    gameState: game.gameState
                });
            } else {
                socket.emit('errorMsg', result.msg);
            }
        }
    }); // <--- startGame 的結尾

    // --- D. 玩家離線處理 ---
    socket.on('disconnect', () => {
        console.log('玩家離開:', socket.id);
        // 建議這裡要補上從房間移除玩家的邏輯
    });

}); // <--- 【關鍵】這是 io.on('connection') 的結尾，必須包住所有 socket.on

server.listen(3000, () => console.log('Gartic Poker 運行在 http://localhost:3000'));