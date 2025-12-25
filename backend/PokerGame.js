const BaseGame = require('./BaseGame');
const Deck = require('./Deck');
const HandEvaluator = require('./HandEvaluator');

class PokerGame extends BaseGame {
    constructor(roomId) {
        super(roomId, 'poker');
        
        // --- 遊戲設定 ---
        this.minPlayers = 2;
        this.smallBlind = 100; // 小盲注金額
        this.bigBlind = 200;   // 大盲注金額

        // --- 遊戲狀態 ---
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;             // 當前底池總金額
        this.currentBet = 0;      // 這一輪目前的最高下注額 (用來判斷 Call 要多少)
        this.dealerIndex = -1;     // 莊家位置 (Button)
        this.currentTurnIndex = 0; // 當前輪到誰 (index)
        this.lastRoundWinners = [];
        
        // 階段: 'LOBBY', 'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'
        this.gameStage = 'LOBBY'; 
        this.hostId = null;
    }

    addPlayer(player) {
        if (this.players.length === 0) this.hostId = player.id;
        super.addPlayer(player);
    }

    manualStart(requestPlayerId) {
        if (requestPlayerId !== this.hostId) return { success: false, msg: "只有房主可以開始遊戲" };
        if (this.players.length < this.minPlayers) return { success: false, msg: "人數不足 2 人" };
        if (this.gameState !== 'LOBBY') return { success: false, msg: "遊戲已在進行中" };

        this.beginGame();
        return { success: true };
    }

    // --- 1. 遊戲初始化邏輯 ---
    beginGame() {
        this.gameState = 'PLAYING';
        this.gameStage = 'PREFLOP';
        this.deck.reset();
        this.pot = 0;
        this.currentBet = 0;
        this.communityCards = [];
        this.lastRoundWinners = [];
        
        // 1. 重置所有玩家狀態
        this.players.forEach(p => {
            // 如果籌碼 <= 0，強制轉為旁觀模式
            if (p.chips <= 0) {
                p.status = 'SIT_OUT';
            } else {
                p.resetForNewHand(); // 變回 ACTIVE，清空手牌
            }
        });

        const activeCount = this.players.filter(p => p.status !== 'SIT_OUT').length;
        if (activeCount < 2) {
            this.gameState = 'ENDED'; 
            console.log("倖存玩家不足 2 人，遊戲結束");
            return;
        }

        // 2. 決定莊家、小盲、大盲位置
        // 簡單輪替：每局莊家往後移一位 (這裡先簡化，固定邏輯)
        this.dealerIndex = this._findNextActivePlayer(this.dealerIndex);// 如果莊家是旁觀者，繼續找下一位

        const sbIndex = (this.dealerIndex + 1) % this.players.length;
        const bbIndex = (this.dealerIndex + 2) % this.players.length;

        // 3. 強制扣盲注
        this._postBlind(sbIndex, this.smallBlind);
        this._postBlind(bbIndex, this.bigBlind);

        // 4. 設定起始狀態
        this.currentBet = this.bigBlind; // 現在場上最高注是 20

        // 5. 每位玩家抽兩張牌
        this.players.forEach(p => {
            if (p.status === 'ACTIVE' || p.status === 'ALLIN') {
                p.cards = this.deck.draw(2);
                p.isShowingCards = false;
            }
        });

        // 槍口位 (UTG) 先說話：大盲的下一位
        this.currentTurnIndex = (bbIndex + 1) % this.players.length; 
        
        // 標記當前玩家
        this._updateTurnStatus();

        // 預先抽出 5 張公用牌 (暫存，不公開)
        this.communityCards = this.deck.draw(5); 
        console.log(`--- 遊戲開始: Pot: ${this.pot}, Turn: ${this.players[this.currentTurnIndex].name} ---`);
    }

