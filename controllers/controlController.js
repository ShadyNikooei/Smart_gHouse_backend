// controllers/controlController.js
const { validationResult } = require('express-validator');
const ControlState = require('../models/ControlState');
const { MQTT_COLLEAGUE_CMD_SET_TOPIC } = require('../mqttClient');

const RETRY_LIMIT = 3;        // max re-publishes per command
const RETRY_DELAY_MS = 1500;  // delay between retries if mismatch persists

let retryTimer = null;

/** Shallow-merge only provided numeric fields (0/1) into desired */
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

  // Publish command ONLY to greenhouse/cmd/set
  if (mqttClient && Object.keys(patch).length > 0) {
    const msg = JSON.stringify({ ...patch }); // send just changed fields
    mqttClient.publish(MQTT_COLLEAGUE_CMD_SET_TOPIC, msg);
  }

  // Reconciliation retry (backup loop)
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(async function reconcile() {
    const fresh = await ControlState.findOne();
    if (!fresh) return;

    if (statesEqual(fresh.desired, fresh.reported)) {
      fresh.pendingCommand = false;
      fresh.attempts = 0;
      await fresh.save();
      io?.emit('control_update', { ...fresh.reported, commandId: fresh.commandId, pending: false });
      return;
    }

    if (fresh.attempts < RETRY_LIMIT) {
      fresh.attempts += 1;
      await fresh.save();

      // Re-publish FULL desired snapshot to the same topic
      const fullDesiredMsg = JSON.stringify(fresh.desired);
      mqttClient?.publish(MQTT_COLLEAGUE_CMD_SET_TOPIC, fullDesiredMsg);

      retryTimer = setTimeout(reconcile, RETRY_DELAY_MS);
    } else {
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
