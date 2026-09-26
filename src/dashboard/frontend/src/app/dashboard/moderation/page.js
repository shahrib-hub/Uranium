'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ShieldAlert,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Users,
  Hammer,
  AlertTriangle,
  Clock,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  Settings,
  ShieldCheck,
  UserX,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Hash,
  Eye,
  X,
  Globe,
  Ban
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import ConfirmModal from '@/components/ConfirmModal';
import ActionModal from '@/components/ActionModal';
import PurgeModal from '@/components/PurgeModal';

const TABS = [
  { id: 'actions', label: 'Action Center', icon: ShieldAlert },
  { id: 'channels', label: 'Channel Tools', icon: Hash },
  { id: 'cases', label: 'Infractions & Logs', icon: FileText },
  { id: 'bans', label: 'Active Bans', icon: Hammer },
  { id: 'automod', label: 'Automod Rules', icon: ShieldCheck },
  { id: 'settings', label: 'Mod Settings', icon: Settings }
];

const ACTION_FILTERS = [
  { value: 'all', label: 'All Actions' },
  { value: 'warn', label: 'Warnings' },
  { value: 'timeout', label: 'Timeouts' },
  { value: 'kick', label: 'Kicks' },
  { value: 'ban', label: 'Bans' },
  { value: 'softban', label: 'Softbans' },
  { value: 'note', label: 'Notes' },
  { value: 'nickname', label: 'Nicknames' },
  { value: 'role-add', label: 'Role Add' },
  { value: 'role-remove', label: 'Role Remove' }
];

const SLOWMODE_PRESETS = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' },
  { value: 3600, label: '1h' },
  { value: 21600, label: '6h' }
];

const PENALTY_ACTIONS = [
  { value: 'delete', label: 'Delete Message Only' },
  { value: 'warn', label: 'Warn User' },
  { value: 'timeout', label: 'Timeout (10 Minutes)' },
  { value: 'kick', label: 'Kick Member' },
  { value: 'ban', label: 'Ban Member' }
];

async function parseApiResponse(res, fallbackMessage = 'Request failed') {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `${fallbackMessage} (Status ${res.status})`);
    }
    return data;
  }

  // Handle non-JSON responses (e.g. 404 HTML, 502 Bad Gateway)
  if (res.status === 404) {
    throw new Error('API route not found (404). Please restart the Discord bot backend on your host to load the latest code.');
  }
  if (res.status === 401) {
    throw new Error('Authentication expired. Please refresh the page and sign in again.');
  }
  if (res.status === 403) {
    throw new Error('Missing Permissions: You need moderation rights in this server.');
  }
  if (res.status >= 500) {
    throw new Error('Discord bot backend error (500). Please check your bot console logs.');
  }
  throw new Error(`${fallbackMessage} (HTTP ${res.status})`);
}

