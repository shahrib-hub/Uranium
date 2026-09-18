import { io } from 'socket.io-client';
import { useStore } from './store';

let socket = null;
let connectionAttempt = 0;

export const connectSocket = (guildId) => {
  const attempt = ++connectionAttempt;
  if (socket) socket.disconnect();

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) {
    console.warn('[socket] NEXT_PUBLIC_SOCKET_URL is not configured; realtime updates are disabled.');
    return null;
  }

  // Vercel rewrites HTTP requests but cannot proxy WebSocket upgrades. Request
  // a one-minute token through the same-origin API, then connect to Wispbyte
  // directly over HTTPS.
  const connect = async () => {
    const response = await fetch('/api/socket-token', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Socket authentication failed (${response.status})`);
    const { token } = await response.json();
    if (attempt !== connectionAttempt) return;

    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('[socket] connected');
      if (guildId) {
        socket.emit('join-guild', guildId);
        // Immediately set the guildId in the store so the UI doesn't say "Select a server"
        useStore.getState().setPlayerGuildId(guildId);
      }
    });

    socket.on('playerUpdate', (data) => {
      useStore.getState().setPlayer(data);
    });

    socket.on('positionUpdate', (data) => {
      // Only update position to avoid full state re-renders every 250ms
      const state = useStore.getState();
      if (state.player.active) {
        useStore.getState().updatePlayer({
          position: data.position,
          duration: data.duration
        });
      }
    });

    socket.on('queueUpdate', (data) => {
      const state = useStore.getState();
      if (state.player.active) {
        useStore.getState().updatePlayer({
          current: data.current,
          queue: data.tracks,
          queueSize: data.size
        });
      }
    });
  };

  connect().catch(error => console.error('[socket] connection setup failed:', error));

  return null;
};

export const getSocket = () => socket;
