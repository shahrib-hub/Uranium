'use client';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Plus, RefreshCw } from 'lucide-react';
import ColorPicker from './ColorPicker';

const STEPS = ['Mode', 'Channel', 'Embed', 'Details', 'Preview'];

export default function RRCreateModal({ isOpen, onClose, guildId, onSuccess, showToast }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState({ text: [], voice: [], category: [] });

  const [formData, setFormData] = useState({
    mode: 'buttons',
    channelId: '',
    maxPerUser: 0,
    exclusive: false,
    embedColor: '#6366F1',
    embedTitle: '',
    embedDescription: '',
    embedFooter: '',
    embedThumbnail: '',
    embedAuthorName: '',
    embedAuthorIcon: '',
    embedAuthorUrl: '',
    embedImage: '',
    panelTitle: '',
    panelDescription: ''
  });

  useEffect(() => {
    if (isOpen && guildId) {
      fetchChannels();
    }
  }, [isOpen, guildId]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/channels`);
      const data = await res.json();
      setChannels(data);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!formData.mode;
      case 1:
        return !!formData.channelId;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        channelId: formData.channelId,
        mode: formData.mode,
        title: formData.panelTitle,
        description: formData.panelDescription,
        maxPerUser: formData.maxPerUser,
        exclusive: formData.exclusive,
        embedColor: formData.embedColor,
        embedTitle: formData.embedTitle,
        embedDescription: formData.embedDescription,
        embedFooter: formData.embedFooter,
        embedThumbnail: formData.embedThumbnail,
        embedAuthorName: formData.embedAuthorName,
        embedAuthorIcon: formData.embedAuthorIcon,
        embedAuthorUrl: formData.embedAuthorUrl,
        embedImage: formData.embedImage
      };

      const res = await fetch(`/api/guild/${guildId}/rr/setups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.setupId);
        onClose();
        resetForm();
      } else {
        showToast?.(data.error || 'Failed to create panel', 'error');
      }
    } catch (err) {
      console.error('Create error:', err);
      showToast?.('Failed to create panel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setFormData({
      mode: 'buttons',
      channelId: '',
      maxPerUser: 0,
      exclusive: false,
      embedColor: '#6366F1',
      embedTitle: '',
      embedDescription: '',
      embedFooter: '',
      embedThumbnail: '',
      embedAuthorName: '',
      embedAuthorIcon: '',
      embedAuthorUrl: '',
      embedImage: '',
      panelTitle: '',
      panelDescription: ''
    });
  };

  const goToStep = (newStep) => {
    if (newStep >= 0 && newStep < STEPS.length) {
      setStep(newStep);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-black text-white">Create Reaction Panel</h2>
            <p className="text-xs text-white/40">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-4 py-3 border-b border-white/5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${
                i < step ? 'bg-red-500' : i === step ? 'bg-red-500/50' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 0 && <StepMode formData={formData} updateField={updateField} />}
          {step === 1 && <StepChannel formData={formData} updateField={updateField} channels={channels} />}
          {step === 2 && <StepEmbed formData={formData} updateField={updateField} />}
          {step === 3 && <StepDetails formData={formData} updateField={updateField} />}
          {step === 4 && <StepPreview formData={formData} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <button
            onClick={() => step > 0 ? goToStep(step - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">{step > 0 ? 'Back' : 'Cancel'}</span>
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => goToStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-black font-bold transition-all hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-green-500 text-black font-bold transition-all hover:bg-green-400 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              <span>Create Panel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepMode({ formData, updateField }) {
  const modes = [
    {
      id: 'buttons',
      icon: '🔘',
      name: 'Buttons',
      desc: 'Up to 5 buttons per row',
      limit: '5',
      color: 'border-red-500/30 bg-red-500/5'
    },
    {
      id: 'dropdown',
      icon: '📋',
      name: 'Dropdown',
      desc: 'Single menu, up to 25 options',
      limit: '25',
      color: 'border-blue-500/30 bg-blue-500/5'
    },
    {
      id: 'reactions',
      icon: '💬',
      name: 'Reactions',
      desc: 'Message reactions to toggle roles',
      limit: '20',
      color: 'border-purple-500/30 bg-purple-500/5'
    }
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/60">Select the type of panel you want to create.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => updateField('mode', mode.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              formData.mode === mode.id
                ? 'border-red-500 bg-red-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <span className="text-2xl block mb-2">{mode.icon}</span>
            <h3 className="font-bold text-white">{mode.name}</h3>
            <p className="text-xs text-white/50 mt-1">{mode.desc}</p>
            <p className="text-xs text-red-400 mt-2 font-mono">Max {mode.limit}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepChannel({ formData, updateField, channels }) {
  const textChannels = Array.isArray(channels) ? channels : (channels.text || channels.channels || []);

  return (
    <div className="space-y-4">
      {/* Channel Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
          Select Text Channel
        </label>
        <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {textChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => updateField('channelId', ch.id)}
              className={`p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                formData.channelId === ch.id
                  ? 'bg-red-500/10 border border-red-500'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-lg">💬</span>
              <span className="text-sm font-medium text-white truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Max Roles */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
          Max Roles Per User
        </label>
        <input
          type="number"
          min="0"
          max="25"
          value={formData.maxPerUser}
          onChange={(e) => updateField('maxPerUser', parseInt(e.target.value) || 0)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="0"
        />
        <p className="text-xs text-white/40">0 = Unlimited</p>
      </div>

      {/* Exclusive Mode */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h3 className="font-bold text-white">Exclusive Mode</h3>
          <p className="text-xs text-white/50">Users can only have one role from this panel</p>
        </div>
        <button
          onClick={() => updateField('exclusive', !formData.exclusive)}
          className={`w-14 h-8 rounded-full transition-all ${
            formData.exclusive ? 'bg-red-500' : 'bg-white/10'
          }`}
        >
          <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-all ${
            formData.exclusive ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );
}

function StepEmbed({ formData, updateField }) {
  return (
    <div className="space-y-4">
      <ColorPicker
        label="Embed Color"
        value={formData.embedColor}
        onChange={(color) => updateField('embedColor', color)}
      />

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Embed Title</label>
        <input
          type="text"
          value={formData.embedTitle}
          onChange={(e) => updateField('embedTitle', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="Custom embed title (optional)"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Embed Description</label>
        <textarea
          value={formData.embedDescription}
          onChange={(e) => updateField('embedDescription', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 resize-none h-20"
          placeholder="Custom embed description (optional)"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Footer Text</label>
        <input
          type="text"
          value={formData.embedFooter}
          onChange={(e) => updateField('embedFooter', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="Footer text (optional)"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Thumbnail URL</label>
        <input
          type="url"
          value={formData.embedThumbnail}
          onChange={(e) => updateField('embedThumbnail', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="https://example.com/image.png"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Author Name</label>
          <input
            type="text"
            value={formData.embedAuthorName}
            onChange={(e) => updateField('embedAuthorName', e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
            placeholder="Author name"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Author Icon URL</label>
          <input
            type="url"
            value={formData.embedAuthorIcon}
            onChange={(e) => updateField('embedAuthorIcon', e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
            placeholder="https://example.com/icon.png"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Author URL</label>
        <input
          type="url"
          value={formData.embedAuthorUrl}
          onChange={(e) => updateField('embedAuthorUrl', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Embed Image URL</label>
        <input
          type="url"
          value={formData.embedImage}
          onChange={(e) => updateField('embedImage', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="https://example.com/image.png"
        />
      </div>
    </div>
  );
}

function StepDetails({ formData, updateField }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Panel Title</label>
        <input
          type="text"
          value={formData.panelTitle}
          onChange={(e) => updateField('panelTitle', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20"
          placeholder="e.g. Self Roles, Game Roles"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">Panel Description</label>
        <textarea
          value={formData.panelDescription}
          onChange={(e) => updateField('panelDescription', e.target.value)}
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 resize-none h-24"
          placeholder="Description shown in the panel embed..."
        />
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
        <h3 className="font-bold text-white">Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-white/40">Mode:</span>
            <span className="text-white ml-2 capitalize">{formData.mode}</span>
          </div>
          <div>
            <span className="text-white/40">Max/User:</span>
            <span className="text-white ml-2">{formData.maxPerUser || 'Unlimited'}</span>
          </div>
          <div>
            <span className="text-white/40">Exclusive:</span>
            <span className="text-white ml-2">{formData.exclusive ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ formData }) {
  const modeIcons = { buttons: '🔘', dropdown: '📋', reactions: '💬' };
  const modeNames = { buttons: 'Buttons', dropdown: 'Dropdown', reactions: 'Reactions' };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">Preview how your panel will look in Discord:</p>

      {/* Mock Embed Preview */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div
          className="p-4"
          style={{ backgroundColor: formData.embedColor || '#6366F1', borderLeft: `4px solid ${formData.embedColor || '#6366F1'}` }}
        >
          {formData.embedTitle && (
            <h3 className="font-bold text-white text-lg">{formData.embedTitle}</h3>
          )}
          {!formData.embedTitle && (
            <h3 className="font-bold text-white text-lg">🎭 Role Panel {formData.panelTitle ? `— ${formData.panelTitle}` : ''}</h3>
          )}
          <p className="text-white/80 text-sm mt-1">
            {formData.embedDescription || formData.panelDescription || '*React or press a button to toggle roles*'}
          </p>
        </div>
        <div className="p-4 bg-[#313338]">
          <div className="text-xs text-white/60 mb-2">
            Options (0/25) • {modeIcons[formData.mode]} {modeNames[formData.mode]}
          </div>
          <div className="text-sm text-gray-400 italic">No items yet. Add items with the panel editor.</div>

          {formData.embedFooter && (
            <div className="mt-3 text-xs text-white/40">{formData.embedFooter}</div>
          )}
          {!formData.embedFooter && (
            <div className="mt-3 text-xs text-white/40">MULTi-Bot • ID 1</div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <h3 className="font-bold text-white mb-2">Configuration</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Mode</span>
            <span className="text-white capitalize">{formData.mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Max per user</span>
            <span className="text-white">{formData.maxPerUser || 'Unlimited'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Exclusive</span>
            <span className="text-white">{formData.exclusive ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}