    // --- 2. 核心：處理玩家動作 ---
    handlePlayerAction(playerId, actionType, amount = 0) {
        // A. 基礎驗證
        if (this.gameState !== 'PLAYING') return { success: false, msg: '遊戲未開始' };
        
        const currentPlayer = this.players[this.currentTurnIndex];
        if (playerId !== currentPlayer.id) return { success: false, msg: '還沒輪到你' };

        // B. 動作邏輯處理
        let resultMsg = '';

        switch (actionType) {
            case 'fold':
                currentPlayer.status = 'FOLDED';
                resultMsg = `${currentPlayer.name} 棄牌`;
                break;

            case 'check':
                // 只有當「自己已下注金額」等於「當前最高注」才能 Check
                if (currentPlayer.roundBet < this.currentBet) {
                    return { success: false, msg: '不能過牌，需要跟注' };
                }
                resultMsg = `${currentPlayer.name} 過牌`;
                break;

            case 'call':
                // 計算需要補多少錢
                const callAmount = this.currentBet - currentPlayer.roundBet;
                if (currentPlayer.chips < callAmount) {
                    // 錢不夠就變成 All-in
                    return this.handlePlayerAction(playerId, 'allin'); 
                }
                this._placeBet(currentPlayer, callAmount);
                resultMsg = `${currentPlayer.name} 跟注 ${callAmount}`;
                break;

            case 'raise':
                // 加注金額驗證 (這裡簡化，實際上要檢查最小加注額)
                const totalBet = amount; // 前端傳來的是「加注後想變成的總金額」
                if (totalBet <= this.currentBet) return { success: false, msg: '加注金額必須大於當前注額' };
                if (currentPlayer.chips < (totalBet - currentPlayer.roundBet)) return { success: false, msg: '籌碼不足' };

                const raiseDiff = totalBet - currentPlayer.roundBet;
                this._placeBet(currentPlayer, raiseDiff);
                this.currentBet = totalBet; // 更新場上最高注
                
                // 加注會導致這一輪的結束點重置 (所有人都要重新表態)
                this._resetHasActedForRaise(currentPlayer.id);
                resultMsg = `${currentPlayer.name} 加注至 ${totalBet}`;
                break;
                
            case 'allin':
                const allInAmount = currentPlayer.chips;
                this._placeBet(currentPlayer, allInAmount);
                currentPlayer.status = 'ALLIN';
                if (currentPlayer.roundBet > this.currentBet) {
                    this.currentBet = currentPlayer.roundBet; // 如果 All-in 超過當前注額，視為 Raise
                    this._resetHasActedForRaise(currentPlayer.id);
                }
                resultMsg = `${currentPlayer.name} All-in!`;
                break;

            default:
                return { success: false, msg: '未知動作' };
        }

        currentPlayer.hasActed = true; // 標記他已經表態過了

        console.log(resultMsg);

        // C. 檢查是否只剩一人 (其他人全 Fold)
        if (this._checkWinByFold()) {
            return { success: true, action: actionType };
        }

        // D. 判斷這一輪 (Street) 是否結束，還是換下一個人
        if (this._isRoundComplete()) {
            this.nextStage();
        } else {
            this.nextTurn();
        }

        return { success: true, action: actionType };
    }

    // --- 3. 內部輔助邏輯 ---

    // 找出下一個還在玩的玩家 (非 SIT_OUT)
    _findNextActivePlayer(currentIndex) {
        let nextIndex = currentIndex;
        // 最多跑一圈，避免無窮迴圈
        for (let i = 0; i < this.players.length; i++) {
            nextIndex = (nextIndex + 1) % this.players.length;
            // 只要不是 SIT_OUT 就算 Active (包含 FOLDED, ALLIN 在這局都算佔位)
            if (this.players[nextIndex].status !== 'SIT_OUT' && this.players[nextIndex].status !== 'WAITING') {
                return nextIndex;
            }
        }
        return currentIndex; // 找不到人(理論上 beginGame 有檢查)
    }