export default function ModerationPage() {
  const guildId = useSearchParams().get('guild');

  const [activeTab, setActiveTab] = useState('actions');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backendOutdated, setBackendOutdated] = useState(false);

  // Overview & Discord Data
  const [overview, setOverview] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  // Cases state
  const [cases, setCases] = useState([]);
  const [casesTotal, setCasesTotal] = useState(0);
  const [casesPage, setCasesPage] = useState(1);
  const [casesTotalPages, setCasesTotalPages] = useState(1);
  const [caseActionFilter, setCaseActionFilter] = useState('all');
  const [caseSearch, setCaseSearch] = useState('');

  // Bans state
  const [bans, setBans] = useState([]);
  const [bansLoading, setBansLoading] = useState(false);

  // Automod state
  const [automod, setAutomod] = useState(null);
  const [automodSaving, setAutomodSaving] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [wordInput, setWordInput] = useState('');

  // Mod Settings state
  const [modSettings, setModSettings] = useState({ logChannel: '', mutedRole: '', modRoles: [] });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Channel Control state
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [currentSlowmode, setCurrentSlowmode] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [channelActionLoading, setChannelActionLoading] = useState(false);

  // Member Search
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modals state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState('warn');
  const [selectedTarget, setSelectedTarget] = useState(null);

  const [purgeModalOpen, setPurgeModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [editReasonModal, setEditReasonModal] = useState({
    isOpen: false,
    caseId: null,
    reason: ''
  });

  // Load Channels and Roles
  const loadGuildStructure = useCallback(async () => {
    if (!guildId) return;
    try {
      const [channelsRes, rolesRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/channels`),
        fetch(`/api/guild/${guildId}/roles`)
      ]);
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        const textChannels = Array.isArray(data) ? data : (data.text || data.channels || []);
        setChannels(textChannels);
        if (textChannels.length && !selectedChannelId) {
          setSelectedChannelId(textChannels[0].id);
        }
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to load server structure:', e);
    }
  }, [guildId, selectedChannelId]);

  // Load Overview
  const loadOverview = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/overview`);
      if (res.status === 404) {
        setBackendOutdated(true);
        return;
      }
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setOverview(data);
          setBackendOutdated(false);
        }
      }
    } catch (e) {
      console.warn('Failed to load moderation overview:', e);
    }
  }, [guildId]);

  // Load Cases
  const loadCases = useCallback(async (page = 1, action = caseActionFilter, search = caseSearch) => {
    if (!guildId) return;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        action: action || 'all'
      });
      if (search?.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/guild/${guildId}/moderation/cases?${params.toString()}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setCases(data.cases || []);
          setCasesTotal(data.total || 0);
          setCasesPage(data.page || 1);
          setCasesTotalPages(data.totalPages || 1);
        }
      }
    } catch (e) {
      console.warn('Failed to load cases:', e);
    }
  }, [guildId, caseActionFilter, caseSearch]);

  // Load Bans
  const loadBans = useCallback(async () => {
    if (!guildId) return;
    setBansLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/bans`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setBans(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      console.warn('Failed to load bans:', e);
    } finally {
      setBansLoading(false);
    }
  }, [guildId]);

  // Load Automod
  const loadAutomod = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/automod`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setAutomod(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load automod:', e);
    }
  }, [guildId]);

  // Load Mod Settings
  const loadModSettings = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/settings`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setModSettings({
            logChannel: data.logChannel || '',
            mutedRole: data.mutedRole || '',
            modRoles: Array.isArray(data.modRoles) ? data.modRoles : []
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load mod settings:', e);
    }
  }, [guildId]);

  // Search Members
  const searchMembers = useCallback(async (query = '') => {
    if (!guildId) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/search-members?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      console.warn('Member search failed:', e);
    } finally {
      setSearchLoading(false);
    }
  }, [guildId]);

  // Main Sync Function
  const syncAll = async (showToast = true) => {
    if (!guildId) return;
    setSyncing(true);
    try {
      // Check moderation API availability
      const probeRes = await fetch(`/api/guild/${guildId}/moderation/overview`);
      if (probeRes.status === 404) {
        setBackendOutdated(true);
        if (showToast) {
          toast.error('Bot backend missing moderation routes (404). Please restart your Discord bot on your host (e.g. VisiHost).');
        }
        setSyncing(false);
        setLoading(false);
        return;
      }
      setBackendOutdated(false);

      await Promise.all([
        loadGuildStructure(),
        loadOverview(),
        loadCases(1),
        loadBans(),
        loadAutomod(),
        loadModSettings(),
        searchMembers('')
      ]);
      if (showToast) {
        toast.success('Moderation data synchronized with Discord.');
      }
    } catch (err) {
      toast.error('Failed to sync server data.');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guildId) {
      syncAll(false);
    }
  }, [guildId]);

  // Execute Direct Moderation Action
  const handleExecuteAction = async (payload) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await parseApiResponse(res, 'Failed to execute moderation action');

      toast.success(`Action ${payload.action.toUpperCase()} completed successfully.`);
      setActionModalOpen(false);
      loadCases(casesPage);
      loadOverview();
      if (payload.action === 'ban' || payload.action === 'tempban' || payload.action === 'unban') {
        loadBans();
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    }
  };

  // Execute Purge
  const handlePurge = async ({ channelId, count, filter }) => {
    setChannelActionLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/channel-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge', channelId, count, filter })
      });
      const data = await parseApiResponse(res, 'Purge failed');

      toast.success(`Successfully purged ${data.deleted} messages.`);
      setPurgeModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Could not purge messages.');
    } finally {
      setChannelActionLoading(false);
    }
  };

  // Channel Slowmode
  const handleSlowmode = async (seconds) => {
    if (!selectedChannelId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/channel-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'slowmode', channelId: selectedChannelId, seconds })
      });
      await parseApiResponse(res, 'Failed to set slowmode');
      setCurrentSlowmode(seconds);
      toast.success(seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to ${seconds}s.`);
    } catch (err) {
      toast.error(err.message || 'Could not update slowmode.');
    }
  };

  // Channel Lockdown / Unlock
  const handleToggleLockdown = async (lock) => {
    if (!selectedChannelId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/channel-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: lock ? 'lockdown' : 'unlock',
          channelId: selectedChannelId,
          reason: lock ? 'Channel lockdown via dashboard' : 'Channel unlock via dashboard'
        })
      });
      await parseApiResponse(res, 'Lockdown operation failed');
      setIsLocked(lock);
      toast.success(lock ? 'Channel locked down.' : 'Channel unlocked.');
    } catch (err) {
      toast.error(err.message || 'Failed to modify channel lockdown status.');
    }
  };

  // Delete Case
  const handleDeleteCase = async (caseId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/cases/${caseId}`, {
        method: 'DELETE'
      });
      await parseApiResponse(res, 'Failed to delete case');
      toast.success('Case removed successfully.');
      loadCases(casesPage);
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to delete case.');
    }
  };

  // Edit Case Reason
  const handleUpdateReason = async () => {
    if (!editReasonModal.caseId || !editReasonModal.reason.trim()) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/cases/${editReasonModal.caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: editReasonModal.reason.trim() })
      });
      await parseApiResponse(res, 'Failed to update reason');
      toast.success('Case reason updated.');
      setEditReasonModal({ isOpen: false, caseId: null, reason: '' });
      loadCases(casesPage);
    } catch (err) {
      toast.error(err.message || 'Failed to update case reason.');
    }
  };

  // Revoke Ban (Unban)
  const handleUnban = (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Ban',
      message: `Are you sure you want to unban ${user.tag || user.username} (${user.id})?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/moderation/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unban', targetId: user.id, reason: 'Ban revoked from dashboard' })
          });
          await parseApiResponse(res, 'Failed to unban user');
          toast.success(`Unbanned ${user.tag || user.username}.`);
          loadBans();
          loadOverview();
          loadCases(1);
        } catch (err) {
          toast.error(err.message || 'Unban failed.');
        }
      }
    });
  };

  // Save Automod Settings
  const saveAutomod = async () => {
    if (!automod) return;
    setAutomodSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/automod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automod)
      });
      await parseApiResponse(res, 'Failed to save automod configuration');
      toast.success('Automod rules updated successfully.');
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Could not save automod settings.');
    } finally {
      setAutomodSaving(false);
    }
  };

  const handleAddDomain = () => {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!d) return;
    const current = automod?.AntiLink?.whitelistedDomains || [];
    if (!current.includes(d)) {
      setAutomod({
        ...automod,
        AntiLink: {
          ...automod?.AntiLink,
          whitelistedDomains: [...current, d]
        }
      });
    }
    setDomainInput('');
  };

  const handleRemoveDomain = (dom) => {
    setAutomod({
      ...automod,
      AntiLink: {
        ...automod?.AntiLink,
        whitelistedDomains: (automod?.AntiLink?.whitelistedDomains || []).filter((x) => x !== dom)
      }
    });
  };

  const handleAddWord = () => {
    const w = wordInput.trim().toLowerCase();
    if (!w) return;
    const current = automod?.BannedWords?.words || [];
    if (!current.includes(w)) {
      setAutomod({
        ...automod,
        BannedWords: {
          ...automod?.BannedWords,
          words: [...current, w]
        }
      });
    }
    setWordInput('');
  };

  const handleRemoveWord = (word) => {
    setAutomod({
      ...automod,
      BannedWords: {
        ...automod?.BannedWords,
        words: (automod?.BannedWords?.words || []).filter((x) => x !== word)
      }
    });
  };

  // Save General Mod Settings
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/moderation/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modSettings)
      });
      await parseApiResponse(res, 'Failed to save settings');
      toast.success('Moderation settings saved successfully.');
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Could not save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!guildId) {
    return (
      <div className="lucent-page grid min-h-[70vh] place-items-center">
        <div className="lucent-card max-w-md rounded-[1.8rem] p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/20">
            <ShieldAlert size={28} />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-white">Choose a server first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Pick a server from the sidebar selector to open its moderation command center.
          </p>
        </div>
      </div>
    );
  }

  const channelOptions = channels.map((c) => ({ value: c.id, label: `#${c.name}` }));
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name, badge: r.color }));

  return (
    <div className="lucent-page mx-auto max-w-7xl">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Security Suite
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Server <span className="text-red-500">Defense</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Automated raid protection, spam filtering, custom punishments, channel lockdowns, and live infraction logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Prominent Sync Button */}
          <button
            onClick={() => syncAll(true)}
            disabled={syncing}
            className="lucent-button h-11 px-4 rounded-2xl text-xs font-bold gap-2 text-rose-100 hover:border-rose-400/40 disabled:opacity-50 transition shadow-lg shadow-rose-500/10 flex-1 sm:flex-none justify-center"
            aria-label="Sync with Discord"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin text-rose-400' : 'text-rose-300'} />
            <span>{syncing ? 'Syncing…' : 'Sync Discord'}</span>
          </button>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              setSelectedTarget(null);
              setActionModalType('warn');
              setActionModalOpen(true);
            }}
            className="lucent-button lucent-button-primary h-11 px-5 rounded-2xl text-xs font-bold gap-2 text-white shadow-xl shadow-rose-500/20 flex-1 sm:flex-none justify-center"
          >
            <Plus size={16} />
            <span>New Mod Action</span>
          </button>
        </div>
      </div>

      {/* Bot Backend Update Required Banner */}
      {backendOutdated && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div>
              <p className="font-bold text-sm text-white">Bot Backend Update Required</p>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                The web dashboard frontend is up to date, but your Discord bot host is currently running an older build missing the moderation API routes (404).
                Please run <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-amber-300">git pull</code> and restart your bot on your host (e.g. VisiHost) to enable live moderation control.
              </p>
            </div>
          </div>
          <button
            onClick={() => syncAll(true)}
            disabled={syncing}
            className="lucent-button h-9 px-4 rounded-xl text-xs font-semibold shrink-0 bg-amber-500/20 border-amber-500/40 text-amber-100 hover:bg-amber-500/30 transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Metrics Overview Bar */}
      <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="lucent-card rounded-[1.6rem] p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/20">
              <FileText size={18} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">Total Recorded</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[var(--muted)]">Infractions & Cases</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">{overview?.stats?.total ?? '0'}</p>
          <p className="mt-1 text-xs text-[var(--quiet)]">
            {overview?.stats?.warns || 0} warns · {overview?.stats?.mutes || 0} timeouts · {overview?.stats?.bans || 0} bans
          </p>
        </article>

        <article className="lucent-card rounded-[1.6rem] p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20">
              <Hammer size={18} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">Discord Bans</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[var(--muted)]">Active Server Bans</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">{overview?.banCount ?? '0'}</p>
          <p className="mt-1 text-xs text-[var(--quiet)]">Members banned from guild</p>
        </article>

        <article className="lucent-card rounded-[1.6rem] p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/20">
              <ShieldCheck size={18} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">Active Shields</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[var(--muted)]">Automod Protection</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">
            {overview?.activeAutomodRules ?? 0} <span className="text-sm font-normal text-[var(--muted)]">/ 7 rules</span>
          </p>
          <p className="mt-1 text-xs text-[var(--quiet)]">Anti-spam, anti-invite, anti-link & more</p>
        </article>

        <article className="lucent-card rounded-[1.6rem] p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-400/15 text-purple-200 ring-1 ring-purple-400/20">
              <Hash size={18} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">Audit Logging</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[var(--muted)]">Mod Log Channel</p>
          <p className="mt-1 text-base font-bold tracking-tight text-white truncate">
            {overview?.logChannel ? `#${overview.logChannel.name}` : 'Not Configured'}
          </p>
          <p className="mt-1 text-xs text-[var(--quiet)]">
            {overview?.logChannel ? 'Embed dispatches active' : 'Choose channel in Mod Settings'}
          </p>
        </article>
      </section>

      {/* Tabs Navigation */}
      <div className="mt-8 border-b border-white/10 pb-px">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-rose-500/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)] ring-1 ring-rose-400/30'
                    : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-rose-300' : 'text-[var(--quiet)]'} />
                <span>{tab.label}</span>
                {tab.id === 'bans' && bans.length > 0 && (
                  <span className="rounded-md bg-rose-500/30 px-1.5 py-0.2 text-[10px] font-black text-rose-200">
                    {bans.length}
                  </span>
                )}
                {tab.id === 'cases' && casesTotal > 0 && (
                  <span className="rounded-md bg-white/10 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {casesTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Areas */}
      <div className="mt-6">
        {/* TAB 1: ACTION CENTER */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* Quick Action Executor Bar */}
            <div className="lucent-card rounded-[1.8rem] p-6">
              <h2 className="text-base font-bold text-white">Quick Moderation Dispatch</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Select an action to launch target execution modal with preset durations and logging.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {[
                  { type: 'warn', label: 'Warn', icon: '⚠️', color: 'hover:border-amber-400/40' },
                  { type: 'timeout', label: 'Timeout', icon: '⏳', color: 'hover:border-orange-400/40' },
                  { type: 'kick', label: 'Kick', icon: '👢', color: 'hover:border-rose-400/40' },
                  { type: 'ban', label: 'Ban', icon: '🔨', color: 'hover:border-red-500/40' },
                  { type: 'softban', label: 'Softban', icon: '🧹', color: 'hover:border-purple-400/40' },
                  { type: 'nickname', label: 'Nickname', icon: '📝', color: 'hover:border-blue-400/40' },
                  { type: 'role', label: 'Role', icon: '🏷️', color: 'hover:border-cyan-400/40' },
                  { type: 'note', label: 'Note', icon: '📋', color: 'hover:border-indigo-400/40' }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      setActionModalType(item.type);
                      setActionModalOpen(true);
                    }}
                    className={`glass flex flex-col items-center justify-center rounded-2xl p-4 text-center transition ${item.color} group`}
                  >
                    <span className="text-2xl transition group-hover:scale-110">{item.icon}</span>
                    <span className="mt-2 text-xs font-bold text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Member Search & Action Table */}
            <div className="lucent-card rounded-[1.8rem] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white">Live Member Inspector</h3>
                  <p className="text-xs text-[var(--muted)]">Search server members by name, nickname, or user ID</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => {
                      setMemberQuery(e.target.value);
                      searchMembers(e.target.value);
                    }}
                    placeholder="Search by username or ID…"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-[var(--quiet)] outline-none focus:border-rose-400/50"
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                      <th className="pb-3 pl-2">Member</th>
                      <th className="pb-3">User ID</th>
                      <th className="pb-3">Roles</th>
                      <th className="pb-3 text-right pr-2">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {searchResults.length > 0 ? (
                      searchResults.map((member) => (
                        <tr key={member.id} className="hover:bg-white/[.02] transition">
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                                alt=""
                                className="h-8 w-8 rounded-xl object-cover ring-1 ring-white/10"
                              />
                              <div>
                                <span className="font-semibold text-white block">{member.displayName}</span>
                                <small className="text-[11px] text-[var(--muted)]">{member.tag}</small>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-[var(--muted)]">{member.id}</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {member.roles.slice(0, 3).map((r) => (
                                <span
                                  key={r.id}
                                  className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/80"
                                >
                                  {r.name}
                                </span>
                              ))}
                              {member.roles.length > 3 && (
                                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--quiet)]">
                                  +{member.roles.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right pr-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTarget(member);
                                  setActionModalType('warn');
                                  setActionModalOpen(true);
                                }}
                                className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
                              >
                                Warn
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTarget(member);
                                  setActionModalType('timeout');
                                  setActionModalOpen(true);
                                }}
                                className="rounded-lg bg-orange-500/10 px-2 py-1 text-[11px] font-bold text-orange-300 hover:bg-orange-500/20 transition"
                              >
                                Timeout
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTarget(member);
                                  setActionModalType('kick');
                                  setActionModalOpen(true);
                                }}
                                className="rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                Kick
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTarget(member);
                                  setActionModalType('ban');
                                  setActionModalOpen(true);
                                }}
                                className="rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition"
                              >
                                Ban
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted)]">
                          {searchLoading ? 'Searching members on Discord…' : 'No server members found matching query.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHANNEL TOOLS */}
        {activeTab === 'channels' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Channel Selection & Overview */}
            <div className="lucent-card rounded-[1.8rem] p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Channel Selector</h3>
                <p className="text-xs text-[var(--muted)] mt-1">Choose a text channel to inspect and control</p>
              </div>

              <CustomSelect
                label="Selected Channel"
                value={selectedChannelId}
                onChange={setSelectedChannelId}
                options={channelOptions}
                searchable
              />

              {/* Bulk Purge Trigger */}
              <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
                    <Trash2 size={18} />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Bulk Purge Messages</h4>
                    <p className="text-xs text-[var(--muted)]">Filter bots, users, links, or attachments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPurgeModalOpen(true)}
                  disabled={!selectedChannelId || channelActionLoading}
                  className="lucent-button lucent-button-primary mt-2 h-11 w-full rounded-xl text-xs font-bold"
                >
                  Configure Purge Filter
                </button>
              </div>
            </div>

            {/* Slowmode & Lockdown Controls */}
            <div className="lucent-card rounded-[1.8rem] p-6 space-y-6">
              {/* Slowmode Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white">Channel Slowmode</h3>
                  <span className="text-xs font-bold text-rose-300">
                    {currentSlowmode === 0 ? 'Off' : `${currentSlowmode}s interval`}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">Rate limit how frequently users can post</p>

                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {SLOWMODE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleSlowmode(preset.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        currentSlowmode === preset.value
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-300'
                          : 'bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Lockdown Toggle */}
              <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 space-y-4 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl ${
                        isLocked ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Emergency Lockdown</h4>
                      <p className="text-xs text-[var(--muted)]">
                        {isLocked ? 'SendMessages denied for @everyone' : 'Channel open for public chat'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleLockdown(true)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-200 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition"
                  >
                    Lock Channel
                  </button>
                  <button
                    onClick={() => handleToggleLockdown(false)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition"
                  >
                    Unlock Channel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INFRACTIONS & AUDIT CASES */}
        {activeTab === 'cases' && (
          <div className="lucent-card rounded-[1.8rem] p-6 space-y-5">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-48">
                  <CustomSelect
                    value={caseActionFilter}
                    onChange={(val) => {
                      setCaseActionFilter(val);
                      loadCases(1, val, caseSearch);
                    }}
                    options={ACTION_FILTERS}
                  />
                </div>
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={caseSearch}
                  onChange={(e) => {
                    setCaseSearch(e.target.value);
                    loadCases(1, caseActionFilter, e.target.value);
                  }}
                  placeholder="Filter by Case, Target, or Reason…"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-[var(--quiet)] outline-none focus:border-rose-400/50"
                />
              </div>
            </div>

            {/* Cases Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                    <th className="pb-3 pl-2">Case ID</th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Target</th>
                    <th className="pb-3">Moderator</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right pr-2">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cases.length > 0 ? (
                    cases.map((c) => {
                      const isRed = ['ban', 'tempban', 'kick'].includes(c.action);
                      const isAmber = ['warn', 'timeout', 'mute'].includes(c.action);
                      const isBlue = ['note', 'nickname', 'role-add', 'role-remove'].includes(c.action);

                      return (
                        <tr key={c.caseId} className="hover:bg-white/[.02] transition">
                          <td className="py-3 pl-2 font-mono text-[11px] font-semibold text-white">
                            {c.caseId}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isRed
                                  ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                                  : isAmber
                                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                                  : isBlue
                                  ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                                  : 'bg-white/10 text-white'
                              }`}
                            >
                              {c.action}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-white">
                            <span>{c.targetTag}</span>
                            <small className="block text-[10px] font-mono text-[var(--quiet)]">{c.targetId}</small>
                          </td>
                          <td className="py-3 text-[var(--muted)]">{c.moderatorTag || c.moderatorId}</td>
                          <td className="py-3 max-w-xs truncate text-[var(--muted)]" title={c.reason}>
                            {c.reason || 'None provided'}
                          </td>
                          <td className="py-3 text-[11px] text-[var(--quiet)] whitespace-nowrap">
                            {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 text-right pr-2 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  setEditReasonModal({
                                    isOpen: true,
                                    caseId: c.caseId,
                                    reason: c.reason || ''
                                  })
                                }
                                className="text-xs text-[var(--muted)] hover:text-white transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Delete Infraction',
                                    message: `Are you sure you want to permanently delete case "${c.caseId}"?`,
                                    onConfirm: () => handleDeleteCase(c.caseId)
                                  });
                                }}
                                className="text-xs text-rose-400 hover:text-rose-300 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--muted)]">
                        No moderation cases found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {casesTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-[var(--muted)]">
                <span>
                  Showing page {casesPage} of {casesTotalPages} ({casesTotal} total cases)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadCases(casesPage - 1)}
                    disabled={casesPage <= 1}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => loadCases(casesPage + 1)}
                    disabled={casesPage >= casesTotalPages}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIVE BANS */}
        {activeTab === 'bans' && (
          <div className="lucent-card rounded-[1.8rem] p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Active Server Bans</h3>
                <p className="text-xs text-[var(--muted)]">Banned users fetched directly from Discord API</p>
              </div>
              <button
                onClick={loadBans}
                className="lucent-button h-9 px-3 rounded-xl text-xs gap-1.5"
                disabled={bansLoading}
              >
                <RefreshCw size={13} className={bansLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                    <th className="pb-3 pl-2">User</th>
                    <th className="pb-3">User ID</th>
                    <th className="pb-3">Ban Reason</th>
                    <th className="pb-3 text-right pr-2">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bans.length > 0 ? (
                    bans.map((b) => (
                      <tr key={b.user.id} className="hover:bg-white/[.02] transition">
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={b.user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                              alt=""
                              className="h-8 w-8 rounded-xl object-cover ring-1 ring-white/10"
                            />
                            <span className="font-semibold text-white">{b.user.tag || b.user.username}</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-[var(--muted)]">{b.user.id}</td>
                        <td className="py-3 text-[var(--muted)] max-w-sm truncate">{b.reason}</td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => handleUnban(b.user)}
                            className="rounded-xl bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition shadow-sm"
                          >
                            Unban
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[var(--muted)]">
                        {bansLoading ? 'Fetching banned members from Discord…' : 'No banned members currently.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUTOMOD RULES */}
        {activeTab === 'automod' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Automod Engine Configuration</h3>
                <p className="text-xs text-[var(--muted)]">Instant real-time message moderation and raid prevention</p>
              </div>
              <button
                onClick={saveAutomod}
                disabled={automodSaving}
                className="lucent-button lucent-button-primary h-11 px-6 rounded-2xl text-xs font-bold text-white shadow-xl shadow-rose-500/20"
              >
                {automodSaving ? 'Saving…' : 'Save Automod Rules'}
              </button>
            </div>

            {automod && (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                {/* Anti-Spam */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-200">
                        ⚡
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Spam Filter</h4>
                        <p className="text-xs text-[var(--muted)]">Detects rapid duplicate messaging</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiSpam?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiSpam: { ...automod.AntiSpam, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiSpam?.enabled && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">Max Messages</label>
                          <input
                            type="number"
                            min={2}
                            max={20}
                            value={automod.AntiSpam.maxMessages || 5}
                            onChange={(e) =>
                              setAutomod({
                                ...automod,
                                AntiSpam: { ...automod.AntiSpam, maxMessages: parseInt(e.target.value) || 5 }
                              })
                            }
                            className="lucent-input px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">Time Window (s)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={automod.AntiSpam.timeWindow || 5}
                            onChange={(e) =>
                              setAutomod({
                                ...automod,
                                AntiSpam: { ...automod.AntiSpam, timeWindow: parseInt(e.target.value) || 5 }
                              })
                            }
                            className="lucent-input px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiSpam.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiSpam: { ...automod.AntiSpam, action: val }
                          })
                        }
                        options={PENALTY_ACTIONS}
                      />
                    </div>
                  )}
                </section>

                {/* Anti-Link */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/15 text-blue-200">
                        🔗
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Link Filter</h4>
                        <p className="text-xs text-[var(--muted)]">Block unauthorized web links & phishing</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiLink?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiLink: { ...automod.AntiLink, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiLink?.enabled && (
                    <div className="space-y-3 pt-2">
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiLink.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiLink: { ...automod.AntiLink, action: val }
                          })
                        }
                        options={PENALTY_ACTIONS}
                      />
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)] flex items-center gap-1.5">
                          <Globe size={11} className="text-blue-300" />
                          Whitelisted Domains ({automod.AntiLink?.whitelistedDomains?.length || 0})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDomain();
                              }
                            }}
                            placeholder="e.g. youtube.com, tenor.com…"
                            className="lucent-input px-3 py-2 text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleAddDomain}
                            className="lucent-button px-3 py-2 rounded-xl text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                        {automod.AntiLink?.whitelistedDomains?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                            {automod.AntiLink.whitelistedDomains.map((dom) => (
                              <span
                                key={dom}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200"
                              >
                                <span>{dom}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDomain(dom)}
                                  className="text-blue-300/60 hover:text-white transition"
                                  title="Remove domain"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--quiet)] italic">
                            No domains whitelisted. All external links will trigger this rule.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Anti-Invite */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-400/15 text-purple-200">
                        ✉️
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Discord Invites</h4>
                        <p className="text-xs text-[var(--muted)]">Prevents advertising discord.gg invites</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiInvite?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiInvite: { ...automod.AntiInvite, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiInvite?.enabled && (
                    <div className="pt-2">
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiInvite.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiInvite: { ...automod.AntiInvite, action: val }
                          })
                        }
                        options={PENALTY_ACTIONS}
                      />
                    </div>
                  )}
                </section>

                {/* Anti-Caps */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-200">
                        🔠
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Caps Excessive Shouting</h4>
                        <p className="text-xs text-[var(--muted)]">Filters messages with high uppercase ratio</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiCaps?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiCaps: { ...automod.AntiCaps, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiCaps?.enabled && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">
                          Caps Threshold: {automod.AntiCaps.percentage || 70}%
                        </label>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={automod.AntiCaps.percentage || 70}
                          onChange={(e) =>
                            setAutomod({
                              ...automod,
                              AntiCaps: { ...automod.AntiCaps, percentage: parseInt(e.target.value) || 70 }
                            })
                          }
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiCaps.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiCaps: { ...automod.AntiCaps, action: val }
                          })
                        }
                        options={PENALTY_ACTIONS}
                      />
                    </div>
                  )}
                </section>

                {/* Anti-Mention Spam */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/15 text-orange-200">
                        📢
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Mention Mass Ping</h4>
                        <p className="text-xs text-[var(--muted)]">Limits mass mentions in single messages</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiMentionSpam?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiMentionSpam: { ...automod.AntiMentionSpam, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiMentionSpam?.enabled && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">Max Allowed Mentions</label>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={automod.AntiMentionSpam.maxMentions || 6}
                          onChange={(e) =>
                            setAutomod({
                              ...automod,
                              AntiMentionSpam: {
                                ...automod.AntiMentionSpam,
                                maxMentions: parseInt(e.target.value) || 6
                              }
                            })
                          }
                          className="lucent-input px-3 py-2 text-xs"
                        />
                      </div>
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiMentionSpam.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiMentionSpam: { ...automod.AntiMentionSpam, action: val }
                          })
                        }
                        options={PENALTY_ACTIONS}
                      />
                    </div>
                  )}
                </section>

                {/* Anti-Raid */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-400/15 text-red-200">
                        🛡️
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Anti-Raid Mass Join Protection</h4>
                        <p className="text-xs text-[var(--muted)]">Safeguard server when multiple accounts flood join</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.AntiRaid?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          AntiRaid: { ...automod.AntiRaid, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.AntiRaid?.enabled && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">Join Threshold</label>
                          <input
                            type="number"
                            min={2}
                            max={50}
                            value={automod.AntiRaid.joinThreshold || 5}
                            onChange={(e) =>
                              setAutomod({
                                ...automod,
                                AntiRaid: { ...automod.AntiRaid, joinThreshold: parseInt(e.target.value) || 5 }
                              })
                            }
                            className="lucent-input px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-[var(--quiet)]">Window (s)</label>
                          <input
                            type="number"
                            min={2}
                            max={60}
                            value={automod.AntiRaid.timeWindow || 10}
                            onChange={(e) =>
                              setAutomod({
                                ...automod,
                                AntiRaid: { ...automod.AntiRaid, timeWindow: parseInt(e.target.value) || 10 }
                              })
                            }
                            className="lucent-input px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.AntiRaid.action || 'kick'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            AntiRaid: { ...automod.AntiRaid, action: val }
                          })
                        }
                        options={[
                          { value: 'kick', label: 'Kick Joining Raiders' },
                          { value: 'ban', label: 'Ban Joining Raiders' }
                        ]}
                      />
                    </div>
                  )}
                </section>

                {/* Banned Words */}
                <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-200">
                        <Ban size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Banned Words & Phrases</h4>
                        <p className="text-xs text-[var(--muted)]">Deletes messages containing forbidden vocabulary</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!automod.BannedWords?.enabled}
                      onChange={(e) =>
                        setAutomod({
                          ...automod,
                          BannedWords: { ...automod.BannedWords, enabled: e.target.checked }
                        })
                      }
                      className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
                    />
                  </div>
                  {automod.BannedWords?.enabled && (
                    <div className="space-y-3 pt-2">
                      <CustomSelect
                        label="Action On Trigger"
                        value={automod.BannedWords.action || 'delete'}
                        onChange={(val) =>
                          setAutomod({
                            ...automod,
                            BannedWords: { ...automod.BannedWords, action: val }
                          })
                        }
                        options={[
                          { value: 'delete', label: 'Delete Message Only' },
                          { value: 'warn', label: 'Warn User' },
                          { value: 'timeout', label: 'Timeout Member' }
                        ]}
                      />
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                            Forbidden Words ({automod.BannedWords?.words?.length || 0})
                          </label>
                          {automod.BannedWords?.words?.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setAutomod({
                                  ...automod,
                                  BannedWords: { ...automod.BannedWords, words: [] }
                                })
                              }
                              className="text-[10px] text-rose-300 hover:underline"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={wordInput}
                            onChange={(e) => setWordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddWord();
                              }
                            }}
                            placeholder="Type forbidden word…"
                            className="lucent-input px-3 py-2 text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleAddWord}
                            className="lucent-button px-3 py-2 rounded-xl text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                        {automod.BannedWords?.words?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                            {automod.BannedWords.words.map((word) => (
                              <span
                                key={word}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-200 font-mono"
                              >
                                <span>{word}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWord(word)}
                                  className="text-rose-300/60 hover:text-rose-200 transition"
                                  title="Remove word"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--quiet)] italic">No banned words configured yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Automod Exemptions: Ignored Channels & Ignored Roles */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white">Automod Exemptions & Whitelists</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Channels and member roles that completely bypass all automod checks and penalties
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {/* Ignored Channels Card */}
                  <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">
                        <Hash size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Ignored Channels</h4>
                        <p className="text-xs text-[var(--muted)]">Messages sent in these channels will never trigger automod</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <CustomSelect
                        label="Add Channel to Ignore"
                        placeholder="Select a channel to exempt…"
                        value=""
                        onChange={(channelId) => {
                          if (!channelId) return;
                          const current = automod.IgnoredChannels || [];
                          if (!current.includes(channelId)) {
                            setAutomod({
                              ...automod,
                              IgnoredChannels: [...current, channelId]
                            });
                          }
                        }}
                        options={channelOptions.filter((c) => !(automod.IgnoredChannels || []).includes(c.value))}
                        searchable
                      />

                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                          Currently Ignored ({automod.IgnoredChannels?.length || 0})
                        </label>
                        {automod.IgnoredChannels?.length > 0 ? (
                          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                            {automod.IgnoredChannels.map((chId) => {
                              const ch = channels.find((c) => c.id === chId);
                              const name = ch ? `#${ch.name}` : `Channel ${chId}`;
                              return (
                                <span
                                  key={chId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 font-medium"
                                >
                                  <Hash size={13} className="text-cyan-400 shrink-0" />
                                  <span className="truncate max-w-[150px]">{name}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAutomod({
                                        ...automod,
                                        IgnoredChannels: (automod.IgnoredChannels || []).filter((id) => id !== chId)
                                      })
                                    }
                                    className="text-cyan-300/60 hover:text-white transition ml-1"
                                    title="Remove channel exemption"
                                  >
                                    <X size={13} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--muted)] p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            No channels are exempt. All text channels are monitored by automod.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Ignored Roles Card */}
                  <section className="lucent-card rounded-[1.8rem] p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-400/15 text-purple-200">
                        <ShieldCheck size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Ignored Roles</h4>
                        <p className="text-xs text-[var(--muted)]">Users holding any of these roles completely bypass automod</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <CustomSelect
                        label="Add Role to Ignore"
                        placeholder="Select a role to exempt…"
                        value=""
                        onChange={(roleId) => {
                          if (!roleId) return;
                          const current = automod.IgnoredRoles || [];
                          if (!current.includes(roleId)) {
                            setAutomod({
                              ...automod,
                              IgnoredRoles: [...current, roleId]
                            });
                          }
                        }}
                        options={roleOptions.filter((r) => !(automod.IgnoredRoles || []).includes(r.value))}
                        searchable
                      />

                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                          Currently Ignored ({automod.IgnoredRoles?.length || 0})
                        </label>
                        {automod.IgnoredRoles?.length > 0 ? (
                          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                            {automod.IgnoredRoles.map((rId) => {
                              const r = roles.find((role) => role.id === rId);
                              const name = r ? `@${r.name}` : `Role ${rId}`;
                              return (
                                <span
                                  key={rId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 font-medium"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: r?.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#a855f7' }}
                                  />
                                  <span className="truncate max-w-[150px]">{name}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAutomod({
                                        ...automod,
                                        IgnoredRoles: (automod.IgnoredRoles || []).filter((id) => id !== rId)
                                      })
                                    }
                                    className="text-purple-300/60 hover:text-white transition ml-1"
                                    title="Remove role exemption"
                                  >
                                    <X size={13} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--muted)] p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            No roles are exempt. All regular server members are monitored by automod.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 6: MOD SETTINGS */}
        {activeTab === 'settings' && (
          <div className="lucent-card max-w-2xl rounded-[1.8rem] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Moderation Settings</h3>
              <p className="text-xs text-[var(--muted)]">Configure audit logging and role bindings</p>
            </div>

            <div className="space-y-5">
              <div>
                <CustomSelect
                  label="Mod Log Channel"
                  value={modSettings.logChannel}
                  onChange={(val) => setModSettings({ ...modSettings, logChannel: val })}
                  options={[{ value: '', label: 'Disabled (No Mod Logs)' }, ...channelOptions]}
                  searchable
                />
                <p className="mt-1.5 text-[11px] text-[var(--quiet)] ml-1">
                  Where moderation cases, warns, timeouts, kicks, and bans are dispatched as embeds.
                </p>
              </div>

              <div>
                <CustomSelect
                  label="Muted Fallback Role"
                  value={modSettings.mutedRole}
                  onChange={(val) => setModSettings({ ...modSettings, mutedRole: val })}
                  options={[{ value: '', label: 'None (Use Discord Native Timeout)' }, ...roleOptions]}
                  searchable
                />
                <p className="mt-1.5 text-[11px] text-[var(--quiet)] ml-1">
                  Optional role used for servers desiring role-based mute alongside native timeouts.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="lucent-button lucent-button-primary h-11 px-6 rounded-2xl text-xs font-bold"
                >
                  {settingsSaving ? 'Saving Settings…' : 'Save Mod Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Execution Modal */}
      <ActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onSubmit={handleExecuteAction}
        initialAction={actionModalType}
        initialTarget={selectedTarget}
        roles={roles}
      />

      {/* Message Purge Modal */}
      <PurgeModal
        isOpen={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onSubmit={handlePurge}
        channels={channels}
        currentChannelId={selectedChannelId}
        loading={channelActionLoading}
      />

      {/* Universal Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {/* Edit Reason Modal */}
      {editReasonModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setEditReasonModal({ isOpen: false, caseId: null, reason: '' })}
          />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/15 bg-[#12080f] p-6 shadow-2xl z-10 space-y-4">
            <h3 className="text-base font-bold text-white">Edit Reason for {editReasonModal.caseId}</h3>
            <textarea
              rows={3}
              value={editReasonModal.reason}
              onChange={(e) => setEditReasonModal({ ...editReasonModal, reason: e.target.value })}
              className="lucent-input p-3 text-xs resize-none"
              placeholder="Enter updated infraction reason…"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditReasonModal({ isOpen: false, caseId: null, reason: '' })}
                className="py-2 px-4 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReason}
                className="lucent-button lucent-button-primary py-2 px-5 rounded-xl text-xs font-bold"
              >
                Save Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
