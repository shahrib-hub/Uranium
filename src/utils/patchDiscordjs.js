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

const fixOptions = (options) => {
  if (options && typeof options === 'object') {
    if (options.ephemeral === true) {
      options.flags = (options.flags || 0) | 64;
      delete options.ephemeral;
    } else if (options.ephemeral === false) {
      delete options.ephemeral;
    }
  }
  return options;
};

// Patch CommandInteraction
CommandInteraction.prototype.reply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    let deferredByUs = false;
    if (!this.deferred && !this.replied) {
      // Determine if the original reply was meant to be ephemeral
      const isEphemeral = options && (options.ephemeral === true || (options.flags & 64) !== 0);
      
      options = fixOptions(options);

      try {
        await this.deferReply({ flags: isEphemeral ? 64 : 0 });
        deferredByUs = true;
      } catch (e) {
        // failed to defer (e.g. timeout or already deferred)
      }
    }

    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') {
      markTranslated(options);
      fixOptions(options);
    }

    // If we successfully deferred it, we MUST edit instead of reply
    if (deferredByUs || this.deferred) {
      return originalEditReply.call(this, options);
    }
  }
  return originalReply.call(this, fixOptions(options));
};

CommandInteraction.prototype.editReply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') {
      markTranslated(options);
      fixOptions(options);
    }
  }
  return originalEditReply.call(this, fixOptions(options));
};

CommandInteraction.prototype.followUp = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') {
      markTranslated(options);
      fixOptions(options);
    }
  }
  return originalFollowUp.call(this, fixOptions(options));
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
                const isEphemeral = options && (options.ephemeral === true || (options.flags & 64) !== 0);
                
                options = fixOptions(options);

                try {
                    await this.deferReply({ flags: isEphemeral ? 64 : 0 });
                    deferredByUs = true;
                } catch (e) { }
            }

            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') {
                markTranslated(options);
                fixOptions(options);
            }

            if (deferredByUs || this.deferred) {
                return originalBaseEditReply.call(this, options);
            }
        }
        return originalBaseReply.call(this, fixOptions(options));
    };
}
if (BaseInteraction.prototype.editReply && BaseInteraction.prototype.editReply !== originalEditReply) {
    const originalBaseEditReply = BaseInteraction.prototype.editReply;
    BaseInteraction.prototype.editReply = async function(options) {
        if (this.guildId && !isTranslated(options)) {
            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') {
                markTranslated(options);
                fixOptions(options);
            }
        }
        return originalBaseEditReply.call(this, fixOptions(options));
    };
}
if (BaseInteraction.prototype.update) {
    const originalUpdate = BaseInteraction.prototype.update;
    const originalBaseEditReply = BaseInteraction.prototype.editReply || originalEditReply;
    
    BaseInteraction.prototype.update = async function(options) {
        if (this.guildId && !isTranslated(options)) {
            let deferredByUs = false;
            if (!this.deferred && !this.replied && typeof this.deferUpdate === 'function') {
                await this.deferUpdate().catch(() => {});
                deferredByUs = true;
            }

            options = await translateMessagePayload(options, this.guildId);
            if (typeof options === 'object') {
                markTranslated(options);
                fixOptions(options);
            }

            if (deferredByUs) {
                // If we deferred an update, we must use editReply to actually send the new message content
                return originalBaseEditReply.call(this, options);
            }
        }
        return originalUpdate.call(this, fixOptions(options));
    };
}


// Patch Message reply
Message.prototype.reply = async function(options) {
  if (this.guildId && !isTranslated(options)) {
    options = await translateMessagePayload(options, this.guildId);
    if (typeof options === 'object') {
        markTranslated(options);
        fixOptions(options);
    }
  }
  return originalMessageReply.call(this, fixOptions(options));
};

// We optionally patch channel send, but we must ensure we have guildId.
// For TextChannel, it has this.guild.id
if (originalChannelSend) {
  require('discord.js').TextChannel.prototype.send = async function(options) {
    if (this.guild && this.guild.id && !isTranslated(options)) {
      options = await translateMessagePayload(options, this.guild.id);
      if (typeof options === 'object') {
          markTranslated(options);
          fixOptions(options);
      }
    }
    return originalChannelSend.call(this, fixOptions(options));
  };
}

module.exports = {}; // Just requires execution
