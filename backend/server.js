// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./RoomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- 共用廣播函數：更新房間狀態 ---
const broadcastRoomState = (roomId, game) => {
    io.to(roomId).emit('roomUpdated', {
        players: game.players.map(p => p.getPublicData(game.gameState === 'SHOWDOWN')), 
        gameState: game.gameState,
        pot: game.pot,
        communityCards: game.getPublicCommunityCards(),
        currentTurn: game.currentTurnPlayerId,
        hostId: game.hostId
    });
};

// --- 共用廣播函數：處理遊戲結束 ---
const handleGameEnd = (roomId, game, result) => {
    // 1. 製作排行榜
    const rankings = game.players
        .map(p => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            isWinner: game.lastRoundWinners.some(w => w.id === p.id) 
        }))
        .sort((a, b) => b.chips - a.chips);
            
    // 2. 廣播結算資訊 (前端 4 秒後才會顯示視窗)
    io.to(roomId).emit('gameEnded', { 
        winners: game.lastRoundWinners, // 這裡面現在有 character 了
        rankings: rankings,
        newGameCountdown: 3 
    });

    // 3. 倒數後自動開始新局
    setTimeout(() => {
        const liveGame = roomManager.getGame(roomId);
        if (liveGame) {
            // 踢除破產玩家
            const brokePlayers = liveGame.players.filter(p => p.chips <= 0);
            brokePlayers.forEach(p => {
                console.log(`💸 玩家 ${p.name} 破產，踢出房間`);
                roomManager.leaveRoom(roomId, p.id);
                io.to(p.id).emit('kicked', { msg: '您的籌碼已歸零，請重新加入遊戲！' });
                const socketInfo = io.sockets.sockets.get(p.id);
                if (socketInfo) socketInfo.leave(roomId);
            });

            if (!roomManager.getGame(roomId)) return; // 如果房間沒了就結束

            console.log(`房間 ${roomId} 自動開始下一局...`);
            liveGame.resetToLobby(); 

            // 廣播更新 (變回 LOBBY)
            broadcastRoomState(roomId, liveGame);
            io.emit('roomListUpdate');
        }
    }, 5000); 
};


io.on('connection', (socket) => {
    console.log('✅ 玩家連線:', socket.id);

    socket.on('getRooms', () => {
        socket.emit('roomList', roomManager.getPublicRoomList());
    });

    socket.on('createRoom', ({ roomName, password, nickname, avatar }) => {
        const roomId = roomManager.createRoom({
            roomName, password, hostName: nickname, hostId: socket.id
        });
        socket.emit('roomCreated', { roomId, password });
        io.emit('roomListUpdate');
    });

    socket.on('joinRoom', ({ roomId, nickname, avatar, password, character}) => {
        const result = roomManager.joinRoom(roomId, socket.id, nickname, avatar, password, character);
        if (!result.success) {
            socket.emit('errorMsg', result.msg);
            return;
        }
        const game = result.game;
        socket.join(roomId);
        socket.emit('joinSuccess', { roomId });
        
        broadcastRoomState(roomId, game);
        io.emit('roomListUpdate');
    });

    socket.on('startGame', (roomId) => {
        const game = roomManager.getGame(roomId);
        if (!game) return;

        // 把廣播器綁定給遊戲，讓它自動跑時也能更新
        game.setCallbacks(
            () => broadcastRoomState(roomId, game),          // 自動更新時呼叫
            (result) => handleGameEnd(roomId, game, result)  // 自動結束時呼叫
        );

        const result = game.manualStart(socket.id);
        if (result.success) {
            io.to(roomId).emit('gameStarted', { gameState: 'PLAYING' });
            game.players.forEach(p => {
                io.to(p.id).emit('receiveCards', { myCards: p.cards });
            });
            broadcastRoomState(roomId, game);
            io.emit('roomListUpdate');
        }
    });

    socket.on('action', ({ roomId, type, amount }) => {
        const game = roomManager.getGame(roomId);
        if (!game) return;

        const result = game.handlePlayerAction(socket.id, type, amount);
        
        if (result.success) {
            io.to(roomId).emit('playerActed', {
                playerId: socket.id,
                action: result.action,
                value: result.val
            });
            
            // 廣播盤面
            broadcastRoomState(roomId, game);
            
            // 如果剛好是由玩家動作觸發了結算 (例如最後一人 Fold)
            if (game.gameState === 'SHOWDOWN') {
                // 因為是手動觸發，game.lastRoundWinners 已經算好了
                // 這裡只傳 null 進去，因為 handleGameEnd 會自己去讀 game.lastRoundWinners
                handleGameEnd(roomId, game, null);
            }
        } else {
            socket.emit('errorMsg', result.msg);
        }
    });

    socket.on('playerReady', (roomId) => {
        const game = roomManager.getGame(roomId);
        if (!game) return;
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            player.isReady = true; 
            broadcastRoomState(roomId, game);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in roomManager.rooms) {
            const game = roomManager.leaveRoom(roomId, socket.id);
            if (game) {
                broadcastRoomState(roomId, game);
            }
            io.emit('roomListUpdate');
        }
    });
    
    socket.on('leaveRoom', () => {
         for (const roomId in roomManager.rooms) {
            const game = roomManager.leaveRoom(roomId, socket.id);
            if (game) {
                 broadcastRoomState(roomId, game);
            }
         }
         io.emit('roomListUpdate');
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 後端伺服器啟動: http://localhost:${PORT}`));