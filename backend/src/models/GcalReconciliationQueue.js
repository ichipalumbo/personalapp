const mongoose = require('mongoose');

const GcalReconciliationQueueSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  action: { type: String, enum: ['delete', 'update'], required: true },
  googleCalendarEventId: { type: String, required: true },
  agendamentoId: { type: String, default: null },
  payload: { type: Object, default: null }
}, { timestamps: true });

GcalReconciliationQueueSchema.index({ ownerEmail: 1, googleCalendarEventId: 1 }, { unique: true });

module.exports = mongoose.models.GcalReconciliationQueue || mongoose.model('GcalReconciliationQueue', GcalReconciliationQueueSchema);
