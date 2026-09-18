'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function LucentSwitch({ compact = false }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem('uranium-theme');
    const isLucent = saved !== 'midnight';
    setEnabled(isLucent);
    document.documentElement.dataset.theme = isLucent ? 'lucent' : 'midnight';
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    document.documentElement.dataset.theme = next ? 'lucent' : 'midnight';
    window.localStorage.setItem('uranium-theme', next ? 'lucent' : 'midnight');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={"lucent-switch " + (enabled ? 'is-on ' : '') + (compact ? 'lucent-switch-compact' : '')}
      aria-pressed={enabled}
      aria-label="Toggle Lucent theme"
    >
      <span className="lucent-switch-orb"><Sparkles size={compact ? 13 : 15} /></span>
      {!compact && <span>Lucent</span>}
      <span className="lucent-switch-track"><span /></span>
    </button>
  );
}
