const mongoose = require('mongoose');
const { mongoURI, useMongoDB } = require('../config/database');

// Define all Mongoose Schemas here to mirror the SQLite tables

// 1. AFK Schema (from afk_records, afk_guild_config, afk_ignored_channels)
const AFKSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  reason: { type: String, default: null },
  startTimestamp: { type: Number, required: true },
  hideStatus: { type: Boolean, default: false },
  lastNotifiedJson: { type: String, default: '{}' },
  notifiedCount: { type: Number, default: 0 }
});
AFKSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const AFKGuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  cooldownSeconds: { type: Number, default: 30 }
});

const AFKIgnoredChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }
});
AFKIgnoredChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });


// 2. Automod Schema (from automod_settings, automod_ignored_roles, automod_ignored_channels)
const AutomodSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  settings: { type: String, required: true }
});

const AutomodIgnoredSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  targetId: { type: String, required: true },
  type: { type: String, enum: ['role', 'channel'], required: true }
});
AutomodIgnoredSchema.index({ guildId: 1, targetId: 1 }, { unique: true });


// 3. Autoresponse Schema (from autoresponses)
const AutoresponseSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  trigger: { type: String, required: true },
  response: { type: String, required: true },
  embed: { type: Boolean, default: false },
  matchMode: { type: String, default: 'exact' } // 'exact' or 'contains'
});
AutoresponseSchema.index({ guildId: 1, trigger: 1 }, { unique: true });


// 4. Backup Schema (from backups)
const BackupSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  slot: { type: Number, required: true },
  name: { type: String, required: true },
  createdAt: { type: Number, required: true },
  createdBy: { type: String, required: true },
  isPremium: { type: Boolean, required: true },
  data: { type: String, required: true }
});
BackupSchema.index({ guildId: 1, slot: 1 }, { unique: true });

const BackupCooldownSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  lastCreatedAt: { type: Number, required: true }
});


// 5. Birthday Schema (from birthdays, birthday_config)
const BirthdaySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  year: { type: Number, default: null },
  month: { type: Number, required: true },
  day: { type: Number, required: true },
  note: { type: String, default: null },
  createdAt: { type: Number, required: true }
});
BirthdaySchema.index({ guildId: 1, userId: 1 }, { unique: true });

const BirthdayConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageText: { type: String, default: "Happy Birthday {user}!" },
  pingRole: { type: String, default: null }
});


// 6. Economy Schema (from eco_users, eco_guilds, eco_items, eco_inventory, eco_cooldowns)
const EcoUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  createdAt: { type: Number },
  updatedAt: { type: Number }
});

const EcoStatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, default: 0 }
});
EcoStatSchema.index({ userId: 1, key: 1 }, { unique: true });

const EcoInventorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  itemId: { type: String, required: true },
  quantity: { type: Number, default: 0 }
});
EcoInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });

const EcoCooldownSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  key: { type: String, required: true },
  lastUsed: { type: Number, required: true }
});
EcoCooldownSchema.index({ userId: 1, key: 1 }, { unique: true });

const EcoCosmeticSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  title: { type: String, default: null },
  badge: { type: String, default: null },
  frame: { type: String, default: null },
  color: { type: String, default: null }
});

const EcoMetaSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});

const EcoItemInstanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  instanceId: { type: String, required: true, unique: true },
  itemId: { type: String, required: true },
  durability: { type: Number, default: null },
  maxDurability: { type: Number, default: null },
  equippedSlot: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now }
});
EcoItemInstanceSchema.index({ userId: 1, itemId: 1 });
EcoItemInstanceSchema.index({ userId: 1, equippedSlot: 1 });

const EcoEffectSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  effectId: { type: String, required: true, unique: true },
  key: { type: String, required: true },
  itemId: { type: String, default: null },
  sourceType: { type: String, default: 'item' },
  expiresAt: { type: Number, default: null },
  usesRemaining: { type: Number, default: null },
  stacks: { type: Number, default: 1 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now }
});
EcoEffectSchema.index({ userId: 1, key: 1 });
EcoEffectSchema.index({ userId: 1, expiresAt: 1 });

const EcoLoadoutSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  slot: { type: String, required: true },
  itemId: { type: String, required: true },
  instanceId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Number, default: Date.now }
});
EcoLoadoutSchema.index({ userId: 1, slot: 1 }, { unique: true });

const EcoQuestStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  activeIds: { type: [String], default: [] },
  claimedIds: { type: [String], default: [] },
  lastRefresh: { type: Number, default: 0 },
  updatedAt: { type: Number, default: Date.now }
});


// 7. Embed Templates Schema (from embed_templates)
const EmbedTemplateSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  dataJson: { type: String, required: true }
});
EmbedTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });


// 8. Giveaway Schema (from giveaways)
const GiveawaySchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  prize: { type: String, required: true },
  winners: { type: Number, required: true },
  endAt: { type: Number, required: true },
  createdBy: { type: String, required: true },
  ended: { type: Boolean, default: false },
  participants: { type: String, default: '[]' },
  config: { type: String, default: '{}' }
});


// 9. Join/Ping/Ghost Storage Schemas (from joinping_config, ghost_config)
const JoinPingConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  createdAt: { type: Number, required: true }
});
JoinPingConfigSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

const GhostConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  action: { type: String, default: 'notify' },
  timeoutSeconds: { type: Number, default: 300 }
});

const GhostCountSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  count: { type: Number, default: 0 }
});
GhostCountSchema.index({ guildId: 1, userId: 1 }, { unique: true });


// 10. JTC (Join to Create) Schema (from jtc_config, jtc_sessions)
const JTCConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  hubId: { type: String, required: true },
  categoryId: { type: String, required: true }
});

const ModScheduledSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  caseId: { type: String, default: null }
});

const ModRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true }
});
ModRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

const ModSettingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannel: { type: String, default: null },
  mutedRole: { type: String, default: null }
});

const JTCSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ownerId: { type: String, required: true },
  voiceId: { type: String, required: true },
  textId: { type: String, default: null }
});
JTCSessionSchema.index({ voiceId: 1 }, { unique: true });


// 11. Mod Storage (from cases, warnings)
const ModCaseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  targetId: { type: String, required: true },
  action: { type: String, required: true },
  reason: { type: String, required: true },
  duration: { type: Number, default: 0 },
  timestamp: { type: Number, required: true },
  evidence: { type: mongoose.Schema.Types.Mixed, default: '[]' },
  references_list: { type: mongoose.Schema.Types.Mixed, default: '[]' }
});

const WarningSchema = new mongoose.Schema({
  warnId: { type: String, required: true, unique: true }, // custom nanoId or similar
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Number, required: true }
});


// 12. Ranking (from rank_users, rank_config)
const RankUserSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  bgUrl: { type: String, default: null },
  cardColor: { type: String, default: null }
});
RankUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const RankConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  multiplier: { type: Number, default: 1 }
});


// 13. Reaction Roles (rrdb) (from rr_panels, rr_roles, rr_logs)
const RRSetupSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() }, // mapping from SQLite ID
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  mode: { type: String, default: 'reactions' },
  title: { type: String, default: null },
  description: { type: String, default: null },
  creatorId: { type: String, default: null },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
  active: { type: Boolean, default: true },
  config: {
    maxPerUser: { type: Number, default: 0 },
    exclusiveGroups: { type: Map, of: [String] },
    requiredRoles: { type: Map, of: [String] },
    blockedRoles: { type: [String], default: [] },
    cooldownSeconds: { type: Number, default: 0 },
    allowMultiple: { type: Boolean, default: true },
    // Embed customization
    color: { type: Number, default: null },
    customTitle: { type: String, default: null },
    customDescription: { type: String, default: null },
    footerText: { type: String, default: null },
    thumbnail: { type: String, default: null },
    authorName: { type: String, default: null },
    authorIcon: { type: String, default: null },
    authorUrl: { type: String, default: null },
    image: { type: String, default: null }
  }
});

const RRItemSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  setupId: { type: String, required: true },
  emoji: { type: String, required: true },
  emojiIdentifier: { type: String, required: true },
  label: { type: String, default: null },
  roleId: { type: String, required: true },
  position: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
  description: { type: String, default: null },
  style: { type: Number, default: 0 }, // 0=primary, 1=secondary, 2=success, 3=danger
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

const RRLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  setupId: { type: String, required: true },
  action: { type: String, required: true }, // 'grant' | 'revoke' | 'fail' | 'blocked' | 'limit_reached'
  ts: { type: Number, required: true },
  error: { type: String, default: null },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});
RRLogSchema.index({ guildId: 1, ts: -1 });
RRLogSchema.index({ setupId: 1, ts: -1 });
RRLogSchema.index({ userId: 1, guildId: 1 });


