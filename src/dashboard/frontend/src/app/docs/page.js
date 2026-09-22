'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Shield,
  Music,
  Gift,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ChevronRight,
  Terminal,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Crown
} from 'lucide-react';

const DOCS_SECTIONS = [
  {
    id: 'getting-started',
    category: 'Getting Started',
    icon: Zap,
    items: [
      {
        id: 'intro',
        title: 'Introduction to Uranium',
        description: 'Learn about Uranium, its capabilities, and why Discord communities rely on it.',
        content: `
**Uranium** is a high-performance, all-in-one Discord bot engineered for modern communities, gaming squads, and content creators. It combines lossless 320kbps audio streaming, zero-latency AutoMod security, self-assignable reaction roles, and fully customizable giveaways into a unified experience.

### Why Choose Uranium?
- **All-in-One Powerhouse**: Replace 4+ separate bots with one reliable, zero-latency solution.
- **Generous Free Core & Premium Perks**: Core audio, AutoMod, and reaction roles are free to use, with expanded limits and advanced AI systems unlocked with Premium.
- **Enterprise-Grade Uptime**: Hosted on multi-cluster infrastructure with 99.98% reliability.
- **Live Two-Way Dashboard Sync**: Manage your server from Discord slash commands or the web dashboard with real-time synchronization.

### Recommended Next Steps:
1. [Invite Uranium to your server](#invite-bot) with Administrator or Manage Channels permissions.
2. Configure your [AutoMod & Anti-Raid Defense](#automod).
3. Set up a dedicated [Music Channel](#music-streaming).
4. Launch your first [Custom Giveaway](#giveaways-guide).
`
      },
      {
        id: 'invite-bot',
        title: 'Inviting Uranium & Permissions',
        description: 'How to add Uranium to your Discord server and set up the correct role hierarchy.',
        content: `
Adding Uranium to your server takes under 30 seconds. Follow this guide to ensure all permissions and role hierarchies are configured correctly.

### Step 1: Authorize the Bot
Click the link below to invite Uranium via the official Discord OAuth2 authorization URL:
- [Add Uranium to Discord](https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands)

### Step 2: Role Hierarchy Placement
For moderation commands (ban, kick, timeout) and reaction roles to function correctly:
1. Open **Server Settings** > **Roles**.
2. Drag the **Uranium** bot role **above** any roles you want the bot to manage or moderate.
3. Ensure Uranium has **Manage Roles**, **Manage Channels**, and **Send Messages** enabled.

> [!IMPORTANT]
> Discord security rules prevent bots from managing members or roles placed higher than the bot's own highest role. Always place the Uranium bot role above member roles!
`
      }
    ]
  },
  {
    id: 'music-audio',
    category: 'Music & Audio Engine',
    icon: Music,
    items: [
      {
        id: 'music-streaming',
        title: 'Lossless Audio & Commands',
        description: 'Stream lossless 320kbps music from YouTube, Spotify, and SoundCloud with zero lag.',
        content: `
Uranium utilizes a high-performance audio engine to deliver lossless 320kbps audio with zero stutter and minimal latency.

### Core Music Commands
| Command | Description | Example |
| :--- | :--- | :--- |
| \`/play <query>\` | Search and play a track or playlist URL | \`/play lofi hip hop\` |
| \`/pause\` | Pause the currently playing song | \`/pause\` |
| \`/resume\` | Resume playback | \`/resume\` |
| \`/skip\` | Vote or instantly skip the active track | \`/skip\` |
| \`/previous\` | Jump back to the previously played song | \`/previous\` |
| \`/stop\` | Stop music, clear queue, and leave voice | \`/stop\` |
| \`/queue\` | View upcoming tracks in the server queue | \`/queue\` |
| \`/volume <1-100>\` | Adjust master playback volume | \`/volume 75\` |

### Supported Audio Sources
- **Spotify**: Tracks, Albums, Playlists
- **SoundCloud**: Tracks, Artist Playlists
- **Direct Web Streams**: Lossless audio streams and internet radio stations
`
      },
      {
        id: 'audio-filters',
        title: 'DSP Filters (BassBoost, 8D, Nightcore)',
        description: 'Apply studio-grade digital signal processing filters to any audio stream in real-time.',
        content: `
Transform your listening experience with real-time audio filters that can be toggled on the fly.

### Available Audio Filters
- **Bass Boost**: Amplifies low-end frequencies (+12dB) with zero distortion.
- **Nightcore**: Increases playback speed and pitch for an energetic feel.
- **8D Audio**: Simulates rotational binaural 360° surround audio across stereo channels.
- **Vaporwave**: Slows down tempo and deepens pitch for relaxed, nostalgic vibes.
- **Karaoke**: Filters out center-channel vocals for sing-along sessions.

### How to Toggle Filters
You can apply filters via slash command:
\`\`\`bash
/filter set type:bassboost
/filter clear
\`\`\`
Or use the interactive buttons on the Discord player embed and the web dashboard!
`
      }
    ]
  },
  {
    id: 'security-defense',
    category: 'Moderation & AutoMod',
    icon: Shield,
    items: [
      {
        id: 'automod',
        title: 'Intelligent AutoMod Engine',
        description: 'Protect your community against spam, discord invite leaks, mass mentions, and toxic words.',
        content: `
Uranium features a comprehensive zero-delay moderation defense system that operates 24/7 without requiring manual staff intervention.

### AutoMod Protection Modules
1. **Anti-Spam**: Flags and mutes accounts sending more than 5 messages per 3 seconds.
2. **Anti-Invite**: Automatically deletes unauthorized Discord server invites (\`discord.gg/...\`).
3. **Mass Mention Protection**: Restricts mentions to a maximum of 4 per message to stop mention raids.
4. **Banned Words & Regex Filter**: Custom dictionary of prohibited phrases that are immediately purged.
5. **Whitelist System**: Safelist trusted roles (e.g. \`@Moderator\`, \`@VIP\`) and channels from AutoMod inspection.

### Moderation Slash Commands
\`\`\`bash
/mute <@user> <duration> [reason]    # Timeout a member
/unmute <@user>                      # Remove timeout
/ban <@user> [reason]                # Permanently ban a rulebreaker
/unban <user_id>                     # Unban a user
/clear <amount>                      # Bulk delete up to 100 messages
/clear-roles <@user>                 # Strip all assigned roles from a member
\`\`\`
`
      }
    ]
  },
  {
    id: 'reaction-roles',
    category: 'Reaction Roles',
    icon: Sliders,
    items: [
      {
        id: 'reaction-roles-setup',
        title: 'Reaction Roles & Self-Assignment',
        description: 'Set up self-assignable role menus with buttons, dropdowns, and live activity tracking.',
        content: `
Allow members to self-assign notification, gaming, and color roles using modern Discord interactive buttons and dropdown menus.

### Key Features
- **Button Menus**: Fast, mobile-friendly buttons with custom emojis and labels.
- **Dropdown Menus**: Compact single or multi-select dropdowns for servers with dozens of roles.
- **Item Reordering**: Move role items up or down directly in the dashboard.
- **24-Hour Analytics**: Track member engagement and popular role claims over time.

### How to Create a Menu
1. Open the [Uranium Dashboard](/dashboard/rr).
2. Select your server and click **+ Create Menu**.
3. Choose the target channel, message title, and embed color.
4. Add roles with custom emojis and labels.
5. Click **Publish Menu** — Uranium will immediately post the interactive role panel into Discord!
`
      }
    ]
  },
  {
    id: 'giveaways',
    category: 'Giveaways System',
    icon: Gift,
    items: [
      {
        id: 'giveaways-guide',
        title: 'Custom Giveaways & Role Gating',
        description: 'Launch professional giveaways with custom embed colors, banners, role gating, and live counters.',
        content: `
Uranium giveaway system is built for high community engagement with total visual customization.

### Customization Capabilities
- **Role Gating**: Restrict entry to specific Discord roles (e.g. \`@Booster\`, \`@Subscriber\`). Members without the required role receive an informative alert.
- **Live Discord Button Counters**: Interactive buttons display real-time entry counts (e.g. \`🎉 Enter (48)\`).
- **Visual Branding**: Custom accent colors, thumbnail icons, and banner images.
- **Winner Announcements**: Automatic random winner selection with winner mentions and direct jump links back to the giveaway post.
- **Reroll System**: Instantly draw new winners with one click from Discord or the Dashboard.

### Discord Command Usage
\`\`\`bash
/giveaway start duration:1d winners:1 prize:Discord Nitro channel:#giveaways
/giveaway end message_id:123456789
/giveaway reroll message_id:123456789
/giveaway list
\`\`\`
`
      }
    ]
  },
  {
    id: 'premium-perks',
    category: 'Premium & Perks',
    icon: Crown,
    items: [
      {
        id: 'premium-overview',
        title: 'Premium Features & Upgrades',
        description: 'Discover all exclusive features, expanded limits, and perks unlocked with Uranium Premium.',
        content: `
Uranium provides powerful core functionality for any community, alongside an optional **Premium Tier** designed for large communities, gaming hubs, and creator servers that need expanded limits and advanced tools.

### 🔥 Current Premium Perks & Features
- **🤖 Full AI Engine**: Interactive chat, custom persona styling, and server assistant with \`/ai chat\` and \`/ai setup\`.
- **✨ YouTube Verification**: Automate role granting for verified YouTube channel subscribers with \`/ytverify\`.
- **🗃️ Expanded Server Backups**: Unlock +2 extra backup slots, instant restores, and a 24-hour reduced cooldown.
- **🎨 Embed Template Vault**: Save and load up to 20 custom embed templates (Free limit: 3).
- **🎫 Multi-Panel Ticket Systems**: Create multiple custom ticket reaction/button panels across different departments.
- **🚀 Priority Processing**: Accelerated queue processing and priority customer support.

### Managing Your Premium Subscription
You can view, redeem, and manage your server's premium status directly on Discord:
| Command | Action |
| :--- | :--- |
| \`/premium status\` | View active premium status and expiration date |
| \`/premium redeem <code>\` | Activate a premium code for the current server |
| \`/premium buy\` | Access our official store and purchase links |
| \`/premium support\` | Connect with dedicated premium support staff |

> [!IMPORTANT]
> To purchase or inquire about Premium for your server, visit our official [Support & Premium Portal](https://discord.gg/26ThFyckFX).
`
      }
    ]
  }
];

