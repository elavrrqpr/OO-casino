// backend/Deck.js

class Deck {
    constructor() {
        this.cards = [];
        this.reset(); // 初始化時就準備好一副牌
    }

    // 重置牌組（52 張牌）並洗牌
    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];

        for (let s of suits) {
            for (let v of values) {
                this.cards.push({ suit: s, value: v });
            }
        }
        this.shuffle();
    }

    // 洗牌演算法
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // 抽牌
    draw(count = 1) {
        if (this.cards.length < count) {
            throw new Error("牌組張數不足！");
        }
        return this.cards.splice(-count); // 從牌堆頂端取出
    }

    // 剩餘張數
    get remaining() {
        return this.cards.length;
    }
}

module.exports = Deck;