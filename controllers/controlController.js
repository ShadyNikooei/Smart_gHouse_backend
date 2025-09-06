// controllers/controlController.js
const { validationResult } = require('express-validator');
// Import topic constant from the unified mqttClient file
const { MQTT_CONTROL_TOPIC } = require('../mqttClient'); 

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

    if (typeof fan === 'number') {
        controlData.fan = fan;
        updatePayload.fan = fan;
    }
    if (typeof lamp === 'number') {
        controlData.lamp = lamp;
        updatePayload.lamp = lamp;
    }

    const io = req.app.locals.io;
    if (io) io.emit('control_update', controlData);
    
    const mqttClient = req.app.locals.mqttClient;
    if (mqttClient && Object.keys(updatePayload).length > 0) {
        mqttClient.publish(MQTT_CONTROL_TOPIC, JSON.stringify(updatePayload));
    }

    res.status(200).json({ message: 'Control data updated', controlData });
}

module.exports = { getControl, setControl };