"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3456";

// Single shared socket per browser tab — components join/leave rooms as
// they mount/unmount rather than each opening their own connection.
let sharedSocket: Socket | null = null;

export function useChatSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!sharedSocket || sharedSocket.disconnected) {
      sharedSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
      });
    }
    socketRef.current = sharedSocket;

    return () => {
      // Intentionally not disconnecting here — other mounted components
      // may still be using the shared socket. It disconnects naturally
      // when the tab closes or the token changes to null (logout).
    };
  }, [token]);

  return socketRef;
}
