import { io } from "socket.io-client";

// 連接到你後端啟動的 3000 埠口
const socket = io("http://localhost:3000"); 

export default socket;