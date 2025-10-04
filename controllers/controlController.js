// controllers/controlController.js
const { validationResult } = require('express-validator');
const ControlState = require('../models/ControlState');
const { MQTT_CONTROL_TOPIC, MQTT_COLLEAGUE_CMD_SET_TOPIC } = require('../mqttClient');

const RETRY_LIMIT = 3;        // max re-publishes per command
const RETRY_DELAY_MS = 1500;  // delay between retries if mismatch persists

// In-memory timers keyed by commandId (single-device). For multi-device, key by deviceId+commandId.
let retryTimer = null;

/**
 * Shallow merge only provided numeric fields into target object (0/1).
 */
function applyDesiredPatch(target, patch) {
  ['fan','lamp','pump','valve'].forEach(k => {
    if (typeof patch[k] === 'number') target[k] = patch[k];
  });
}

function statesEqual(a, b) {
  return a.fan===b.fan && a.lamp===b.lamp && a.pump===b.pump && a.valve===b.valve;
}

async function ensureDoc() {
  let doc = await ControlState.findOne();
  if (!doc) doc = await ControlState.create({});
  return doc;
}

async function getControl(req, res) {
  const doc = await ensureDoc();
  res.status(200).json({ desired: doc.desired, reported: doc.reported, commandId: doc.commandId });
}

async function setControl(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const patch = req.body; // {fan?, lamp?, pump?, valve?}
  const io = req.app.locals.io;
  const mqttClient = req.app.locals.mqttClient;

  const doc = await ensureDoc();

  // Update desired with the provided patch
  applyDesiredPatch(doc.desired, patch);

  // Bump commandId, mark as pending, reset attempts
  doc.commandId += 1;
  doc.pendingCommand = true;
  doc.attempts = 0;
  await doc.save();

  // Emit optimistic UI update
  io?.emit('control_update', { ...doc.desired, commandId: doc.commandId, pending: true });

  // Publish command to both topics
  const msg = JSON.stringify({ ...patch }); // only changed fields (your existing behavior)
  if (mqttClient && Object.keys(patch).length > 0) {
    mqttClient.publish(MQTT_CONTROL_TOPIC, msg);
    mqttClient.publish(MQTT_COLLEAGUE_CMD_SET_TOPIC, msg);
  }

  // Schedule reconciliation retry if needed
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(async function reconcile() {
    const fresh = await ControlState.findOne();
    if (!fresh) return;

    // If already matched (reported == desired), stop
    if (statesEqual(fresh.desired, fresh.reported)) {
      fresh.pendingCommand = false;
      fresh.attempts = 0;
      await fresh.save();
      io?.emit('control_update', { ...fresh.reported, commandId: fresh.commandId, pending: false });
      return;
    }

    // Not matched yet → retry if attempts remain
    if (fresh.attempts < RETRY_LIMIT) {
      fresh.attempts += 1;
      await fresh.save();

      // Re-publish full desired snapshot to be explicit (not only changed fields)
      const fullDesiredMsg = JSON.stringify(fresh.desired);
      mqttClient?.publish(MQTT_CONTROL_TOPIC, fullDesiredMsg);
      mqttClient?.publish(MQTT_COLLEAGUE_CMD_SET_TOPIC, fullDesiredMsg);

      // Re-arm timer
      retryTimer = setTimeout(reconcile, RETRY_DELAY_MS);
    } else {
      // Give up for this commandId; keep pending=false so UI can show a warning
      fresh.pendingCommand = false;
      await fresh.save();
      io?.emit('control_mismatch', {
        desired: fresh.desired,
        reported: fresh.reported,
        commandId: fresh.commandId,
        message: 'Actuator state did not converge after retries.'
      });
    }
  }, RETRY_DELAY_MS);

  res.status(200).json({ message: 'Desired control updated; command published', commandId: doc.commandId });
}

module.exports = { getControl, setControl };
