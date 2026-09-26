'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Terminal,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  Save,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Shield,
  Hash,
  Crown,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Shuffle
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomCommandsPage() {
  const params = useSearchParams();
  const guildId = params.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commands, setCommands] = useState([]);
  const [count, setCount] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(10);
  const [isPremium, setIsPremium] = useState(false);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [search, setSearch] = useState('');

  // Editing state: null when viewing list, object when editing/creating
  const [editingCommand, setEditingCommand] = useState(null);

  // Advanced accordion state in editor
  const [advancedOpen, setAdvancedOpen] = useState(true);

  // Embed editor state
  const [embedOpen, setEmbedOpen] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    loadCommands();
  }, [guildId]);

  const loadCommands = async () => {
    setLoading(true);
    try {
      const [cmdRes, rolesRes, chRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/customcommands`),
        fetch(`/api/guild/${guildId}/roles`),
        fetch(`/api/guild/${guildId}/channels`)
      ]);

      if (rolesRes.ok) {
        const rData = await rolesRes.json();
        setRoles(Array.isArray(rData) ? rData : rData.roles || []);
      }

      if (chRes.ok) {
        const cData = await chRes.json();
        const list = Array.isArray(cData) ? cData : (cData.channels || cData.text || []);
        const textChs = list.filter((c) => c.type === 0 || c.type === 5 || c.isText || !c.isVoice);
        setChannels(textChs);
      }

      if (cmdRes.ok) {
        const data = await cmdRes.json();
        setCommands(data.commands || []);
        setCount(data.count || 0);
        setMaxAllowed(data.maxAllowed || 10);
        setIsPremium(!!data.isPremium);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load custom commands');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    if (count >= maxAllowed) {
      return toast.warning(
        `Command limit reached (${count}/${maxAllowed}). ${
          !isPremium ? 'Upgrade to Premium for up to 50 custom commands!' : ''
        }`
      );
    }

    setEditingCommand({
      name: '',
      prefix: '!',
      description: '',
      message: 'Hello world from Uranium!',
      ephemeral: false,
      hideUsage: false,
      actions: [
        {
          type: 'message',
          ephemeral: false,
          message: 'Hello world from Uranium!',
          embed: null,
          randomResponses: []
        }
      ],
      embed: null,
      randomResponses: [],
      permissions: {
        roleMode: 'none', // none, allowed, denied
        allowedRoles: [],
        deniedRoles: [],
        channelMode: 'none', // none, allowed, denied
        allowedChannels: [],
        deniedChannels: []
      },
      cooldown: {
        type: 'none', // none, server, user
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 10
      }
    });
    setEmbedOpen(false);
  };

  const startEdit = (cmd) => {
    const data = cmd.data || {};
    const perms = data.permissions || {};
    const cd = data.cooldown || {};
    const totalSec = cd.seconds || 0;

    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    setEditingCommand({
      name: cmd.name,
      originalName: cmd.name,
      prefix: data.prefix || '!',
      description: cmd.description || '',
      message: data.message || '',
      ephemeral: !!data.ephemeral,
      hideUsage: !!data.hideUsage,
      actions: data.actions || [],
      embed: data.embed || null,
      randomResponses: data.randomResponses || [],
      permissions: {
        roleMode: perms.allowedRoles?.length ? 'allowed' : perms.deniedRoles?.length ? 'denied' : 'none',
        allowedRoles: perms.allowedRoles || [],
        deniedRoles: perms.deniedRoles || [],
        channelMode: perms.allowedChannels?.length ? 'allowed' : perms.deniedChannels?.length ? 'denied' : 'none',
        allowedChannels: perms.allowedChannels || [],
        deniedChannels: perms.deniedChannels || []
      },
      cooldown: {
        type: cd.type || 'none',
        days,
        hours,
        minutes,
        seconds: seconds || 10
      }
    });

    setEmbedOpen(!!data.embed);
  };

  const handleSaveCommand = async () => {
    if (!editingCommand) return;
    const name = editingCommand.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const prefix = (editingCommand.prefix || '!').trim() || '!';

    if (!name) {
      return toast.warning('Command name is required (alphanumeric, no spaces)');
    }

    if (!editingCommand.message.trim() && !editingCommand.embed) {
      return toast.warning('Provide a message response or embed for this command');
    }

    setSaving(true);
    try {
      const cd = editingCommand.cooldown;
      const totalSeconds =
        (Number(cd.days) || 0) * 86400 +
        (Number(cd.hours) || 0) * 3600 +
        (Number(cd.minutes) || 0) * 60 +
        (Number(cd.seconds) || 0);

      const payload = {
        name,
        prefix,
        description: editingCommand.description,
        message: editingCommand.message,
        ephemeral: editingCommand.ephemeral,
        hideUsage: editingCommand.hideUsage,
        embed: embedOpen ? editingCommand.embed : null,
        randomResponses: editingCommand.randomResponses || [],
        actions: [
          {
            type: 'message',
            ephemeral: editingCommand.ephemeral,
            message: editingCommand.message,
            embed: embedOpen ? editingCommand.embed : null,
            randomResponses: editingCommand.randomResponses || []
          }
        ],
        permissions: {
          allowedRoles: editingCommand.permissions.roleMode === 'allowed' ? editingCommand.permissions.allowedRoles : [],
          deniedRoles: editingCommand.permissions.roleMode === 'denied' ? editingCommand.permissions.deniedRoles : [],
          allowedChannels: editingCommand.permissions.channelMode === 'allowed' ? editingCommand.permissions.allowedChannels : [],
          deniedChannels: editingCommand.permissions.channelMode === 'denied' ? editingCommand.permissions.deniedChannels : []
        },
        cooldown: {
          type: cd.type,
          seconds: cd.type !== 'none' ? totalSeconds : 0
        }
      };

      const res = await fetch(`/api/guild/${guildId}/customcommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save custom command');

      toast.success(data.message || `Custom command "${prefix}${name}" saved successfully!`);
      setEditingCommand(null);
      loadCommands();
    } catch (err) {
      toast.error(err.message || 'Error saving command');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommand = async (name) => {
    if (!confirm(`Delete custom command "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/guild/${guildId}/customcommands/${name}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete command');

      toast.success(data.message || `Deleted custom command "${name}"`);
      if (editingCommand?.originalName === name || editingCommand?.name === name) {
        setEditingCommand(null);
      }
      loadCommands();
    } catch (err) {
      toast.error(err.message || 'Error deleting command');
    }
  };

  const handleAddRandomResponse = () => {
    setEditingCommand((prev) => ({
      ...prev,
      randomResponses: [...(prev.randomResponses || []), '']
    }));
  };

  const handleUpdateRandomResponse = (index, value) => {
    setEditingCommand((prev) => {
      const copy = [...(prev.randomResponses || [])];
      copy[index] = value;
      return { ...prev, randomResponses: copy };
    });
  };

  const handleRemoveRandomResponse = (index) => {
    setEditingCommand((prev) => {
      const copy = [...(prev.randomResponses || [])];
      copy.splice(index, 1);
      return { ...prev, randomResponses: copy };
    });
  };

  const filtered = commands.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      ((c.data?.prefix || '!') + c.name).toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        <p className="text-xs text-white/50">Loading Custom Commands Module...</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── VIEW 2: MEE6-STYLE COMMAND EDITOR VIEW ──────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (editingCommand) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* Editor Top Bar: Back, Prefix Input, Command Name Input, Live Preview, Delete, Discard, Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e202c] pb-5 gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setEditingCommand(null)}
              className="h-10 w-10 rounded-xl bg-[#161722] hover:bg-[#202230] border border-[#262838] grid place-items-center text-white/70 hover:text-white transition shrink-0"
              title="Back to commands list"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Custom Prefix Field */}
            <div className="flex items-center bg-[#12131c] border border-[#272a3d] focus-within:border-rose-500 rounded-xl px-3 py-1.5 transition shadow-inner">
              <span className="text-[10px] uppercase font-black text-rose-400 tracking-wider mr-2 select-none">
                Prefix
              </span>
              <input
                type="text"
                maxLength={6}
                value={editingCommand.prefix ?? '!'}
                onChange={(e) =>
                  setEditingCommand((prev) => ({
                    ...prev,
                    prefix: e.target.value.replace(/\s+/g, '')
                  }))
                }
                placeholder="!"
                title="Custom command prefix (e.g. !, ?, ., $, -)"
                className="w-10 sm:w-12 text-lg sm:text-xl font-mono font-black text-rose-400 bg-transparent outline-none text-center"
              />
            </div>

            {/* Command Name Field */}
            <div className="flex items-center bg-[#12131c] border border-[#272a3d] focus-within:border-rose-500 rounded-xl px-3.5 py-1.5 transition flex-1 min-w-[180px] sm:min-w-[240px] shadow-inner">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider mr-2.5 select-none">
                Command
              </span>
              <input
                type="text"
                value={editingCommand.name}
                onChange={(e) =>
                  setEditingCommand((prev) => ({
                    ...prev,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                  }))
                }
                placeholder="command_name"
                className="text-lg sm:text-xl font-black text-white bg-transparent outline-none w-full"
              />
            </div>

            {/* Live Trigger Badge */}
            {editingCommand.name && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-bold">
                <span className="text-white/40 text-[10px] uppercase font-sans">Trigger:</span>
                <span className="text-rose-400 font-black">{editingCommand.prefix || '!'}</span>
                <span className="text-white">{editingCommand.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {editingCommand.originalName && (
              <button
                type="button"
                onClick={() => handleDeleteCommand(editingCommand.originalName)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditingCommand(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-[#181923] hover:bg-[#20222f] border border-[#262838] transition"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleSaveCommand}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-600/20 disabled:opacity-40"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save & Close'}</span>
            </button>
          </div>
        </div>

        {/* ── COMMAND ACTIONS SECTION ────────────────────────────────────────── */}
        <div className="space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[2px] text-white/40 block">
            Command Actions
          </span>

          {/* Action Card #1 */}
          <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-rose-400 font-mono text-xs">Action #1 :</span>
                <span>Bot responds with a message in current Channel</span>
              </h3>
            </div>

            {/* Private Message Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#101118] border border-white/5">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">This is a private message</span>
                <p className="text-[11px] text-white/40">
                  Only the member triggering this command can see the response (ephemeral)
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingCommand((prev) => ({ ...prev, ephemeral: !prev.ephemeral }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  editingCommand.ephemeral ? 'bg-rose-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    editingCommand.ephemeral ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Message to send */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/80">Message to send</label>

              {/* Discord Interactive Preview Box */}
              <div className="rounded-xl border border-[#262838] bg-[#0c0d12] p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-rose-600 grid place-items-center text-white font-black text-xs">
                    U
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Uranium</span>
                    <span className="px-1 py-0.2 rounded text-[9px] font-black bg-[#5865F2] text-white uppercase">
                      APP
                    </span>
                    <span className="text-[10px] text-white/40">Today at 1:45 PM</span>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={editingCommand.message}
                  onChange={(e) =>
                    setEditingCommand((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Type the message that Uranium should send back..."
                  className="w-full bg-[#14151e] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500/50 transition resize-none leading-relaxed"
                />

                <div className="flex flex-wrap gap-1.5 text-[10px] text-white/40">
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{user}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{username}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{server}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{channel}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{membercount}'}</span>
                </div>
              </div>
            </div>

            {/* Add Embed Section Toggle */}
            <div className="space-y-3 pt-1">
              {!embedOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmbedOpen(true);
                    if (!editingCommand.embed) {
                      setEditingCommand((prev) => ({
                        ...prev,
                        embed: {
                          title: '',
                          description: '',
                          color: '#5865F2',
                          thumbnail: '',
                          image: '',
                          footer: ''
                        }
                      }));
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                >
                  <Plus size={14} />
                  <span>Add embed</span>
                </button>
              ) : (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">Rich Embed Attachment</span>
                    <button
                      type="button"
                      onClick={() => setEmbedOpen(false)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      ✕ Remove embed
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Embed Title"
                      value={editingCommand.embed?.title || ''}
                      onChange={(e) =>
                        setEditingCommand((prev) => ({
                          ...prev,
                          embed: { ...prev.embed, title: e.target.value }
                        }))
                      }
                      className="h-9 px-3 rounded-lg border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50"
                    />

                    <input
                      type="text"
                      placeholder="Embed Color (#5865F2)"
                      value={editingCommand.embed?.color || '#5865F2'}
                      onChange={(e) =>
                        setEditingCommand((prev) => ({
                          ...prev,
                          embed: { ...prev.embed, color: e.target.value }
                        }))
                      }
                      className="h-9 px-3 rounded-lg border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50"
                    />
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Embed Description"
                    value={editingCommand.embed?.description || ''}
                    onChange={(e) =>
                      setEditingCommand((prev) => ({
                        ...prev,
                        embed: { ...prev.embed, description: e.target.value }
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>
              )}

              {/* Random Choice Messages */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleAddRandomResponse}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white transition"
                >
                  <Shuffle size={14} className="text-amber-400" />
                  <span>Add a message and make the bot randomly pick which one to send</span>
                </button>

                {editingCommand.randomResponses?.map((resp, idx) => (
                  <div key={idx} className="flex items-center gap-2 pl-4">
                    <input
                      type="text"
                      value={resp}
                      onChange={(e) => handleUpdateRandomResponse(idx, e.target.value)}
                      placeholder={`Random Option #${idx + 2}`}
                      className="flex-1 h-9 px-3 rounded-lg border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRandomResponse(idx)}
                      className="text-white/40 hover:text-rose-400 p-2"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ADVANCED OPTIONS AND PERMISSIONS ("Only for the fearless") ───── */}
        <div className="space-y-4">
          <div
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div>
              <h3 className="text-sm font-bold text-white">Advanced options and permissions</h3>
              <p className="text-[11px] text-white/40">Only for the fearless</p>
            </div>
            <span className="text-xs text-rose-400 font-bold">
              {advancedOpen ? '▲ Collapse' : '▼ Expand'}
            </span>
          </div>

          {advancedOpen && (
            <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-6 space-y-6">
              {/* Command Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white">Command Description</label>
                <input
                  type="text"
                  maxLength={100}
                  value={editingCommand.description}
                  onChange={(e) =>
                    setEditingCommand((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="e.g. Displays the server Minecraft IP and connection details"
                  className="w-full h-10 px-3.5 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                />
              </div>

              {/* Role Permissions */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white">Role permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'none', label: 'Everyone (No restriction)' },
                    { id: 'allowed', label: 'Roles allowed to use command' },
                    { id: 'denied', label: 'Roles denied from using command' }
                  ].map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() =>
                        setEditingCommand((prev) => ({
                          ...prev,
                          permissions: { ...prev.permissions, roleMode: rm.id }
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left font-medium transition ${
                        editingCommand.permissions.roleMode === rm.id
                          ? 'border-rose-500/50 bg-rose-500/10 text-white'
                          : 'border-[#262838] bg-[#101118] text-white/50 hover:text-white'
                      }`}
                    >
                      {rm.label}
                    </button>
                  ))}
                </div>

                {editingCommand.permissions.roleMode !== 'none' && (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {roles.map((r) => {
                      const isSelected =
                        editingCommand.permissions.roleMode === 'allowed'
                          ? editingCommand.permissions.allowedRoles?.includes(r.id)
                          : editingCommand.permissions.deniedRoles?.includes(r.id);

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            const mode = editingCommand.permissions.roleMode;
                            const key = mode === 'allowed' ? 'allowedRoles' : 'deniedRoles';
                            const cur = editingCommand.permissions[key] || [];
                            const updated = cur.includes(r.id)
                              ? cur.filter((id) => id !== r.id)
                              : [...cur, r.id];
                            setEditingCommand((prev) => ({
                              ...prev,
                              permissions: { ...prev.permissions, [key]: updated }
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                            isSelected
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-[#101118] text-white/50 border border-[#262838] hover:text-white'
                          }`}
                        >
                          @{r.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Channel Permissions */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white">Channel permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'none', label: 'All Channels (No restriction)' },
                    { id: 'allowed', label: 'Channels allowed to use command' },
                    { id: 'denied', label: 'Channels denied from using command' }
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() =>
                        setEditingCommand((prev) => ({
                          ...prev,
                          permissions: { ...prev.permissions, channelMode: cm.id }
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left font-medium transition ${
                        editingCommand.permissions.channelMode === cm.id
                          ? 'border-rose-500/50 bg-rose-500/10 text-white'
                          : 'border-[#262838] bg-[#101118] text-white/50 hover:text-white'
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>

                {editingCommand.permissions.channelMode !== 'none' && (
                  <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                    {channels.map((c) => {
                      const isSelected =
                        editingCommand.permissions.channelMode === 'allowed'
                          ? editingCommand.permissions.allowedChannels?.includes(c.id)
                          : editingCommand.permissions.deniedChannels?.includes(c.id);

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const mode = editingCommand.permissions.channelMode;
                            const key = mode === 'allowed' ? 'allowedChannels' : 'deniedChannels';
                            const cur = editingCommand.permissions[key] || [];
                            const updated = cur.includes(c.id)
                              ? cur.filter((id) => id !== c.id)
                              : [...cur, c.id];
                            setEditingCommand((prev) => ({
                              ...prev,
                              permissions: { ...prev.permissions, [key]: updated }
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                            isSelected
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-[#101118] text-white/50 border border-[#262838] hover:text-white'
                          }`}
                        >
                          #{c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cooldown */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white">Cooldown</label>
                <div className="flex items-center gap-2 text-xs">
                  {['none', 'server', 'user'].map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        setEditingCommand((prev) => ({
                          ...prev,
                          cooldown: { ...prev.cooldown, type: scope }
                        }))
                      }
                      className={`px-3.5 py-1.5 rounded-xl font-bold uppercase transition ${
                        editingCommand.cooldown.type === scope
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#101118] text-white/50 border border-[#262838] hover:text-white'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>

                {editingCommand.cooldown.type !== 'none' && (
                  <div className="grid grid-cols-4 gap-2 pt-1 max-w-sm">
                    {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                      <div key={unit} className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-white/40">{unit}</span>
                        <input
                          type="number"
                          min={0}
                          max={unit === 'seconds' || unit === 'minutes' ? 59 : 24}
                          value={editingCommand.cooldown[unit] || 0}
                          onChange={(e) =>
                            setEditingCommand((prev) => ({
                              ...prev,
                              cooldown: { ...prev.cooldown, [unit]: Math.max(0, parseInt(e.target.value) || 0) }
                            }))
                          }
                          className="w-full h-9 text-center font-mono text-xs rounded-xl border border-[#262838] bg-[#101118] text-white outline-none focus:border-rose-500/50"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility: Hide command trigger usage */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Hide command trigger usage</span>
                  <p className="text-[11px] text-white/40">
                    Automatically deletes the triggering message in the channel
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={editingCommand.hideUsage}
                  onChange={(e) =>
                    setEditingCommand((prev) => ({ ...prev, hideUsage: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-rose-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── VIEW 1: MAIN CUSTOM COMMANDS LIST ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1e202c] pb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Automation Studio
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Custom <span className="text-red-500">Commands</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Create automated slash and chat commands with rich embed responses, permission constraints, and random pickers.
          </p>
        </div>

        {/* Quota badge + New command button */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#161722] border border-[#262838] text-xs font-semibold text-white/80">
            <span>Quota: </span>
            <span className="font-bold text-rose-400">
              {count}/{maxAllowed}
            </span>
            <span className="text-white/40 ml-1.5">
              ({isPremium ? '💎 Premium Tier' : '⭐ Free Tier'})
            </span>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-600/20"
          >
            <Plus size={15} />
            <span>New Command</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar & Filter ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search custom commands by name or description..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#262838] bg-[#14151e] text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-500/50 transition"
          />
        </div>

        {!isPremium && count >= 8 && (
          <Link
            href={`/dashboard/premium?guild=${guildId}`}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            <Crown size={14} className="fill-amber-400" />
            <span>Need more? Upgrade for 50 commands</span>
          </Link>
        )}
      </div>

      {/* ── Command Cards Grid ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center space-y-4">
          <Terminal className="mx-auto text-white/20 h-12 w-12" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No custom commands found</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Create your first custom command to automatically respond with text, embeds, or random links when triggered.
            </p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
          >
            <Plus size={14} />
            <span>Create Command</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cmd) => (
            <div
              key={cmd.name}
              className="rounded-2xl border border-[#232534] bg-[#14151e] p-5 flex flex-col justify-between space-y-4 hover:border-[#383b4e] transition group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white flex items-center">
                      <span className="text-rose-400 font-black mr-0.5">{cmd.data?.prefix || '!'}</span>
                      <span>{cmd.name}</span>
                    </span>
                    {cmd.data?.ephemeral && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        Private
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-white/40">
                    {cmd.uses || 0} uses
                  </span>
                </div>

                <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
                  {cmd.description || cmd.data?.message || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">
                  {cmd.data?.cooldown?.type && cmd.data.cooldown.type !== 'none'
                    ? `⏱️ ${cmd.data.cooldown.seconds}s cd`
                    : '⚡ No cooldown'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(cmd)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                    title="Edit Command"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCommand(cmd.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                    title="Delete Command"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