    // 扣盲注
    _postBlind(playerIndex, amount) {
        const player = this.players[playerIndex];
        // 如果玩家錢不夠盲注，就 All-in
        const actualAmount = Math.min(player.chips, amount);
        this._placeBet(player, actualAmount);
        if (player.chips === 0) player.status = 'ALLIN';
        player.hasActed = false;
    }

    // 執行下注 (扣錢、加底池)
    _placeBet(player, amount) {
        player.chips -= amount;
        player.roundBet += amount; // 這輪下了多少
        player.totalHandBet += amount; // 這把總共下多少
        this.pot += amount;
    }

    // 更新每位玩家的 isTurn 狀態 (給前端顯示用)
    _updateTurnStatus() {
        this.players.forEach((p, index) => {
            p.isTurn = (index === this.currentTurnIndex);
        });
    }

    // 加注後重置其他玩家的表態狀態
    _resetHasActedForRaise(raiserId) {
        this.players.forEach(p => {
            if (p.id !== raiserId && p.status === 'ACTIVE') {
                p.hasActed = false; 
            }
        });
    }

    // 換下一位
    nextTurn() {
        let loopCount = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
            loopCount++;
        } while (
            // 跳過已棄牌或 All-in 的玩家
            (this.players[this.currentTurnIndex].status === 'FOLDED' || 
             this.players[this.currentTurnIndex].status === 'ALLIN' ||
             this.players[this.currentTurnIndex].status === 'SIT_OUT' ||
             this.players[this.currentTurnIndex].status === 'WAITING') && 
             loopCount < this.players.length
        );
        this._updateTurnStatus();
    }

    // 檢查這一輪下注圈是否結束
    _isRoundComplete() {
        // 條件1: 所有「活躍且非 All-in」的玩家，下注金額都等於 currentBet
        // 條件2: 所有人都已經表態過 (這裡簡化邏輯：用 lastAction 變數或 flag 追蹤，為了教學先省略複雜的 flag)
        // 簡易版判斷：如果每個人都 (Check/Call/Fold/Allin) 且金額一致
        
        // 找出還活著且還有籌碼的人
        const activePlayers = this.players.filter(p => p.status === 'ACTIVE');
        
        // 如果沒人活著 (都 All-in)，直接結束
        if (activePlayers.length === 0) return true;

        // 檢查是否所有活著的人注碼都一樣，且等於 currentBet
        const isBetMatched = activePlayers.every(p => p.roundBet === this.currentBet);
        
        // 注意：這裡有一個 Bug，如果是開局大盲，大家 Check 一圈回來，這裡需要更嚴謹的「已行動」標記
        // 為了讓 Code 能跑，我們假設：如果輪到的人 roundBet 已經等於 currentBet 且不是 Raise 狀態，則結束
        // (實際專案建議每個 Player 加一個 'hasActed' 屬性)
        const isEveryoneActed = activePlayers.every(p => p.hasActed);
        
        // 暫時用簡易版：如果當前這回合結束時，下一家的注碼已經齊平，則進入下一階段 (這是不精確的，但適合初學)
        // 正確作法：在 nextTurn 前先檢查 `hasEveryoneActed && betsEqual`
        
        return isBetMatched && isEveryoneActed; 
    }
    
    // 簡易輔助：是否這輪大家都做過決定了 (需要配合額外屬性，這裡先回傳 false 讓遊戲能跑動)
    // 實作建議：在 Player 類別加一個 this.hasActed = false; 每次 nextStage 重置
    _hasEveryoneActed() {
        // 這裡需要你自己擴充 Player.js
        // return this.players.filter(p => p.status === 'ACTIVE').every(p => p.hasActed);
        // 檢查所有還活著且沒 All-in 的人，是不是都已經做過動作了
        return this.players
        .filter(p => p.status === 'ACTIVE')
        .every(p => p.hasActed);
    }

    // --- 4. 階段推進 (Preflop -> Flop -> Turn -> River) ---
    nextStage() {
        // 重置每個人的 roundBet，準備下一輪喊價
        this.players.forEach(p => { 
            p.roundBet = 0; 
            p.hasActed = false; // 準備下一輪
        });
        this.currentBet = 0;

        // 狀態機切換
        switch (this.gameStage) {
            case 'PREFLOP':
                this.gameStage = 'FLOP';
                // 前端能看到的公用牌：前 3 張
                break;
            case 'FLOP':
                this.gameStage = 'TURN';
                break;
            case 'TURN':
                this.gameStage = 'RIVER';
                break;
            case 'RIVER':
                this.gameStage = 'SHOWDOWN';
                this.endGame(); // 結算
                return;
        }

        // 新階段從小盲位開始 (Dealer 的下一位)
        // 但如果小盲 Fold/Allin 了，要往後找
        this.currentTurnIndex = this._findNextActivePlayer(this.dealerIndex);
        // 確保起始人不是 Folded
        if (this.players[this.currentTurnIndex].status !== 'ACTIVE') {
            this.nextTurn();
        }
        
        this._updateTurnStatus();
        console.log(`--- 進入階段: ${this.gameStage} ---`);
    }

    // 回傳給前端顯示用的公用牌
    getPublicCommunityCards() {
        if (this.gameStage === 'PREFLOP') return [];
        if (this.gameStage === 'FLOP') return this.communityCards.slice(0, 3);
        if (this.gameStage === 'TURN') return this.communityCards.slice(0, 4);
        return this.communityCards; // RIVER & SHOWDOWN
    }

    // 檢查是否有贏家 (剩一人)
    _checkWinByFold() {
        const activePlayers = this.players.filter(p => p.status !== 'FOLDED' && p.status !== 'SIT_OUT' && p.status !== 'WAITING');
        if (activePlayers.length === 1) {
            this.endGame(activePlayers[0]); // 傳入贏家
            return true;
        }
        return false;
    }

    endGame(winner = null) {
        this.gameState = 'SHOWDOWN'; // 或是 ENDED
        this.gameStage = 'SHOWDOWN';

        const result = {
            winners: [],
            pot: this.pot
        };

        let winningHands = [];
        
        if (winner) {
            console.log(`贏家是: ${winner.name} (其他人棄牌)，獲得 ${this.pot}`);
            winningHands = [{ 
                originalPlayer: winner, 
                name: 'Win by Fold', // 特殊名稱
                descr: 'Opponents Folded' 
            }];
        } else {
            // 比牌邏輯 (這是最難的部分，需要額外的 HandEvaluator 類別)
            console.log("進入攤牌階段，正在計算排力...");
            // 使用 HandEvaluator 算出誰最強 (回傳陣列，因為可能平手)
            winningHands = HandEvaluator.determineWinners(this.players, this.communityCards);
        }

        // --- 分配獎金 (處理 Split Pot) ---
        if (winningHands.length > 0) {
            // 簡單平分邏輯 (除不盡的餘數通常給位置最靠前的，這裡先忽略餘數)
            const share = Math.floor(this.pot / winningPlayers.length);
            
            winningPlayers.forEach(hand => {
                const p = hand.originalPlayer;
                p.chips += share;
                
                // 紀錄贏家資訊給前端
                result.winners.push({
                    id: p.id,
                    name: p.name,
                    profit: share,
                    // 可以加傳牌型名稱 (例如 "Full House")，前端會很開心
                    handTitle: hand.name,
                    // handDescription: ... (這需要改 HandEvaluator 回傳更多資訊，先略過)
                    handDetail: hand.descr
                });
                console.log(`玩家 ${p.name} 贏得 ${share}`);
            });
        }
        
        this.lastRoundWinners = result.winners;
        this.pot = 0;

        return result;
    }
}

module.exports = PokerGame;