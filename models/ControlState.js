// models/ControlState.js
const mongoose = require('mongoose');

/**
 * Tracks desired vs reported actuator states for a single greenhouse/device.
 * If you later have multiple devices, add a deviceId field and index on it.
 */
const controlStateSchema = new mongoose.Schema({
  desired: {
    fan:   { type: Number, default: 1 },
    lamp:  { type: Number, default: 0 },
    pump:  { type: Number, default: 0 },
    valve: { type: Number, default: 0 },
  },
  reported: {
    fan:   { type: Number, default: 1 },
    lamp:  { type: Number, default: 0 },
    pump:  { type: Number, default: 0 },
    valve: { type: Number, default: 0 },
    ts:    { type: Date, default: Date.now },
  },
  commandId:      { type: Number, default: 0 }, // increments with each new command set
  pendingCommand: { type: Boolean, default: false },
  attempts:       { type: Number, default: 0 }, // retry count for current commandId
  updatedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ControlState', controlStateSchema);
