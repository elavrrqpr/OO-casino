// server.js 核心邏輯
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PokerGame = require('./PokerGame');
// const WalletService = require('./WalletService');
const Player = require('./backend/Player');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const wallet = new WalletService();
const rooms = {}; // 1. 全域變數：用來存所有房間 (記憶體資料庫)
                  // 結構範例: { "roomA": <PokerGame實例>, "roomB": ... }

// 設定靜態檔案 (讓瀏覽器可以讀到 html, css, js)
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const DEFAULT_CHIPS = 20000; // 設定初始籌碼

io.on('connection', (socket) => {
    console.log('玩家連接:', socket.id);

    // --- A. 玩家加入房間 ---
    socket.on('joinRoom', ({ roomId, nickname }) => {
        // 2. 如果房間不存在，就 new 一個新的 PokerGame
        if (!rooms[roomId]) {
            rooms[roomId] = new PokerGame(roomId);
        }
        // 3. 建立玩家物件，並加入遊戲
        const newPlayer = new Player(socket.id, nickname, socket.id, DEFAULT_CHIPS);
        rooms[roomId].addPlayer(newPlayer);
        // 4. 讓 socket 加入這個房間的廣播頻道
        socket.join(roomId);
        // 5. 廣播：有人進來了，更新大家畫面
        io.to(roomId).emit('roomUpdated', {
            players: rooms[roomId].players.map(p => p.getPublicData()), 
            gameState: rooms[roomId].gameState
        });
    });

    /*
    // --- B. 手動添加 AI ---
    socket.on('addAI', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].addBot();
            io.to(roomId).emit('roomUpdated', {
                players: rooms[roomId].players.map(p => p.getPublicData()), // 記得加上 map
                gameState: rooms[roomId].gameState
            });
        }
    });*/

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
                    players: game.players.map(p => p.getPublicData()),
                    gameState: game.gameState
                });
            } else {
                socket.emit('errorMsg', result.msg);
            }
        }
    }); // <--- startGame 的結尾


    // --- D. 處理玩家下注動作 (新增這段) ---
    socket.on('action', ({ roomId, type, amount }) => {
        // type 可能為: 'check', 'call', 'raise', 'fold', 'allin'
        const game = rooms[roomId];
        if (!game) return;

        // 呼叫 PokerGame 裡的邏輯處理函數
        // 我們傳入 socket.id 確保是本人操作
        const result = game.handlePlayerAction(socket.id, type, amount);

        if (result.success) {
            // 動作合法，廣播最新的盤面狀態給所有人
            io.to(roomId).emit('roomUpdated', {
                players: game.players.map(p => p.getPublicData()), // 記得用 getPublicData
                gameState: game.gameState,
                pot: game.pot,             // 當前底池
                communityCards: game.getPublicCommunityCards(), // 公用牌 (或是用 game.getPublicCommunityCards())
                currentTurn: game.currentTurnPlayerId // 告訴前端現在輪到誰 (用來高亮頭像)
            });
            
            // 檢查：如果遊戲結束了 (Showdown)，可能需要額外的廣播
            if (game.gameState === 'SHOWDOWN') {
                // 製作排行榜 (依照籌碼排序)
                const rankings = game.players
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        chips: p.chips,
                        // 檢查他是否在贏家列表 (lastRoundWinners 是我們在 PokerGame 加的)
                        isWinner: game.lastRoundWinners.some(w => w.id === p.id) 
                    }))
                    .sort((a, b) => b.chips - a.chips);
                     
                 io.to(roomId).emit('gameEnded', { 
                     winners: game.lastRoundWinners,
                     rankings: rankings,       // 前端用這個顯示列表
                     newGameCountdown: 5
                 });

                 // 5 秒後自動開始新局(還沒寫完)
                 setTimeout(() => {
                    // 再次檢查房間是否存在 (防止所有人都退出了房間已被刪除)
                    if (rooms[roomId]) {
                        console.log(`房間 ${roomId} 自動開始下一局...`);
                        
                        // 1. 重置並開始新局
                        game.beginGame(); 

                        // 2. 廣播新局開始
                        io.to(roomId).emit('gameStarted', { gameState: 'PLAYING' });

                        // 3. 發新牌
                        game.players.forEach(p => {
                            // 只發給有參與且不是機器人的人
                            if (p.status !== 'SIT_OUT' && !p.isBot) {
                                io.to(p.id).emit('receiveCards', { myCards: p.cards });
                            }
                        });

                        // 4. 更新畫面
                        io.to(roomId).emit('roomUpdated', {
                            players: game.players.map(p => p.getPublicData()),
                            gameState: game.gameState
                        });
                    }
                }, 5000);
            }

        } else {
            // 動作不合法 (例如錢不夠還想加注，或是沒輪到他)
            // 只回傳給操作者
            socket.emit('errorMsg', result.msg);
        }
    });

    // --- E. 玩家離線處理 ---
    socket.on('disconnect', () => {
        console.log('玩家斷線:', socket.id);
    
        // 遍歷所有房間，找到這個 socket.id 所在的房間
        for (const roomId in rooms) {
            const game = rooms[roomId];
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                // 從遊戲邏輯中移除
                game.removePlayer(socket.id); // 假設 BaseGame 有寫 removePlayer
                
                // 通知房間其他人
                io.to(roomId).emit('roomUpdated', {
                    players: game.players.map(p => p.getPublicData()),
                    gameState: game.gameState
                });
                
                // 如果房間沒人了，為了節省記憶體，可以刪除房間
                if (game.players.length === 0) {
                    delete rooms[roomId];
                    console.log(`房間 ${roomId} 已清空並刪除`);
                }
                break; // 找到就跳出迴圈
            }
        }
    });

}); // <--- 【關鍵】這是 io.on('connection') 的結尾，必須包住所有 socket.on

server.listen(3000, () => console.log('Gartic Poker 運行在 http://localhost:3000'));