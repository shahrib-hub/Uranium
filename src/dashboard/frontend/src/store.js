import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  guilds: [],
  activeGuild: null,
  player: { active: false },
  
  setUser: (user) => set({ user }),
  setGuilds: (guilds) => set({ guilds }),
  setActiveGuild: (guild) => set({ activeGuild: guild }),
  setPlayer: (player) => set({ player }),
  
  updatePlayer: (updates) => set((state) => ({ 
    player: { ...state.player, ...updates } 
  })),
  setPlayerGuildId: (guildId) => set((state) => ({
    player: { ...state.player, guildId }
  })),
}));
