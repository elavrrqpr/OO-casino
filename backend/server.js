// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ▼▼▼ 引入 RoomManager，不再直接引用 PokerGame ▼▼▼
const roomManager = require('./RoomManager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// app.use ... (省略靜態檔案設定)

io.on('connection', (socket) => {
    console.log('✅ 玩家連線:', socket.id);

    // --- 1. 取得房間列表 ---
    socket.on('getRooms', () => {
        socket.emit('roomList', roomManager.getPublicRoomList());
    });

    // --- 2. 創建房間 ---
    socket.on('createRoom', ({ roomName, password, nickname, avatar }) => {
        const roomId = roomManager.createRoom({
            roomName, 
            password, 
            hostName: nickname, 
            hostId: socket.id
        });

        // 創建後，通知前端「自動加入」
        // 前端收到 roomCreated 後，會自動發送 joinRoom 事件
        socket.emit('roomCreated', { roomId, password });
        
        // 廣播給所有人更新列表
        io.emit('roomListUpdate');
    });

    // --- 3. 加入房間 ---
    socket.on('joinRoom', ({ roomId, nickname, avatar, password }) => {
        const result = roomManager.joinRoom(roomId, socket.id, nickname, avatar, password);

        if (!result.success) {
            socket.emit('errorMsg', result.msg);
            return;
        }

        const game = result.game;
        socket.join(roomId);
        
        // 通知自己成功
        socket.emit('joinSuccess', { roomId });

        // 通知房間內其他人
        io.to(roomId).emit('roomUpdated', {
            players: game.players.map(p => p.getPublicData()), 
            gameState: game.gameState,
            currentTurn: game.currentTurnPlayerId,
            hostId: game.hostId, // 前端依靠這個顯示開始按鈕
            pot: game.pot,
            communityCards: game.getPublicCommunityCards()
        });

        // 更新大廳列表 (因為人數變了)
        io.emit('roomListUpdate');
    });

    // --- 4. 遊戲開始 ---
    socket.on('startGame', (roomId) => {
        const game = roomManager.getGame(roomId);
        if (!game) return;

        const result = game.manualStart(socket.id);
        if (result.success) {
            io.to(roomId).emit('gameStarted', { gameState: 'PLAYING' });
            
            // 發私有牌
            game.players.forEach(p => {
                if (!p.isBot) io.to(p.id).emit('receiveCards', { myCards: p.cards });
            });

            // 更新公開資訊
            io.to(roomId).emit('roomUpdated', {
                players: game.players.map(p => p.getPublicData()),
                gameState: game.gameState,
                pot: game.pot,
                communityCards: game.getPublicCommunityCards(),
                currentTurn: game.currentTurnPlayerId,
                hostId: game.hostId
            });
            
            // 遊戲狀態改變，列表也要更新 (顯示遊戲中)
            io.emit('roomListUpdate');
        }
    });

    // --- 5. 玩家動作 (下注等) ---
    socket.on('action', ({ roomId, type, amount }) => {
        const game = roomManager.getGame(roomId);
        if (!game) return;

        const result = game.handlePlayerAction(socket.id, type, amount);
        if (result.success) {
            // ... (這裡邏輯跟原本一樣，發送 roomUpdated, gameEnded 等) ...
            // 為了節省篇幅，這裡省略中間的廣播邏輯，請將原本的 action 邏輯複製過來即可
            // 只需要把 rooms[roomId] 改成 game 變數
             io.to(roomId).emit('roomUpdated', {
                players: game.players.map(p => p.getPublicData(game.gameState === 'SHOWDOWN')),
                gameState: game.gameState,
                pot: game.pot,
                communityCards: game.getPublicCommunityCards(),
                currentTurn: game.currentTurnPlayerId
            });
            
            if (game.gameState === 'SHOWDOWN') {
                // ... (結算邏輯同原版) ...
                 const rankings = game.players
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        chips: p.chips,
                        isWinner: game.lastRoundWinners.some(w => w.id === p.id) 
                    }))
                    .sort((a, b) => b.chips - a.chips);
                     
                 io.to(roomId).emit('gameEnded', { 
                     winners: game.lastRoundWinners,
                     rankings: rankings,
                     newGameCountdown: 5
                 });
                 
                 setTimeout(() => {
                    if (game) {
                         game.beginGame(); 
                        io.to(roomId).emit('gameStarted', { gameState: 'PLAYING' });

                        game.players.forEach(p => {
                            if (p.status !== 'SIT_OUT' && !p.isBot) {
                                io.to(p.id).emit('receiveCards', { myCards: p.cards });
                            }
                        });

                        io.to(roomId).emit('roomUpdated', {
                            players: game.players.map(p => p.getPublicData()),
                            gameState: game.gameState,
                            pot: game.pot,
                            communityCards: [], 
                            currentTurn: game.currentTurnPlayerId
                        });
                    }
                }, 5000);
            }
        }
    });

    // --- 6. 斷線/離開 ---
    socket.on('disconnect', () => {
        // 這裡需要遍歷找人，因為 socket.id 沒帶 roomId
        // RoomManager 沒有反向查表，所以我們要遍歷 (效率較低但這階段夠用)
        for (const roomId in roomManager.rooms) {
            const game = roomManager.leaveRoom(roomId, socket.id);
            if (game) {
                // 房間還在，通知剩餘玩家
                io.to(roomId).emit('roomUpdated', {
                    players: game.players.map(p => p.getPublicData()),
                    gameState: game.gameState,
                    hostId: game.hostId // 房主可能換人了
                });
            }
            // 無論房間是否還在，都要更新列表 (人數變少或房間消失)
            io.emit('roomListUpdate');
        }
    });
    
    // 主動離開房間
    socket.on('leaveRoom', () => {
         for (const roomId in roomManager.rooms) {
            const game = roomManager.leaveRoom(roomId, socket.id);
            if (game) {
                 io.to(roomId).emit('roomUpdated', {
                    players: game.players.map(p => p.getPublicData()),
                    gameState: game.gameState,
                    hostId: game.hostId
                });
            }
         }
         io.emit('roomListUpdate');
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 後端伺服器啟動: http://localhost:${PORT}`));