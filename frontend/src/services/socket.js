import { io } from "socket.io-client";

const socket = io("http://192.168.0.8:5782", { autoConnect: false });

export default socket;