// 14. Social / Reputation (from rep_users, rep_logs)
const SocialUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  rep: { type: Number, default: 0 }
});
SocialUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const SocialLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  giverId: { type: String, required: true },
  receiverId: { type: String, required: true },
  timestamp: { type: Number, required: true }
});


// 15. Sticky Storage (from sticky_messages)
const StickySchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() }, // From SQLite id
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'text' },
  embedFlag: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  lastMessageId: { type: String, default: null },
  createdBy: { type: String, default: null },
  createdAt: { type: Number, default: Date.now },
  priority: { type: Number, default: 0 }
});


// 16. Ticket Storage (from ticket_panels, ticket_categories, tickets)
const TicketPanelSchema = new mongoose.Schema({
  panelId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  name: { type: String, required: true },
  premiumOnly: { type: Boolean, default: false },
  types: { type: [String], default: [] }
});

const TicketCategorySchema = new mongoose.Schema({
  panelId: { type: String, required: true },
  name: { type: String, required: true },
  emoji: { type: String, default: null },
  desc: { type: String, default: null }
});

const TicketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ticketId: { type: Number, required: true },
  openerId: { type: String, required: true },
  channelId: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true, default: 'open' },
  claimUserId: { type: String, default: null },
  createdAt: { type: Number, required: true },
  closedAt: { type: Number, default: null },
  description: { type: String, default: null },
  formResponses: { type: String, default: null }
});
TicketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });

const TicketMemberSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ticketId: { type: Number, required: true },
  userId: { type: String, required: true }
});
TicketMemberSchema.index({ guildId: 1, ticketId: 1, userId: 1 }, { unique: true });

const TicketCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  nextId: { type: Number, default: 1 }
});

const RRCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  nextId: { type: Number, default: 1 }
});


// 22. Verification (from verification.db)
const VerificationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  roleId: { type: String, default: null },
  unverifiedRoleId: { type: String, default: null },
  logChannelId: { type: String, default: null },
  embedTitle: { type: String, default: 'Verify Yourself' },
  embedMessage: { type: String, default: 'Click the button below to verify yourself and gain access to the server.' },
  embedColor: { type: String, default: '#10b981' },
  embedImage: { type: String, default: null },
  embedFooter: { type: String, default: 'Uranium Security Verification' },
  type: { type: String, default: 'button' },
  buttonLabel: { type: String, default: 'Verify' },
  buttonStyle: { type: String, default: 'Success' },
  buttonEmoji: { type: String, default: '✅' },
  sendDm: { type: Boolean, default: false },
  dmMessage: { type: String, default: 'You have been successfully verified in **{server}**!' },
  enabled: { type: Boolean, default: true },
  dataJson: { type: String, default: '{}' }
});

const VerifiedUserSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  verifiedAt: { type: String, required: true }
});
VerifiedUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const OtpCodeSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Number, required: true }
});
OtpCodeSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// 23. Welcome / Leave Configurations (from welcome.db)
const WelcomeConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageJson: { type: String, default: '{}' },
  enabled: { type: Boolean, default: false },
  dataJson: { type: String, default: '{}' }
});

const LeaveConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  messageJson: { type: String, default: '{}' },
  enabled: { type: Boolean, default: false },
  dataJson: { type: String, default: '{}' }
});


// 20. Antinuke Schema (from antinuke_config, action_limits)
const AntinukeConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  punishment: { type: String, default: 'ban' },
  actionLimit: { type: Number, default: 5 },
  autoRecovery: { type: Boolean, default: true },
  logChannel: { type: String, default: null }
});

const AntiNukeWhitelistSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true }
});
AntiNukeWhitelistSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const AntiNukeLimitSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  actionType: { type: String, required: true },
  limitCount: { type: Number, default: 0 },
  timeWindow: { type: Number, default: 0 }
});
AntiNukeLimitSchema.index({ guildId: 1, actionType: 1 }, { unique: true });

// 2. Automod Schema
const AutoModRuleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ruleType: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  actions: { type: [String], default: [] },
  exemptRoles: { type: [String], default: [] },
  exemptChannels: { type: [String], default: [] },
  settings: { type: Object, default: {} }
});
AutoModRuleSchema.index({ guildId: 1, ruleType: 1 }, { unique: true });

const AutoModLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  ruleType: { type: String, required: true },
  actionTaken: { type: String, required: true },
  reason: { type: String, default: null },
  timestamp: { type: Number, default: Date.now }
});

const AutoRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  targetType: { type: String, default: 'all' },
  delay: { type: Number, default: 0 }
});
AutoRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

// Mod Storage
const ModConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String, default: null },
  modRoleIds: { type: [String], default: [] },
  adminRoleIds: { type: [String], default: [] }
});

const ActiveMuteSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  caseId: { type: String, default: null }
});
ActiveMuteSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Ranking Role Reward
const RankRoleRewardSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  level: { type: Number, required: true },
  roleId: { type: String, required: true }
});
RankRoleRewardSchema.index({ guildId: 1, level: 1 }, { unique: true });

// Reaction Roles schemas are defined earlier (line ~266) to avoid circular dependencies

// Sticky Config
const StickyConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  repostDelaySeconds: { type: Number, default: 0 },
  autoPinOnCreate: { type: Boolean, default: false },
  webhookName: { type: String, default: 'Sticky Message' }
});

// Ticket Config
const TicketConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  setupChannelId: { type: String, default: null },
  transcriptChannelId: { type: String, default: null },
  openCategoryId: { type: String, default: null },
  closedCategoryId: { type: String, default: null },
  archiveCategoryId: { type: String, default: null },
  supportRoleId: { type: String, default: null }
});

// 21. AI Schema
const AIChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }
});
AIChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

const AIStatsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prompts: { type: Number, default: 0 },
  images: { type: Number, default: 0 }
});

const AISettingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  model: { type: String, default: 'mixtral' },
  style: { type: String, default: 'default' },
  autoReply: { type: Boolean, default: true }
});

// 19. YouTube Verify (from yt_verify)
const YTVerifySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  roleId: { type: String, required: true },
  youtubeId: { type: String, required: true },
  logChannelId: { type: String, default: null }
});
YTVerifySchema.index({ guildId: 1, channelId: 1 }, { unique: true });

// 22. Log Storage (from log_config)
const LogConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  logChannel: { type: String, default: null },
  webhookId: { type: String, default: null },
  webhookToken: { type: String, default: null }
});

const LogEventSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  eventName: { type: String, required: true },
  enabled: { type: Boolean, default: true }
});
LogEventSchema.index({ guildId: 1, eventName: 1 }, { unique: true });

const LogIgnoredChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }
});
LogIgnoredChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });


// 23. Family Storage
const FamilyUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  allowRequests: { type: Boolean, default: true },
  createdAt: { type: Number, required: true }
});

const FamilyPartnerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  partnerId: { type: String, required: true },
  createdAt: { type: Number, required: true }
});

const FamilyParentChildSchema = new mongoose.Schema({
  parentId: { type: String, required: true },
  childId: { type: String, required: true },
  createdAt: { type: Number, required: true }
});

const FamilyPendingSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'marry' or 'adopt'
  requesterId: { type: String, required: true },
  targetId: { type: String, required: true },
  note: { type: String, default: null },
  createdAt: { type: Number, required: true }
});

// 24. Social Notifications Schema (from social_notifications.db)
const SocialConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  platform: { type: String, required: true }, // e.g. youtube, twitch
  source: { type: String, required: true },   // e.g. channel ID or handle
  notifyChannelId: { type: String, required: true },
  message: { type: String, default: null },
  lastPost: { type: String, default: null },
  cooldown: { type: Number, default: 0 }
});
SocialConfigSchema.index({ guildId: 1, platform: 1, source: 1 }, { unique: true });



const MusicHistorySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  trackId: { type: String, required: true },
  title: { type: String, required: true },
  uri: { type: String, default: null },
  duration: { type: Number, default: 0 },
  playedAt: { type: Number, required: true }
});
MusicHistorySchema.index({ guildId: 1, playedAt: -1 });
MusicHistorySchema.index({ guildId: 1, userId: 1, playedAt: -1 });

const logger = require('../utils/logger');

