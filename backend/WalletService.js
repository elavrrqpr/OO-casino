// // WalletService.js - 獨立的錢包服務
// class WalletService {
//     constructor() {
//         this.balances = new Map(); // 儲存玩家 ID 與餘額
//     }

//     // 初始化玩家錢包（你要求的 10 萬籌碼）
//     initWallet(playerId) {
//         if (!this.balances.has(playerId)) {
//             this.balances.set(playerId, 100000); // 這裡可以改成從資料庫讀取
//         }
//     }

//     getBalance(playerId) {
//         return this.balances.get(playerId) || 0;
//     }

//     updateBalance(playerId, amount) {
//         const current = this.getBalance(playerId);
//         this.balances.set(playerId, current + amount);
//         return this.balances.get(playerId);
//     }
// }

// module.exports = WalletService;