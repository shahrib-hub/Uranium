import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  guilds: [],
  activeGuild: null,
  sidebarOpen: false,
  player: { active: false, lastUpdate: Date.now() },
  
  setUser: (user) => set({ user }),
  setGuilds: (guilds) => set({ guilds }),
  setActiveGuild: (guild) => set({ activeGuild: guild }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setPlayer: (player) => set({ 
    player: { ...player, lastUpdate: Date.now() } 
  }),
  
  updatePlayer: (updates) => set((state) => ({ 
    player: { ...state.player, ...updates, lastUpdate: Date.now() } 
  })),
  resetPlayer: () => set({ 
    player: { active: false, lastUpdate: Date.now() } 
  }),
  setPlayerGuildId: (guildId) => set((state) => ({
    player: { ...state.player, guildId, lastUpdate: Date.now() }
  })),
}));