// Setup DB connection
let isConnected = false;
async function connectToMongo() {
  if (!useMongoDB) return;
  if (isConnected) return;

  try {
    const timeoutMs = parseInt(process.env.MONGODB_TIMEOUT_MS) || 15000;
    logger.info('[Database] Connecting to MongoDB...');
    const connectOptions = {
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
      socketTimeoutMS: 45000
    };
    if (process.env.MONGODB_FORCE_IPV4 === 'true') {
      connectOptions.family = 4;
    }
    await mongoose.connect(mongoURI, connectOptions);
    isConnected = true;
    logger.info('[Database] Successfully connected to MongoDB.');
  } catch (err) {
    const isDnsError = err.message.includes('ENOTFOUND') || err.message.includes('querySrv');
    logger.error('[Database] Failed to connect to MongoDB: %s', err.message);
    if (isDnsError) {
      logger.error('💡 HINT: This is a DNS error. Please ensure your host machine can resolve the MongoDB Atlas address.');
      logger.error('   If you are on a VPS/network with custom DNS, try setting your DNS servers to 8.8.8.8 or 1.1.1.1.');
    } else if (err.message.includes('Server selection timed out')) {
      logger.error('💡 HINT: Connection timed out. This usually means:');
      logger.error('   1. Your current IP is not whitelisted in MongoDB Atlas under "Network Access" (add 0.0.0.0/0 to allow all IPs).');
      logger.error('   2. Network latency to MongoDB Atlas exceeded the timeout threshold.');
      if (mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1')) {
        logger.error('   3. Connecting to localhost:27017 failed because the local MongoDB service is not running.');
      }
    } else if (err.message.includes('Authentication failed') || err.message.includes('bad auth')) {
      logger.error('💡 HINT: MongoDB authentication failed. Please verify the username and password in your MONGODB_URI.');
    }
  }

  mongoose.connection.on('error', err => {
    logger.error('[Database] MongoDB runtime error: %s', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ [DATABASE] MongoDB reconnected.');
    isConnected = true;
  });
}

function getDbStatus() {
  return mongoose.connection.readyState === 1;
}

// Export models incrementally to avoid circular dependency issues
exports.connectToMongo = connectToMongo;
exports.getDbStatus = getDbStatus;
exports.AFKUser = mongoose.model('AFKUser', AFKSchema);
exports.AFKGuildConfig = mongoose.model('AFKGuildConfig', AFKGuildConfigSchema);
exports.AFKIgnoredChannel = mongoose.model('AFKIgnoredChannel', AFKIgnoredChannelSchema);
exports.AntiNukeConfig = mongoose.model('AntiNukeConfig', AntinukeConfigSchema);
exports.AntiNukeWhitelist = mongoose.model('AntiNukeWhitelist', AntiNukeWhitelistSchema);
exports.AntiNukeLimit = mongoose.model('AntiNukeLimit', AntiNukeLimitSchema);
exports.AutoModRule = mongoose.model('AutoModRule', AutoModRuleSchema);
exports.AutoModLog = mongoose.model('AutoModLog', AutoModLogSchema);
exports.AutomodSettings = mongoose.model('AutomodSettings', AutomodSettingsSchema);
exports.AutomodIgnored = mongoose.model('AutomodIgnored', AutomodIgnoredSchema);
exports.AutoRole = mongoose.model('AutoRole', AutoRoleSchema);
exports.Autoresponse = mongoose.model('Autoresponse', AutoresponseSchema);
exports.ServerBackup = mongoose.model('ServerBackup', BackupSchema);
exports.BackupCooldown = mongoose.model('BackupCooldown', BackupCooldownSchema);
exports.Birthday = mongoose.model('Birthday', BirthdaySchema);
exports.BirthdayConfig = mongoose.model('BirthdayConfig', BirthdayConfigSchema);
exports.EcoUser = mongoose.model('EcoUser', EcoUserSchema);
exports.EcoStat = mongoose.model('EcoStat', EcoStatSchema);
exports.EcoInventory = mongoose.model('EcoInventory', EcoInventorySchema);
exports.EcoCooldown = mongoose.model('EcoCooldown', EcoCooldownSchema);
exports.EcoCosmetic = mongoose.model('EcoCosmetic', EcoCosmeticSchema);
exports.EcoMeta = mongoose.model('EcoMeta', EcoMetaSchema);
exports.EcoItemInstance = mongoose.model('EcoItemInstance', EcoItemInstanceSchema);
exports.EcoEffect = mongoose.model('EcoEffect', EcoEffectSchema);
exports.EcoLoadout = mongoose.model('EcoLoadout', EcoLoadoutSchema);
exports.EcoQuestState = mongoose.model('EcoQuestState', EcoQuestStateSchema);
exports.EmbedTemplate = mongoose.model('EmbedTemplate', EmbedTemplateSchema);
exports.Giveaway = mongoose.model('Giveaway', GiveawaySchema);
exports.JoinPingConfig = mongoose.model('JoinPingConfig', JoinPingConfigSchema);
exports.GhostConfig = mongoose.model('GhostConfig', GhostConfigSchema);
exports.GhostCount = mongoose.model('GhostCount', GhostCountSchema);
exports.JTCConfig = mongoose.model('JTCConfig', JTCConfigSchema);
exports.JTCSession = mongoose.model('JTCSession', JTCSessionSchema);
exports.ModConfig = mongoose.model('ModConfig', ModConfigSchema);
exports.ModCase = mongoose.model('ModCase', ModCaseSchema);
exports.ModScheduled = mongoose.model('ModScheduled', ModScheduledSchema);
exports.ModRole = mongoose.model('ModRole', ModRoleSchema);
exports.ModSetting = mongoose.model('ModSetting', ModSettingSchema);
exports.ActiveMute = mongoose.model('ActiveMute', ActiveMuteSchema);
exports.Warning = mongoose.model('Warning', WarningSchema);
exports.RankUser = mongoose.model('RankUser', RankUserSchema);
exports.RankConfig = mongoose.model('RankConfig', RankConfigSchema);
exports.RankRoleReward = mongoose.model('RankRoleReward', RankRoleRewardSchema);
exports.RRSetup = mongoose.model('RRSetup', RRSetupSchema);
exports.RRItem = mongoose.model('RRItem', RRItemSchema);
exports.RRLog = mongoose.model('RRLog', RRLogSchema);
exports.SocialUser = mongoose.model('SocialUser', SocialUserSchema);
exports.SocialLog = mongoose.model('SocialLog', SocialLogSchema);
exports.Sticky = mongoose.model('Sticky', StickySchema);
exports.StickyConfig = mongoose.model('StickyConfig', StickyConfigSchema);
exports.TicketConfig = mongoose.model('TicketConfig', TicketConfigSchema);
exports.TicketPanel = mongoose.model('TicketPanel', TicketPanelSchema);
exports.TicketCategory = mongoose.model('TicketCategory', TicketCategorySchema);
exports.Ticket = mongoose.model('Ticket', TicketSchema);
exports.TicketMember = mongoose.model('TicketMember', TicketMemberSchema);
exports.TicketCounter = mongoose.model('TicketCounter', TicketCounterSchema);
exports.RRCounter = mongoose.model('RRCounter', RRCounterSchema);
exports.VerificationConfig = mongoose.model('VerificationConfig', VerificationConfigSchema);
exports.VerifiedUser = mongoose.model('VerifiedUser', VerifiedUserSchema);
exports.OtpCode = mongoose.model('OtpCode', OtpCodeSchema);
exports.WelcomeConfig = mongoose.model('WelcomeConfig', WelcomeConfigSchema);
exports.LeaveConfig = mongoose.model('LeaveConfig', LeaveConfigSchema);
exports.YTVerify = mongoose.model('YTVerify', YTVerifySchema);
exports.AIChannel = mongoose.model('AIChannel', AIChannelSchema);
exports.AIStats = mongoose.model('AIStats', AIStatsSchema);
exports.AISetting = mongoose.model('AISetting', AISettingSchema);
exports.LogConfig = mongoose.model('LogConfig', LogConfigSchema);
exports.LogEvent = mongoose.model('LogEvent', LogEventSchema);
exports.LogIgnoredChannel = mongoose.model('LogIgnoredChannel', LogIgnoredChannelSchema);
exports.FamilyUser = mongoose.model('FamilyUser', FamilyUserSchema);
exports.FamilyPartner = mongoose.model('FamilyPartner', FamilyPartnerSchema);
exports.FamilyParentChild = mongoose.model('FamilyParentChild', FamilyParentChildSchema);
exports.FamilyPending = mongoose.model('FamilyPending', FamilyPendingSchema);
exports.SocialConfig = mongoose.model('SocialConfig', SocialConfigSchema);
// Music Hub models

exports.MusicHistory = mongoose.model('MusicHistory', MusicHistorySchema);

const ServerSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  botLanguage: { type: String, default: 'en' }
});
exports.ServerSettings = mongoose.model('ServerSettings', ServerSettingsSchema);

const BotPersonalizationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  nickname: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  bannerUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});
exports.BotPersonalization = mongoose.model('BotPersonalization', BotPersonalizationSchema);

const UserPlaylistSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tracksJson: { type: String, default: '[]' }
});
exports.UserPlaylist = mongoose.model('UserPlaylist', UserPlaylistSchema);
