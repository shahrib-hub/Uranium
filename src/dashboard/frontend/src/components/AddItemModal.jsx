'use client';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Plus, RefreshCw, Search, Smile } from 'lucide-react';

const COMMON_EMOJIS = [
  '🎮', '🎯', '🎲', '🎨', '🎭', '🎪', '🎫', '🎬', '🎤', '🎧',
  '🎼', '🎵', '🎶', '🎹', '🎸', '🎻', '🎺', '🥁', '📱', '💻',
  '🖥️', '⌨️', '🖱️', '💾', '💿', '📀', '📷', '📹', '🎥', '📞',
  '📟', '📠', '📺', '📻', '🎙️', '📡', '🔋', '🔌', '💡', '🔦',
  '📚', '📖', '📝', '📒', '📃', '📜', '📑', '📈', '📉', '📊',
  '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '💢', '💦', '💧',
  '🩵', '🩶', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🎃', '🤖', '👻', '👽', '👾', '🤠', '🥳', '😎', '🤓', '🧐'
];

const BUTTON_STYLES = [
  { id: 0, name: 'Primary', color: 'bg-blue-500', text: 'text-white' },
  { id: 1, name: 'Secondary', color: 'bg-gray-500', text: 'text-white' },
  { id: 2, name: 'Success', color: 'bg-green-500', text: 'text-white' },
  { id: 3, name: 'Danger', color: 'bg-red-500', text: 'text-white' }
];

export default function AddItemModal({ isOpen, onClose, guildId, setupId, setupMode, onSuccess, existingCount = 0 }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    roleId: '',
    emoji: '',
    label: '',
    style: 0,
    description: ''
  });

  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);

  useEffect(() => {
    if (isOpen && guildId) {
      fetchRoles();
    }
  }, [isOpen, guildId]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/roles`);
      const data = await res.json();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!formData.roleId || !formData.emoji) return;

    setLoading(true);
    try {
      // Parse emoji
      let emojiIdentifier = formData.emoji;
      let emoji = formData.emoji;

      // Handle custom emoji format
      if (formData.emoji.match(/^<:\w+:\d+>$/)) {
        const match = formData.emoji.match(/<:(\w+):(\d+)>/);
        if (match) {
          emoji = formData.emoji;
          emojiIdentifier = `${match[1]}:${match[2]}`;
        }
      }

      const res = await fetch(`/api/guild/${guildId}/rr/setups/${setupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: formData.roleId,
          emoji: emoji,
          emojiIdentifier: emojiIdentifier,
          label: formData.label || null,
          style: formData.style,
          description: formData.description || null
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Add item error:', err);
      alert('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setFormData({
      roleId: '',
      emoji: '',
      label: '',
      style: 0,
      description: ''
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!formData.roleId;
      case 1:
        return !!formData.emoji;
      default:
        return true;
    }
  };

  const maxItems = setupMode === 'buttons' ? 5 : setupMode === 'reactions' ? 20 : 25;
  const isAtLimit = existingCount >= maxItems;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-black text-white">Add Role to Panel</h2>
            <p className="text-xs text-white/40">
              Step {step + 1} of 2: {step === 0 ? 'Select Role' : 'Customize'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-4 py-3 border-b border-white/5">
          <div className={`flex-1 h-1 rounded-full transition-all ${step >= 0 ? 'bg-red-500' : 'bg-white/10'}`} />
          <div className={`flex-1 h-1 rounded-full transition-all ${step >= 1 ? 'bg-red-500' : 'bg-white/10'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isAtLimit ? (
            <div className="text-center py-8">
              <p className="text-white/60">This panel is at max capacity ({maxItems} items)</p>
            </div>
          ) : step === 0 ? (
            <RoleSelector
              roles={filteredRoles}
              loading={loadingRoles}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedRoleId={formData.roleId}
              onSelect={(roleId) => setFormData(prev => ({ ...prev, roleId }))}
            />
          ) : (
            <div className="space-y-4">
              {/* Selected Role Display */}
              {(() => {
                const role = roles.find(r => r.id === formData.roleId);
                return role ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color || '#6366F1' }}
                    />
                    <span className="font-bold text-white">{role.name}</span>
                    <span className="text-xs text-white/40 ml-auto">{role.id}</span>
                  </div>
                ) : null;
              })()}

              {/* Emoji Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Emoji</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                    placeholder="🎮"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomEmoji(!showCustomEmoji)}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
                  >
                    <Smile size={20} />
                  </button>
                </div>

                {/* Common Emojis */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_EMOJIS.slice(0, 30).map(emo => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, emoji: emo }))}
                      className={`p-2 rounded-lg text-lg hover:bg-white/10 ${
                        formData.emoji === emo ? 'bg-white/20 ring-1 ring-white/30' : ''
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Label */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Button Label (optional)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
                  placeholder="Role name"
                  maxLength={80}
                />
              </div>

              {/* Button Style (only for buttons mode) */}
              {setupMode === 'buttons' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Button Style</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BUTTON_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, style: style.id }))}
                        className={`p-3 rounded-xl ${style.color} ${
                          formData.style === style.id ? 'ring-2 ring-white' : ''
                        }`}
                      >
                        <span className={`text-xs font-bold ${style.text}`}>{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Tooltip Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 resize-none h-16"
                  placeholder="Description shown on hover"
                  maxLength={150}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
            <span>{step > 0 ? 'Back' : 'Cancel'}</span>
          </button>

          {step < 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-black font-bold transition-all hover:bg-red-400 disabled:opacity-50"
            >
              <span>Continue</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.emoji}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-green-500 text-black font-bold transition-all hover:bg-green-400 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
              <span>Add Role</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleSelector({ roles, loading, searchQuery, onSearchChange, selectedRoleId, onSelect }) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="Search roles..."
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="text-white/20 animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-center py-8 text-white/40">No roles found</p>
        ) : (
          roles.map(role => (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelect(role.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                selectedRoleId === role.id
                  ? 'bg-red-500/10 border border-red-500'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: role.color || '#6366F1' }}
              />
              <span className="flex-1 font-medium text-white truncate">{role.name}</span>
              <span className="text-xs text-white/30">{role.id}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}