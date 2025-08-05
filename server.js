const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const setupControlRoutes = require('./controlRoutes');
const sensorSummaryRoutes = require('./sensorSummaryRoutes');

const app = express();
const port = 2000;

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/greenhouse', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define SensorData model here directly
const sensorDataSchema = new mongoose.Schema({
    temperature: Number,
    humidity: Number,
    soilMoisture: Number,
    timestamp: { type: Date, default: Date.now }
});
const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Route to receive sensor data
app.post('/sensor-data', async (req, res) => {
  try {
    const { temperature, humidity, soilMoisture } = req.body;
    const newData = new SensorData({ temperature, humidity, soilMoisture });
    await newData.save();
    console.log('Data saved:', newData);
    res.status(200).send({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Pass the SensorData model to sensorSummaryRoutes, because it needs it
sensorSummaryRoutes(app, SensorData);

setupControlRoutes(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
