// controllers/controlController.js
const { validationResult } = require('express-validator');
const { MQTT_CONTROL_TOPIC } = require('../mqttClient'); // Import MQTT topic constant

// In-memory state for device controls. For persistence, this could be moved to a database.
let controlData = {
  fan: 1,
  lamp: 0
};

function getControl(req, res) {
  res.status(200).json(controlData);
}

function setControl(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { fan, lamp } = req.body;
  const updatePayload = {};

  // Update in-memory state if new values are provided.
  if (typeof fan === 'number') {
    controlData.fan = fan;
    updatePayload.fan = fan;
  }
  if (typeof lamp === 'number') {
    controlData.lamp = lamp;
    updatePayload.lamp = lamp;
  }

  // Emit a real-time update to the web frontend via Socket.io.
  const io = req.app.locals.io;
  if (io) io.emit('control_update', controlData);
  
  // Publish the command to the MQTT topic for the hardware device to receive.
  const mqttClient = req.app.locals.mqttClient;
  if (mqttClient && Object.keys(updatePayload).length > 0) {
      // For multi-device, the topic could be `greenhouse/${deviceId}/control/command`
      mqttClient.publish(MQTT_CONTROL_TOPIC, JSON.stringify(updatePayload));
  }

  res.status(200).json({ message: 'Control data updated', controlData });
}

module.exports = { getControl, setControl };

