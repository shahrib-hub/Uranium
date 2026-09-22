'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Hammer,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  X,
  FileText,
  UserRound,
  CheckCircle2,
  Tag
} from 'lucide-react';
import CustomSelect from './CustomSelect';

const ACTION_TYPES = [
  { value: 'warn', label: 'Warn Member', icon: '⚠️', description: 'Issue a formal recorded warning' },
  { value: 'timeout', label: 'Timeout / Mute', icon: '⏳', description: 'Temporarily restrict sending messages' },
  { value: 'unmute', label: 'Remove Timeout / Unmute', icon: '🔊', description: 'Lift active timeout from member' },
  { value: 'kick', label: 'Kick Member', icon: '👢', description: 'Remove member from the server' },
  { value: 'ban', label: 'Ban Member', icon: '🔨', description: 'Permanently ban member from server' },
  { value: 'unban', label: 'Unban Member', icon: '🔓', description: 'Unban user by their Discord User ID' },
  { value: 'softban', label: 'Softban (Ban & Unban)', icon: '🧹', description: 'Kick & purge up to 7 days messages' },
  { value: 'clear-roles', label: 'Clear Member Roles', icon: '🧼', description: 'Remove all roles except preserved' },
  { value: 'nickname', label: 'Change Nickname', icon: '📝', description: 'Update or reset member nickname' },
  { value: 'role', label: 'Manage Member Role', icon: '🏷️', description: 'Add or remove a server role' },
  { value: 'note', label: 'Add Private Note', icon: '📋', description: 'Record a private staff note' }
];

const TIMEOUT_DURATIONS = [
  { value: '60s', label: '60 Seconds' },
  { value: '5m', label: '5 Minutes' },
  { value: '10m', label: '10 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' }
];

const BAN_DURATIONS = [
  { value: '', label: 'Permanent' },
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' }
];

const DELETE_MESSAGE_OPTIONS = [
  { value: '0', label: "Don't delete any messages" },
  { value: '3600', label: 'Previous 1 Hour' },
  { value: '21600', label: 'Previous 6 Hours' },
  { value: '86400', label: 'Previous 24 Hours' },
  { value: '604800', label: 'Previous 7 Days' }
];

export default function ActionModal({
  isOpen,
  onClose,
  onSubmit,
  initialAction = 'warn',
  initialTarget = null,
  roles = [],
  loading = false
}) {
  const [action, setAction] = useState(initialAction);
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('10m');
  const [banDuration, setBanDuration] = useState('');
  const [deleteSeconds, setDeleteSeconds] = useState('0');
  const [nickname, setNickname] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleAction, setRoleAction] = useState('add');
  const [preserveRoles, setPreserveRoles] = useState('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAction(initialAction || 'warn');
      if (initialTarget) {
        setTargetId(initialTarget.id || initialTarget.userId || '');
        setTargetName(initialTarget.tag || initialTarget.username || initialTarget.displayName || '');
      } else {
        setTargetId('');
        setTargetName('');
      }
      setReason('');
      setDuration('10m');
      setBanDuration('');
      setDeleteSeconds('0');
      setNickname('');
      setRoleId(roles[0]?.id || '');
      setRoleAction('add');
      setPreserveRoles('');
      setNoteText('');
    }
  }, [isOpen, initialAction, initialTarget, roles]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetId.trim()) return;

    onSubmit({
      action,
      targetId: targetId.trim(),
      reason: reason.trim() || 'No reason specified',
      duration: action === 'timeout' ? duration : (action === 'ban' ? banDuration : null),
      deleteMessageSeconds: action === 'ban' ? parseInt(deleteSeconds) : 0,
      nickname: action === 'nickname' ? nickname.trim() : null,
      roleId: action === 'role' ? roleId : null,
      roleAction: action === 'role' ? roleAction : null,
      preserveRoles: action === 'clear-roles' ? preserveRoles.trim() : null,
      text: action === 'note' ? (noteText || reason) : null
    });
  };

  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: r.name,
    badge: r.color && r.color !== '#000000' ? r.color : null
  }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-xl rounded-[2rem] border border-white/15 bg-[#10080d] p-6 sm:p-8 shadow-2xl z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
                <ShieldAlert size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Execute Mod Action</h3>
                <p className="text-xs text-[var(--muted)]">Direct command dispatch to Discord server</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Action Type Selector */}
            <div>
              <CustomSelect
                label="Action Type"
                value={action}
                onChange={setAction}
                options={ACTION_TYPES}
              />
            </div>

            {/* Target User ID or Tag */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                {action === 'unban' ? 'Target User ID (Unban from Server)' : 'Target User ID or Username'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="e.g. 109876543210987654 or select member"
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
                {targetName && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300">
                    {targetName}
                  </span>
                )}
              </div>
            </div>

            {/* Action Specific Fields */}
            {action === 'timeout' && (
              <div className="space-y-1.5">
                <CustomSelect
                  label="Timeout Duration"
                  value={duration}
                  onChange={setDuration}
                  options={TIMEOUT_DURATIONS}
                />
              </div>
            )}

            {action === 'ban' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomSelect
                  label="Ban Duration"
                  value={banDuration}
                  onChange={setBanDuration}
                  options={BAN_DURATIONS}
                />
                <CustomSelect
                  label="Delete Message History"
                  value={deleteSeconds}
                  onChange={setDeleteSeconds}
                  options={DELETE_MESSAGE_OPTIONS}
                />
              </div>
            )}

            {action === 'nickname' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  New Nickname (Leave blank to reset)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter new nickname or leave empty to clear"
                  maxLength={32}
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
              </div>
            )}

            {action === 'role' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <CustomSelect
                  label="Role Operation"
                  value={roleAction}
                  onChange={setRoleAction}
                  options={[
                    { value: 'add', label: 'Add Role (+)', icon: '➕' },
                    { value: 'remove', label: 'Remove Role (-)', icon: '➖' }
                  ]}
                />
                <CustomSelect
                  label="Target Role"
                  value={roleId}
                  onChange={setRoleId}
                  options={roleOptions}
                  searchable
                />
              </div>
            )}

            {action === 'clear-roles' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Preserved Roles (Optional Comma-separated Role IDs to Keep)
                </label>
                <input
                  type="text"
                  value={preserveRoles}
                  onChange={(e) => setPreserveRoles(e.target.value)}
                  placeholder="e.g. 109876543210987654, 987654321098765432"
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
                <p className="text-[10px] text-white/40 ml-1">
                  All roles below the bot's highest role will be removed except for IDs specified above.
                </p>
              </div>
            )}

            {action === 'note' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Private Moderator Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record staff notes, observations, or incident context..."
                  className="lucent-input p-3 text-sm resize-none"
                />
              </div>
            )}

            {/* Reason Field */}
            {action !== 'note' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Reason (Logged to Audit Channel)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Breaking Rule 3 - Spamming or advertisement"
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !targetId.trim()}
                className="flex-1 py-3.5 rounded-2xl lucent-button-primary text-sm font-semibold text-white disabled:opacity-50 transition shadow-lg shadow-rose-500/20"
              >
                {loading ? 'Executing on Discord…' : `Confirm ${action.toUpperCase()}`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
