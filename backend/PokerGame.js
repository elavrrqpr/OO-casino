// backend/PokerGame.js
const BaseGame = require('./BaseGame');
const Deck = require('./Deck');
const HandEvaluator = require('./HandEvaluator');

class PokerGame extends BaseGame {
    constructor(roomId, roomName = '德州撲克', password = '') {
        super(roomId, 'poker');
        
        this.minPlayers = 2;
        this.smallBlind = 100; 
        this.bigBlind = 200;   
        this.roomName = roomName; 
        this.password = password; 
        
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;             
        this.currentBet = 0;      
        this.dealerIndex = -1;     
        this.currentTurnIndex = 0; 
        this.lastRoundWinners = [];
        this.maxPlayers = 6;
        this.gameStage = 'LOBBY'; 
        this.hostId = null;

        // ▼▼▼ 新增：用來存放外部傳進來的廣播功能 ▼▼▼
        this.onAutoUpdate = null;   // 當階段改變時 (發牌)
        this.onAutoGameEnd = null;  // 當遊戲結束時
    }
    
    // ▼▼▼ 新增：設定回調函數的方法 ▼▼▼
    setCallbacks(onUpdate, onGameEnd) {
        this.onAutoUpdate = onUpdate;
        this.onAutoGameEnd = onGameEnd;
    }

    get currentTurnPlayerId() {
        if (!this.players || this.players.length === 0) return null;
        const player = this.players[this.currentTurnIndex];
        return player ? player.id : null;
    }

    addPlayer(player) {
        if (this.players.length >= 6) return false; 
        if (this.players.length === 0) this.hostId = player.id;
        super.addPlayer(player);
        return true;
    }

    manualStart(requestPlayerId) {
        if (requestPlayerId !== this.hostId) return { success: false, msg: "只有房主可以開始遊戲" };
        if (this.players.length < this.minPlayers) return { success: false, msg: "人數不足 2 人" };
        if (this.gameState !== 'LOBBY') return { success: false, msg: "遊戲已在進行中" };

        const unreadyPlayers = this.players.filter(p => !p.isReady);
        if (unreadyPlayers.length > 0) {
            const names = unreadyPlayers.map(p => p.name).join(', ');
            return { success: false, msg: `等待玩家準備中: ${names}` };
        }

        this.beginGame();
        return { success: true };
    }

    beginGame() {
        this.gameState = 'PLAYING';
        this.gameStage = 'PREFLOP';
        this.deck.reset();
        this.pot = 0;
        this.currentBet = 0;
        this.communityCards = [];
        this.lastRoundWinners = [];
        
        this.players.forEach(p => {
            if (p.chips <= 0) p.status = 'SIT_OUT';
            else p.resetForNewHand(); 
        });

        const activeCount = this.players.filter(p => p.status !== 'SIT_OUT').length;
        if (activeCount < 2) {
            this.gameState = 'ENDED'; 
            return;
        }

        if (this.dealerIndex >= this.players.length || this.dealerIndex < 0) this.dealerIndex = -1;
        this.dealerIndex = this._findNextActivePlayer(this.dealerIndex);
        
        this.players.forEach((p, index) => p.isDealer = (index === this.dealerIndex));

        let sbIndex, bbIndex;
        if (activeCount === 2) {
            sbIndex = this.dealerIndex;
            bbIndex = this._findNextActivePlayer(this.dealerIndex);
        } else {
            sbIndex = this._findNextActivePlayer(this.dealerIndex);
            bbIndex = this._findNextActivePlayer(sbIndex);
        }

        this._postBlind(sbIndex, this.smallBlind);
        this._postBlind(bbIndex, this.bigBlind);
        this.currentBet = this.bigBlind;

        this.players.forEach(p => {
            if (p.status === 'ACTIVE' || p.status === 'ALLIN') {
                p.cards = this.deck.draw(2);
                p.isShowingCards = false;
            }
        });

        if (activeCount === 2) this.currentTurnIndex = sbIndex;
        else this.currentTurnIndex = this._findNextActivePlayer(bbIndex);
        
        this._updateTurnStatus();
        this.communityCards = this.deck.draw(5); 
    }

