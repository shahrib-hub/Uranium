'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  RefreshCcw,
  Settings,
  Trash2,
  Send,
  ChevronRight,
  Layout,
  Type,
  Palette,
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  Users,
  Zap,
  Terminal,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { clsx } from 'clsx';
import RRCreateModal from '@/components/RRCreateModal';

export default function ReactionRolesPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');
  
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [editingSetup, setEditingSetup] = useState(null);

  // New Setup State
  const [newSetup, setNewSetup] = useState({
    channelId: '',
    mode: 'buttons',
    title: 'Reaction Roles',
    description: 'Select a role to gain access.'
  });

  const fetchSetups = async () => {
    if (!guildId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups`);
      if (!res.ok) throw new Error(`Error ${res.status}: Failed to fetch setups`);
      const data = await res.json();
      setSetups(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('403') || err.message.toLowerCase().includes('permissions')) {
        setHasPermission(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [hasPermission, setHasPermission] = useState(true);

  const fetchItems = async (setupId) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${setupId}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateSetup = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetup)
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchSetups();
      }
    } catch (err) { alert(err.message); }
  };

  const handleDeleteSetup = async (id) => {
    if (!confirm('Are you sure you want to delete this panel?')) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedSetup(null);
        fetchSetups();
      }
    } catch (err) { alert(err.message); }
  };

  const handleRegen = async (id) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${id}/regen`, { method: 'POST' });
      if (res.ok) alert('Panel regenerated in Discord!');
    } catch (err) { alert(err.message); }
  };

  const handleSync = async (id) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${id}/sync`, { method: 'POST' });
      if (res.ok) alert('Reactions synced in Discord!');
    } catch (err) { alert(err.message); }
  };

  const handleClearAll = async (id) => {
    if (!confirm('Are you sure you want to remove ALL roles from this panel?')) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${id}/items`, { method: 'DELETE' });
      if (res.ok) fetchItems(id);
    } catch (err) { alert(err.message); }
  };

  const handleBulkAdd = async (setupId) => {
    const roleIds = bulkInput.split(/[\s,]+/).filter(id => id.length > 5);
    if (roleIds.length === 0) return alert('No valid Role IDs found.');
    
    setLoadingItems(true);
    try {
      for (const roleId of roleIds) {
        await fetch(`/api/guild/${guildId}/rr/setups/${setupId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId, label: 'Role', emoji: '✨', style: 2 })
        });
      }
      setShowBulkModal(false);
      setBulkInput('');
      fetchItems(setupId);
    } catch (err) { alert(err.message); }
  };

  const addItem = async (setupId) => {
    const roleId = prompt('Enter Discord Role ID:');
    if (!roleId) return;
    const label = prompt('Enter Button Label:', 'Role');
    const emoji = prompt('Enter Emoji (Unicode or Custom ID):', '✨');
    
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${setupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, label, emoji, style: 2 })
      });
      if (res.ok) fetchItems(setupId);
    } catch (err) { alert(err.message); }
  };

  const removeItem = async (itemId, setupId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) fetchItems(setupId);
    } catch (err) { alert(err.message); }
  };

  useEffect(() => {
    fetchSetups();
  }, [guildId]);

  useEffect(() => {
    if (selectedSetup) {
      fetchItems(selectedSetup._id);
      setEditingSetup({ ...selectedSetup });
    } else {
      setItems([]);
      setEditingSetup(null);
    }
  }, [selectedSetup]);

  const handleSaveConfig = async () => {
    if (!editingSetup) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/rr/setups/${editingSetup._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingSetup.title,
          description: editingSetup.description,
          config: editingSetup.config
        })
      });
      if (res.ok) {
        alert('Configuration saved!');
        fetchSetups();
      }
    } catch (err) { alert(err.message); }
  };

  if (!guildId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-2xl shadow-red-500/20">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2 italic">Terminal Access Restricted</h2>
        <p className="text-white/40 font-medium max-w-md">Please select a server from the dashboard to initialize the Reaction Role subsystem.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 space-y-8 md:space-y-12 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">Essentials Module</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic"
          >
            Reaction <span className="text-red-500">Roles</span>
          </motion.h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchSetups}
            disabled={refreshing}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw size={20} className={refreshing ? 'animate-spin text-red-500' : ''} />
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-red-500 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Initialize Setup
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-[40px] bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="glass p-12 rounded-[40px] border-red-500/20 text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h3 className="text-xl font-bold uppercase tracking-tight text-red-500">Subsystem Error</h3>
          <p className="text-white/40 font-medium">{error}</p>
          <button onClick={fetchSetups} className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold uppercase text-[10px] hover:bg-red-500 hover:text-black transition-all">Retry Link</button>
        </div>
      ) : !hasPermission ? (
        <div className="relative p-20 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden flex flex-col items-center justify-center text-center space-y-8">
           <div className="absolute inset-0 bg-black/40" />
           <div className="relative z-10 w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/20 shadow-2xl shadow-red-500/20 animate-bounce">
             <Lock size={40} />
           </div>
           <div className="relative z-10 space-y-2">
             <h3 className="text-3xl font-black tracking-tight uppercase italic">Access Denied</h3>
             <p className="text-white/40 font-medium max-w-sm">This terminal is restricted to server managers only. Please contact an administrator to upgrade your clearance.</p>
           </div>
           <button 
             onClick={() => window.location.href = '/dashboard'}
             className="relative z-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-wider text-[10px] hover:scale-105 transition-all"
           >
             <ArrowLeft size={16} />
             Return to Base
           </button>
        </div>
      ) : setups.length === 0 ? (
        <div className="glass p-20 rounded-[40px] border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10 border border-white/5">
            <Tag size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight uppercase">No Active Setups</h3>
            <p className="text-white/40 font-medium max-w-sm">Start by creating your first reaction role panel to manage user permissions dynamically.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Create First Setup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {setups.map((setup) => (
            <motion.div 
              key={setup._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8 }}
              className="glass p-8 rounded-[40px] border-white/5 hover:border-red-500/20 transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Tag size={80} className="text-red-500" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 group-hover:bg-red-500 group-hover:text-black transition-all">
                  <Layout size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">ID: #{setup._id}</span>
              </div>

              <div className="flex-1 space-y-2 mb-8">
                <h3 className="text-xl font-bold tracking-tight uppercase group-hover:text-red-500 transition-colors">
                  {setup.title || 'Unnamed Panel'}
                </h3>
                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                  {setup.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Mode</span>
                      <span className="text-[10px] font-bold uppercase text-red-500">{setup.mode}</span>
                   </div>
                   <div className="w-px h-6 bg-white/5" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Items</span>
                      <span className="text-[10px] font-bold text-white/60">Calculated...</span>
                   </div>
                </div>
                
                <button 
                  onClick={() => setSelectedSetup(setup)}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 group-hover:text-red-500 group-hover:border-red-500/50 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {selectedSetup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setSelectedSetup(null)} />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#050505] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
               {/* Modal Header */}
               <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-6">
                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                      <Settings size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-red-500 tracking-[3px] mb-1">Configuration Node</p>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Edit Panel <span className="text-white/40">#{selectedSetup._id}</span></h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSetup(null)}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-12 gap-8">
                    {/* Left: General Settings */}
                    <div className="col-span-12 lg:col-span-7 space-y-8">
                      <section className="glass p-8 rounded-[30px] border-white/5 space-y-6">
                         <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-tight">
                           <Type className="text-red-500" size={20} />
                           Identity & Content
                         </h3>
                         <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Panel Title</label>
                              <input 
                                type="text" 
                                value={editingSetup?.title || ''}
                                onChange={(e) => setEditingSetup({...editingSetup, title: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:border-red-500/50 focus:bg-red-500/[0.02] outline-none transition-all" 
                                placeholder="Enter panel title..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Panel Description</label>
                              <textarea 
                                rows={4}
                                value={editingSetup?.description || ''}
                                onChange={(e) => setEditingSetup({...editingSetup, description: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:border-red-500/50 focus:bg-red-500/[0.02] outline-none transition-all resize-none" 
                                placeholder="Enter detailed description..."
                              />
                            </div>
                         </div>
                      </section>

                      <section className="glass p-8 rounded-[30px] border-white/5 space-y-6">
                         <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-tight">
                           <Palette className="text-red-500" size={20} />
                           Functional Configuration
                         </h3>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Interaction Mode</label>
                              <select 
                                value={editingSetup?.mode || 'buttons'}
                                onChange={(e) => setEditingSetup({...editingSetup, mode: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase outline-none transition-all appearance-none cursor-pointer"
                              >
                                <option value="buttons">Buttons</option>
                                <option value="dropdown">Dropdown Menu</option>
                                <option value="reactions">Classic Reactions</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Policy Type</label>
                              <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold uppercase outline-none transition-all appearance-none cursor-pointer">
                                <option value="normal">Standard (Toggle)</option>
                                <option value="unique">Unique (One Role Only)</option>
                                <option value="verify">Verification (Permanent)</option>
                              </select>
                            </div>
                         </div>
                      </section>
                    </div>

                    {/* Right: Items & Actions */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                      <section className="glass p-8 rounded-[30px] border-white/5 flex flex-col h-full max-h-[500px]">
                         <div className="flex items-center justify-between mb-6">
                           <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-tight">
                             <ListOrdered className="text-red-500" size={20} />
                             Role Mappings
                           </h3>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handleClearAll(selectedSetup._id)}
                               className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-500 transition-all"
                               title="Clear All"
                             >
                                <Trash2 size={16} />
                             </button>
                             <button 
                               onClick={() => setShowBulkModal(true)}
                               className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all"
                               title="Bulk Add"
                             >
                                <Zap size={16} />
                             </button>
                             <button 
                               onClick={() => addItem(selectedSetup._id)}
                               className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all"
                               title="Add Role"
                             >
                                <Plus size={16} />
                             </button>
                           </div>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {loadingItems ? (
                              <div className="flex flex-col items-center justify-center h-32 space-y-4">
                                <RefreshCcw className="animate-spin text-red-500/20" size={32} />
                                <span className="text-[10px] font-black uppercase text-white/10 tracking-widest">Linking Roles...</span>
                              </div>
                            ) : items.length === 0 ? (
                              <p className="text-[10px] text-white/20 font-bold text-center py-8 italic uppercase tracking-widest">No roles configured for this panel.</p>
                            ) : (
                              items.map(item => (
                                <div key={item._id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/10 transition-all group/item">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shadow-inner">
                                      {item.emoji || '❓'}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white/80">{item.label}</span>
                                      <span className="text-[8px] font-black uppercase text-white/20 tracking-tighter">ROLE: {item.roleId}</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => removeItem(item._id, selectedSetup._id)}
                                    className="p-2 rounded-lg text-white/10 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                         </div>
                      </section>

                      <div className="grid grid-cols-2 gap-4">
                         <button 
                           onClick={() => handleRegen(selectedSetup._id)}
                           className="flex items-center justify-center gap-3 p-4 rounded-[25px] bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px] hover:border-red-500/30 hover:text-red-500 transition-all"
                         >
                            <Send size={14} />
                            Regen
                         </button>
                         <button 
                           onClick={() => handleSync(selectedSetup._id)}
                           className="flex items-center justify-center gap-3 p-4 rounded-[25px] bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-[10px] hover:border-red-500/30 hover:text-red-500 transition-all"
                         >
                            <RefreshCcw size={14} />
                            Sync
                         </button>
                      </div>
                      
                      <button 
                        onClick={handleSaveConfig}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-[25px] bg-red-500 text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                      >
                         <CheckCircle2 size={14} />
                         Save Config
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteSetup(selectedSetup._id)}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-[25px] bg-red-500/5 border border-red-500/10 text-red-500/40 font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-black hover:border-transparent transition-all"
                      >
                         <Trash2 size={14} />
                         Delete Panel
                      </button>
                    </div>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal - New Step-by-Step */}
      {showCreateModal && (
        <RRCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          guildId={guildId}
          onSuccess={() => {
            fetchSetups();
          }}
        />
      )}

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBulkModal(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-md bg-[#050505] rounded-[40px] border border-white/10 p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                  <Zap size={20} />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tight italic">Bulk Deployment</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Role IDs (One per line or comma separated)</label>
                  <textarea 
                    rows={8}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono focus:border-blue-500/50 outline-none resize-none" 
                    placeholder="123456789012345678&#10;876543210987654321..."
                  />
                </div>
              </div>

              <button 
                onClick={() => handleBulkAdd(selectedSetup._id)}
                className="w-full py-4 rounded-2xl bg-blue-500 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
              >
                Inject Roles
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