// Helper: render inline markdown (bold, code, links, italic)
function renderInline(text, onSelectSection) {
  if (!text) return null;
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded-md bg-white/10 text-rose-300 font-mono text-xs border border-white/10">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith('#') && onSelectSection) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelectSection(href.slice(1))}
            className="text-rose-400 hover:text-rose-300 underline font-semibold transition cursor-pointer"
          >
            {label}
          </button>
        );
      }
      return (
        <a
          key={index}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-rose-400 hover:text-rose-300 underline font-semibold transition inline-flex items-center gap-1"
        >
          {label}
          {href.startsWith('http') && <ExternalLink size={11} className="inline opacity-70" />}
        </a>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-white/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

// Full Markdown Component Parser
function MarkdownViewer({ content, onSelectSection, onCopyCode, copiedId }) {
  if (!content) return null;

  const lines = content.trim().split('\n');
  const elements = [];
  let i = 0;
  let elementIndex = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      i++;
      continue;
    }

    // Code block: ```
    if (line.startsWith('```')) {
      const lang = line.replace('```', '').trim() || 'bash';
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');
      const blockId = elementIndex++;
      elements.push(
        <div key={blockId} className="relative rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-xs text-rose-300 my-4 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-white/40 uppercase tracking-widest font-sans font-bold">
            <span>{lang}</span>
            <button
              onClick={() => onCopyCode(fullCode, blockId)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
            >
              {copiedId === blockId ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto leading-relaxed">{fullCode}</pre>
        </div>
      );
      continue;
    }

    // Table: starts with |
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r) => r.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        // line 1 is separator | :--- | :--- |
        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={elementIndex++} className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-black/40 shadow-inner">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-bold text-white uppercase tracking-wider">
                      {renderInline(h, onSelectSection)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-white/80">
                        {renderInline(cell, onSelectSection)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Callout alert: > [!IMPORTANT] or >
    if (line.startsWith('>')) {
      const alertLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        alertLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      const rawText = alertLines.join(' ').replace('[!IMPORTANT]', '').trim();
      elements.push(
        <div key={elementIndex++} className="my-5 flex items-start gap-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {renderInline(rawText, onSelectSection)}
          </div>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={elementIndex++} className="text-base font-bold text-white mt-7 mb-2 border-b border-white/5 pb-2">
          {renderInline(line.replace('### ', ''), onSelectSection)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={elementIndex++} className="text-lg font-extrabold text-white mt-8 mb-3">
          {renderInline(line.replace('## ', ''), onSelectSection)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      // Top level header: suppress if redundant with page header, or render cleanly
      i++;
      continue;
    }

    // Unordered list: starts with - or *
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={elementIndex++} className="my-3 space-y-2 pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0 mt-2" />
              <div className="flex-1">{renderInline(item, onSelectSection)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list: starts with digit.
    if (/^\d+\.\s/.test(line)) {
      const orderedItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        orderedItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={elementIndex++} className="my-4 space-y-2.5 pl-1">
          {orderedItems.map((item, oIdx) => (
            <li key={oIdx} className="flex items-start gap-3 text-sm text-white/80 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-rose-300">
                {oIdx + 1}
              </span>
              <div className="flex-1">{renderInline(item, onSelectSection)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph
    elements.push(
      <p key={elementIndex++} className="text-sm text-white/75 leading-relaxed my-3">
        {renderInline(line, onSelectSection)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

export default function DocsPage() {
  const [selectedSection, setSelectedSection] = useState('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Flatten items for easy searching
  const allItems = useMemo(() => {
    const list = [];
    DOCS_SECTIONS.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({ ...item, category: cat.category, catId: cat.id });
      });
    });
    return list;
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_SECTIONS;
    const q = searchQuery.toLowerCase();
    return DOCS_SECTIONS.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.content.toLowerCase().includes(q)
      )
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const currentItem = useMemo(() => {
    return allItems.find((it) => it.id === selectedSection) || allItems[0];
  }, [allItems, selectedSection]);

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white selection:bg-rose-500/30 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f17]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition">
                <Zap size={17} fill="currentColor" />
              </span>
              <span className="text-base font-extrabold text-white tracking-tight flex items-center">
                Uranium <span className="text-xs font-bold text-rose-400 tracking-wide ml-1.5">/ Docs</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-white/60">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <Link href="/commands" className="hover:text-white transition">Commands</Link>
              <Link href="/servers" className="hover:text-white transition">Dashboard</Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-xs font-bold text-white flex items-center gap-2 hover:brightness-110 transition shadow-md shadow-rose-500/20"
            >
              <span>Add to Discord</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* Docs Body Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Left Sidebar Navigation */}
          <aside className="sticky top-24 space-y-6">
            {/* Search Box */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            {/* Navigation List */}
            <nav className="space-y-6">
              {filteredSections.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rose-400/90 ml-1">
                      <Icon size={14} />
                      <span>{cat.category}</span>
                    </div>
                    <div className="space-y-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSection(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            selectedSection === item.id
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                              : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {selectedSection === item.id && (
                            <ChevronRight size={13} className="text-rose-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Support Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-rose-400" /> Need Support?
              </span>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Join the official Uranium Community Discord server for 24/7 technical support.
              </p>
              <a
                href="https://discord.gg/26ThFyckFX"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition"
              >
                Join Support Server
              </a>
            </div>
          </aside>

          {/* Main Article Content */}
          <main className="rounded-3xl border border-white/10 bg-[#12141f] p-6 sm:p-10 shadow-2xl space-y-6 min-h-[75vh]">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-white/40">
              <Link href="/docs" className="hover:text-white transition">Docs</Link>
              <span>/</span>
              <span className="text-rose-400 font-semibold">{currentItem.category}</span>
              <span>/</span>
              <span className="text-white/80">{currentItem.title}</span>
            </div>

            {/* Header */}
            <div className="space-y-2 border-b border-white/10 pb-6">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {currentItem.title}
              </h1>
              <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
                {currentItem.description}
              </p>
            </div>

            {/* Article Markdown Body with Full Bold, Link, List, Table Support */}
            <div className="text-sm leading-relaxed text-white/80">
              <MarkdownViewer
                content={currentItem.content}
                onSelectSection={setSelectedSection}
                onCopyCode={handleCopyCode}
                copiedId={copiedId}
              />
            </div>

            {/* Bottom Footer Navigation */}
            <div className="pt-8 border-t border-white/10 flex items-center justify-between gap-4">
              <Link
                href="/commands"
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition"
              >
                <Terminal size={14} className="text-rose-400" />
                <span>View All Slash Commands</span>
              </Link>
              <a
                href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-rose-500/20 hover:brightness-110 transition flex items-center gap-2"
              >
                <span>Invite Uranium</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
