import { io } from 'socket.io-client';
import { useStore } from './store';

let socket = null;
let connectionAttempt = 0;

export const connectSocket = (guildId) => {
  const attempt = ++connectionAttempt;
  if (socket) socket.disconnect();

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
  const isDirectUrl = Boolean(socketUrl && socketUrl.trim().length > 0);

  // If a public HTTPS socket URL is provided (e.g. Cloudflare tunnel or custom domain),
  // connect directly to it using WebSockets. Otherwise, fallback to polling via
  // the same-origin Vercel rewrite (/socket.io).
  const connect = async () => {
    const response = await fetch('/api/socket-token', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Socket authentication failed (${response.status})`);
    const { token } = await response.json();
    if (attempt !== connectionAttempt) return;

    const targetUrl = isDirectUrl ? socketUrl.trim() : '';
    const transports = isDirectUrl ? ['websocket', 'polling'] : ['polling'];

    socket = io(targetUrl, {
      path: '/socket.io',
      auth: { token },
      transports,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000
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

    socket.on('connect_error', (err) => {
      console.warn('[socket] Realtime connection notice:', err?.message || 'Attempting reconnect');
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });
  };

  connect().catch(error => console.error('[socket] connection setup failed:', error));

  return null;
};

export const getSocket = () => socket;