    handlePlayerAction(playerId, actionType, amount = 0) {
        if (this.gameState !== 'PLAYING') return { success: false, msg: '遊戲未開始' };
        
        const currentPlayer = this.players[this.currentTurnIndex];
        if (playerId !== currentPlayer.id) return { success: false, msg: '還沒輪到你' };

        let resultMsg = '';
        let actionValue = 0;

        switch (actionType) {
            case 'fold':
                currentPlayer.status = 'FOLDED';
                resultMsg = `${currentPlayer.name} 棄牌`;
                break;
            case 'check':
                if (currentPlayer.roundBet < this.currentBet) return { success: false, msg: '不能過牌，需要跟注' };
                resultMsg = `${currentPlayer.name} 過牌`;
                break;
            case 'call':
                const callAmount = this.currentBet - currentPlayer.roundBet;
                if (currentPlayer.chips < callAmount) return this.handlePlayerAction(playerId, 'allin'); 
                this._placeBet(currentPlayer, callAmount);
                resultMsg = `${currentPlayer.name} 跟注 ${callAmount}`;
                actionValue = callAmount;
                break;
            case 'raise':
                const totalBet = amount;
                if (totalBet <= this.currentBet) return { success: false, msg: '加注金額必須大於當前注額' };
                if (currentPlayer.chips < (totalBet - currentPlayer.roundBet)) return { success: false, msg: '籌碼不足' };
                this._placeBet(currentPlayer, totalBet - currentPlayer.roundBet);
                this.currentBet = totalBet; 
                this._resetHasActedForRaise(currentPlayer.id);
                resultMsg = `${currentPlayer.name} 加注至 ${totalBet}`;
                actionValue = totalBet;
                break;     
            case 'allin':
                const allInAmount = currentPlayer.chips;
                this._placeBet(currentPlayer, allInAmount);
                currentPlayer.status = 'ALLIN';
                if (currentPlayer.roundBet > this.currentBet) {
                    this.currentBet = currentPlayer.roundBet;
                    this._resetHasActedForRaise(currentPlayer.id);
                }
                resultMsg = `${currentPlayer.name} All-in!`;
                actionValue = allInAmount;
                break;
            default:
                return { success: false, msg: '未知動作' };
        }

        currentPlayer.hasActed = true; 
        console.log(resultMsg);

        if (this._checkWinByFold()) return { success: true, action: actionType, val: actionValue };

        if (this._isRoundComplete()) {
            this.nextStage();
        } else {
            this.nextTurn();
        }
        return { success: true, action: actionType, val: actionValue };
    }

    _findNextActivePlayer(currentIndex) {
        let nextIndex = currentIndex;
        for (let i = 0; i < this.players.length; i++) {
            nextIndex = (nextIndex + 1) % this.players.length;
            if (['SIT_OUT', 'WAITING'].indexOf(this.players[nextIndex].status) === -1) return nextIndex;
        }
        return currentIndex; 
    }

    _postBlind(playerIndex, amount) {
        const player = this.players[playerIndex];
        if (!player) return;
        const actualAmount = Math.min(player.chips, amount);
        this._placeBet(player, actualAmount);
        if (player.chips === 0) player.status = 'ALLIN';
        player.hasActed = false;
    }

    _placeBet(player, amount) {
        player.chips -= amount;
        player.roundBet += amount; 
        player.totalHandBet += amount; 
        this.pot += amount;
    }

    _updateTurnStatus() {
        this.players.forEach((p, index) => p.isTurn = (index === this.currentTurnIndex));
    }

    _resetHasActedForRaise(raiserId) {
        this.players.forEach(p => {
            if (p.id !== raiserId && p.status === 'ACTIVE') p.hasActed = false; 
        });
    }

