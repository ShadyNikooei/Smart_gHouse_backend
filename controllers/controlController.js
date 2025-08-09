// controllers/controlController.js
const { validationResult } = require('express-validator');

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
  if (typeof fan === 'number') controlData.fan = fan;
  if (typeof lamp === 'number') controlData.lamp = lamp;

  // Emit real-time update
  const io = req.app.locals.io;
  if (io) io.emit('control_update', controlData);

  res.status(200).json({ message: 'Control data updated', controlData });
}

module.exports = { getControl, setControl };
