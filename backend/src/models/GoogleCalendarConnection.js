const mongoose = require('mongoose');

const GoogleCalendarConnectionSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  googleUserId: { type: String, default: null },
  googleEmail: { type: String, default: null },
  googleName: { type: String, default: null },
  googlePicture: { type: String, default: null },
  calendarId: { type: String, default: 'primary' },
  refreshTokenEncrypted: { type: String, default: null },
  refreshTokenIv: { type: String, default: null },
  refreshTokenAuthTag: { type: String, default: null },
  scope: { type: String, default: null },
  accessTokenExpiryDate: { type: Date, default: null },
  syncToken: { type: String, default: null },
  channelId: { type: String, default: null },
  channelResourceId: { type: String, default: null },
  channelExpiration: { type: Date, default: null },
  lastSyncAt: { type: Date, default: null },
  lastWebhookAt: { type: Date, default: null },
  lastConnectedAt: { type: Date, default: null }
}, { strict: false, timestamps: true });

GoogleCalendarConnectionSchema.index({ ownerEmail: 1 }, { unique: true });

module.exports = mongoose.models.GoogleCalendarConnection || mongoose.model('GoogleCalendarConnection', GoogleCalendarConnectionSchema);