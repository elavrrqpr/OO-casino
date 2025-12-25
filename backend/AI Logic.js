const makeDecision = (handStrength,hasOpponentBet) => {//定義一個名為 makeDecision 的箭頭函式，它接收一個參數 handStrength（牌力強度）。
    const rand = Math.random() * 100;

    const trash_limit=0.35;//垃圾牌 範圍0-0.35 ex:拿7,2雜色 公牌AKQ
    const weak_limit=0.55;//弱牌 範圍0.35-0.55 ex:拿9,10 公牌782 但下一張來6或j就順子(不算垃圾 發展潛力)
    const moderate_limit=0.75;//中等牌 範圍0.55-0.75 ex:這是有機會贏的牌
    const strong_limit=0.90;//強牌 範圍0.75-0.90 ex:這是非常強的牌，通常是「兩對 (Two Pair)」以上。

    if(hasOpponentBet){//對手下注了 失去了check(過牌)權力
        if(handStrength<trash_limit){
            if(rand<9) return 'fold';
            else return 'raise';//詐唬
        }else if(handStrength<weak_limit){
            if(rand<80) return 'fold';
            else return 'call';//Float (漂浮)
        }else if(handStrength<moderate_limit){
            if(rand<85) return 'call';//抓雞
            else return 'fold';
        }else if(handStrength<strong_limit){
            if(rand<60) return 'raise';//拿價值
            else return 'call';
        }else{
            if (rand < 80) return 'all_in';//梭哈
            return 'raise';//小幅加注引誘
        }
    }else{//對手沒下注 有check(過牌)權力 不能FOLD/CALL
        if(handStrength<0.25){
            return 'check';//免費過牌不要白不要!
        }else if(handStrength<weak_limit){
            if(rand<60) return 'bet';//半詐唬
            else return 'check';
        }else if(handStrength<moderate_limit){
            if(rand<90) return 'check';//控池
            else return 'bet';//保護性下注
        }else if(handStrength<strong_limit){
            if(rand<30) return 'check';//陷阱
            else return 'bet';//價值下注
        }else{
            if (rand < 20) return 'all_in'; //突然梭哈嚇人
            return 'bet';//80%正常下注 (希望對手跟注)
        }
    }
}

module.exports = { makeDecision };

module.exports = { makeDecision };