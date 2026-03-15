import { io } from "socket.io-client";

const socket = io("https://peersync-api.onrender.com", { autoConnect: false });

export default socket;