    nextTurn() {
        let loopCount = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
            loopCount++;
        } while (
            ['FOLDED', 'ALLIN', 'SIT_OUT', 'WAITING'].includes(this.players[this.currentTurnIndex].status) && 
             loopCount < this.players.length
        );
        this._updateTurnStatus();
    }

    _isRoundComplete() {
        const activePlayers = this.players.filter(p => !['FOLDED', 'SIT_OUT', 'WAITING', 'ALLIN'].includes(p.status));
        if (activePlayers.length === 0) return true;
        return activePlayers.every(p => p.roundBet === this.currentBet && p.hasActed);
    }

    nextStage() {
        this.players.forEach(p => { p.roundBet = 0; p.hasActed = false; });
        this.currentBet = 0;

        switch (this.gameStage) {
            case 'PREFLOP': this.gameStage = 'FLOP'; break;
            case 'FLOP': this.gameStage = 'TURN'; break;
            case 'TURN': this.gameStage = 'RIVER'; break;
            case 'RIVER': 
                this.gameStage = 'SHOWDOWN';
                // 進入結算，並呼叫回調通知 Server
                const result = this.endGame(); 
                if (this.onAutoGameEnd) this.onAutoGameEnd(result);
                return; 
        }

        this.currentTurnIndex = this._findNextActivePlayer(this.dealerIndex);
        if (this.players[this.currentTurnIndex].status !== 'ACTIVE') this.nextTurn();
        
        this._updateTurnStatus();
        console.log(`--- 進入階段: ${this.gameStage} ---`);

        // ▼▼▼ 【All-in 自動導航邏輯】 ▼▼▼
        const activePlayersCount = this.players.filter(p => p.status === 'ACTIVE').length;
        if (activePlayersCount < 2) {
            console.log("⚡ All-in 自動快轉中...");
            this.currentTurnIndex = -1; // 隱藏按鈕
            
            // 1. 馬上通知前端更新 (讓按鈕消失，讓牌翻出來)
            if (this.onAutoUpdate) this.onAutoUpdate();

            setTimeout(() => {
                this.nextStage();
                // 2. 階段切換後，再次通知前端 (除非已經結束了)
                if (this.gameStage !== 'SHOWDOWN' && this.onAutoUpdate) {
                    this.onAutoUpdate();
                }
            }, 1000); 
        }
    }

    getPublicCommunityCards() {
        if (this.gameStage === 'PREFLOP') return [];
        if (this.gameStage === 'FLOP') return this.communityCards.slice(0, 3);
        if (this.gameStage === 'TURN') return this.communityCards.slice(0, 4);
        return this.communityCards; 
    }

    _checkWinByFold() {
        const activePlayers = this.players.filter(p => !['FOLDED', 'SIT_OUT', 'WAITING'].includes(p.status));
        if (activePlayers.length === 1) {
            this.endGame(activePlayers[0]); 
            return true;
        }
        return false;
    }

    _formatSolverCard(solverCard) {
        const suitMap = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' };
        const valueMap = { 'T': '10' }; 
        return {
            suit: suitMap[solverCard.suit] || solverCard.suit,
            value: valueMap[solverCard.value] || solverCard.value
        };
    }

    endGame(winner = null) {
        this.gameState = 'SHOWDOWN'; 
        this.gameStage = 'SHOWDOWN';

        const result = { winners: [], pot: this.pot };
        let winningHands = [];
        
        if (winner) {
            winningHands = [{ originalPlayer: winner, name: 'Win by Fold', descr: 'Opponents Folded' }];
        } else {
            winningHands = HandEvaluator.determineWinners(this.players, this.communityCards);
        }

        if (winningHands.length > 0) {
            const share = Math.floor(this.pot / winningHands.length);
            winningHands.forEach(hand => {
                const p = hand.originalPlayer;
                p.chips += share;
                const bestFiveCards = hand.cards ? hand.cards.map(c => this._formatSolverCard(c)) : [];
                result.winners.push({
                    id: p.id,
                    name: p.name,
                    profit: share,
                    handTitle: hand.name, 
                    handDetail: hand.descr,
                    winningCombination: bestFiveCards,
                    character: p.character 
                });
            });
        }
        
        this.lastRoundWinners = result.winners;
        this.pot = 0;
        return result;
    }

    resetToLobby() {
        this.gameState = 'LOBBY';
        this.gameStage = 'LOBBY';
        this.pot = 0;
        this.currentBet = 0;
        this.communityCards = [];
        this.lastRoundWinners = [];
        this.players.forEach(p => {
             if (p.chips <= 0) p.status = 'SIT_OUT';
             else {
                 p.cards = [];
                 p.roundBet = 0;
                 p.totalHandBet = 0;
                 p.isTurn = false;
                 p.hasActed = false;
                 p.status = 'WAITING'; 
                 p.isReady = (p.id === this.hostId);
             }
        });
    }
}
module.exports = PokerGame;