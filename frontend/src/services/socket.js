import { io } from "socket.io-client";

const socket = io("https://peersync-x3m0.onrender.com", { autoConnect: false });

export default socket;