// controllers/controlController.js
const { validationResult } = require('express-validator');
// Import topic constant from the unified mqttClient file
const { MQTT_CONTROL_TOPIC } = require('../mqttClient'); 

// --- UPDATED: Added pump and valve to the server's state object ---
let controlData = {
    fan: 1,
    lamp: 0,
    pump: 0,
    valve: 0
};

function getControl(req, res) {
    res.status(200).json(controlData);
}

function setControl(req, res) {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // --- UPDATED: Destructure new devices from request body ---
    const { fan, lamp, pump, valve } = req.body;
    const updatePayload = {}; // This payload will be sent to the hardware via MQTT

    // Check for 'fan' and add it to the payload if present
    if (typeof fan === 'number') {
        controlData.fan = fan;
        updatePayload.fan = fan;
    }
    // Check for 'lamp' and add it to the payload if present
    if (typeof lamp === 'number') {
        controlData.lamp = lamp;
        updatePayload.lamp = lamp;
    }
    // --- UPDATED: Add logic for 'pump' and 'valve' ---
    if (typeof pump === 'number') {
        controlData.pump = pump;
        updatePayload.pump = pump;
    }
    if (typeof valve === 'number') {
        controlData.valve = valve;
        updatePayload.valve = valve;
    }

    // Get the global io instance to emit updates to all connected dashboards
    const io = req.app.locals.io;
    if (io) io.emit('control_update', controlData);
    
    // Get the global mqttClient instance to send commands to the hardware
    const mqttClient = req.app.locals.mqttClient;
    if (mqttClient && Object.keys(updatePayload).length > 0) {
        // Publish only the changes to the control topic
        mqttClient.publish(MQTT_CONTROL_TOPIC, JSON.stringify(updatePayload));
    }

    res.status(200).json({ message: 'Control data updated', controlData });
}

module.exports = { getControl, setControl };