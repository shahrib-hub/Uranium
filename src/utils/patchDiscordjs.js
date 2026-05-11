const { CommandInteraction, Message, BaseInteraction } = require('discord.js');
const { translateMessagePayload } = require('./translator');

const originalReply = CommandInteraction.prototype.reply;
const originalEditReply = CommandInteraction.prototype.editReply;
const originalFollowUp = CommandInteraction.prototype.followUp;
const originalMessageReply = Message.prototype.reply;
const originalChannelSend = require('discord.js').TextChannel ? require('discord.js').TextChannel.prototype.send : null;

// Helper to check if payload is already translated
const isTranslated = (options) => {
  if (typeof options === 'object' && options !== null && options._translated) {
    return true;
  }
  return false;
};

const markTranslated = (options) => {
  if (typeof options === 'object' && options !== null) {
    options._translated = true;
  }
  return options;
};

// Patch CommandInteraction
CommandInteraction.prototype.reply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    let deferredByUs = false;
    if (!this.deferred && !this.replied) {
      // Determine if the original reply was meant to be ephemeral
      const isEphemeral = options && (options.ephemeral === true || options.flags === 64);
      await this.deferReply({ ephemeral: isEphemeral }).catch(() => {});
      deferredByUs = true;
    }

    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') markTranslated(options);

    // If we deferred it, we MUST edit instead of reply
    if (deferredByUs) {
      return originalEditReply.call(this, options);
    }
  }
  return originalReply.call(this, options);
};

CommandInteraction.prototype.editReply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') markTranslated(options);
  }
  return originalEditReply.call(this, options);
};

CommandInteraction.prototype.followUp = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') markTranslated(options);
  }
  return originalFollowUp.call(this, options);
};

// Patch other interactions (Button, SelectMenu, Modal)
if (BaseInteraction.prototype.reply && BaseInteraction.prototype.reply !== originalReply) {
    const originalBaseReply = BaseInteraction.prototype.reply;
    const originalBaseEditReply = BaseInteraction.prototype.editReply || originalEditReply;
    
    BaseInteraction.prototype.reply = async function(options) {
        if (this.guildId && !isTranslated(options)) {
            let deferredByUs = false;
            // Some interactions like Modals don't have deferReply or it works differently,
            // but for Buttons/Selects it works. We check if deferReply exists.
            if (!this.deferred && !this.replied && typeof this.deferReply === 'function') {
                const isEphemeral = options && (options.ephemeral === true || options.flags === 64);
                await this.deferReply({ ephemeral: isEphemeral }).catch(() => {});
                deferredByUs = true;
            }

            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') markTranslated(options);

            if (deferredByUs) {
                return originalBaseEditReply.call(this, options);
            }
        }
        return originalBaseReply.call(this, options);
    };
}
if (BaseInteraction.prototype.editReply && BaseInteraction.prototype.editReply !== originalEditReply) {
    const originalBaseEditReply = BaseInteraction.prototype.editReply;
    BaseInteraction.prototype.editReply = async function(options) {
        if (this.guildId && !isTranslated(options)) {
            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') markTranslated(options);
        }
        return originalBaseEditReply.call(this, options);
    };
}
if (BaseInteraction.prototype.update) {
    const originalUpdate = BaseInteraction.prototype.update;
    BaseInteraction.prototype.update = async function(options) {
        if (this.guildId && !isTranslated(options)) {
            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') markTranslated(options);
        }
        return originalUpdate.call(this, options);
    };
}


// Patch Message reply
Message.prototype.reply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') markTranslated(options);
  }
  return originalMessageReply.call(this, options);
};

// We optionally patch channel send, but we must ensure we have guildId.
// For TextChannel, it has this.guild.id
if (originalChannelSend) {
  require('discord.js').TextChannel.prototype.send = async function(options) {
    if (this.guild && this.guild.id && !isTranslated(options)) {
      options = await translateMessagePayload(options, this.guild.id);
      if (typeof options === 'object') markTranslated(options);
    }
    return originalChannelSend.call(this, options);
  };
}

module.exports = {}; // Just requires execution
