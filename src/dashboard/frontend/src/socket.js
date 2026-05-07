import { io } from 'socket.io-client';
import { useStore } from './store';

let socket = null;

export const connectSocket = (guildId) => {
  if (socket) socket.disconnect();

  // Force WebSocket for better reliability through proxies/Vercel
  socket = io({ 
    withCredentials: true,
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

  return socket;
};

export const getSocket = () => socket;
