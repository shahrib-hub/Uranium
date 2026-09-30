// src/dashboard/routes/autoresponder.js — Custom Auto-Responder API
const { Router } = require('express');
const autoresponse = require('../../utils/autoresponse');

module.exports = function createAutoresponderRouter(client, { requireGuildAccess, requireGuildAdmin, requireGuildMod }) {
  const router = Router();

  // 1. GET All Auto-Responses
  router.get('/guild/:guildId/autoresponder', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { guild } = req;
      const responses = (await autoresponse.getAutoResponses(guild.id)) || [];
      const total = await autoresponse.countAutoResponses(guild.id);

      res.json({
        total,
        responses: responses.map(r => ({
          trigger: r.trigger,
          response: r.response,
          embed: !!r.embed
        }))
      });
    } catch (err) {
      console.error('[Autoresponder API] GET error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. POST Add or Update Auto-Response
  router.post('/guild/:guildId/autoresponder', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const { trigger, response, embed } = req.body;

      if (!trigger || !trigger.trim()) {
        return res.status(400).json({ error: 'Trigger keyword/phrase cannot be empty.' });
      }
      if (!response || !response.trim()) {
        return res.status(400).json({ error: 'Response message cannot be empty.' });
      }

      const cleanTrigger = trigger.trim().toLowerCase().slice(0, 100);
      const cleanResponse = response.trim().slice(0, 2000);

      await autoresponse.addAutoResponse(guild.id, cleanTrigger, cleanResponse, !!embed);

      res.json({
        success: true,
        message: `Auto-response for "${cleanTrigger}" saved!`,
        item: { trigger: cleanTrigger, response: cleanResponse, embed: !!embed }
      });
    } catch (err) {
      console.error('[Autoresponder API] SAVE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. DELETE Auto-Response
  router.delete('/guild/:guildId/autoresponder/:trigger', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { guild } = req;
      const trigger = decodeURIComponent(req.params.trigger).trim().toLowerCase();

      if (!trigger) {
        return res.status(400).json({ error: 'Trigger parameter required.' });
      }

      await autoresponse.removeAutoResponse(guild.id, trigger);

      res.json({ success: true, message: `Auto-response for "${trigger}" deleted.` });
    } catch (err) {
      console.error('[Autoresponder API] DELETE error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
