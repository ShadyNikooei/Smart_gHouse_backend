// controllers/sensorController.js
// Import new specific models
const { TemperatureModel, HumidityModel, SoilModel } = require('../models/SensorData');

/**
 * Gets a summary of current sensor data (last reading) for the single greenhouse.
 * Fetches the latest record from each sensor collection.
 */
async function getSensorSummary(req, res) {
    try {
        // Fetch the last reading from all sensor collections in parallel.
        const [lastTemperature, lastHumidity, lastSoilMoisture] = await Promise.all([
            TemperatureModel.findOne().sort({ timestamp: -1 }),
            HumidityModel.findOne().sort({ timestamp: -1 }),
            SoilModel.findOne().sort({ timestamp: -1 })
        ]);

        res.status(200).json({
            summary: {
                temperature: lastTemperature ? lastTemperature.value : null,
                humidity: lastHumidity ? lastHumidity.value : null,
                soilMoisture: lastSoilMoisture ? lastSoilMoisture.value : null,
                lastTemperatureUpdate: lastTemperature ? lastTemperature.timestamp : null,
                lastHumidityUpdate: lastHumidity ? lastHumidity.timestamp : null,
                lastSoilUpdate: lastSoilMoisture ? lastSoilMoisture.timestamp : null,
            }
        });
    } catch (err) {
        console.error('Error retrieving sensor summary:', err);
        res.status(500).send({ message: 'Server error' });
    }
}

/**
 * Gets the last 10 historical entries for each sensor type for the single greenhouse.
 */
async function getLast10(req, res) {
    try {
        // Fetch last 10 records for each metric in parallel.
        const [temperatureHistory, humidityHistory, soilHistory] = await Promise.all([
            TemperatureModel.find().sort({ timestamp: -1 }).limit(10).exec(),
            HumidityModel.find().sort({ timestamp: -1 }).limit(10).exec(),
            SoilModel.find().sort({ timestamp: -1 }).limit(10).exec()
        ]);

        res.status(200).json({
            history: {
                temperature: temperatureHistory,
                humidity: humidityHistory,
                soil: soilHistory
            }
        });
    } catch (err) {
        console.error('Error retrieving historical data:', err);
        res.status(500).send({ message: 'Server error' });
    }
}

module.exports = { getSensorSummary, getLast10 };