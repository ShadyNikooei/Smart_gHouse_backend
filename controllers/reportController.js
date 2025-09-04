// controllers/reportController.js
const getSensorModel = require('../models/SensorData');

/**
 * Generates a statistical report for a given device within a specified date range.
 */
async function generateReport(req, res) {
    const { deviceId } = req.params;
    // Get date range from query parameters, e.g., /reports/mydevice123?startDate=2025-09-01&endDate=2025-09-30
    const { startDate, endDate } = req.query;

    if (!deviceId) {
        return res.status(400).send({ message: 'Device ID is required.' });
    }
    if (!startDate || !endDate) {
        return res.status(400).send({ message: 'Both startDate and endDate query parameters are required.' });
    }

    try {
        const SensorModel = getSensorModel(deviceId);

        // Use MongoDB's aggregation pipeline to generate the report.
        const report = await SensorModel.aggregate([
            // Stage 1: Filter documents to match the date range.
            {
                $match: {
                    timestamp: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            },
            // Stage 2: Group data to calculate statistics (average, min, max).
            {
                $group: {
                    _id: null, // Group all matched documents together.
                    avgTemperature: { $avg: '$temperature' },
                    minTemperature: { $min: '$temperature' },
                    maxTemperature: { $max: '$temperature' },
                    avgHumidity: { $avg: '$humidity' },
                    minHumidity: { $min: '$humidity' },
                    maxHumidity: { $max: '$humidity' },
                    avgSoil: { $avg: '$soil' },
                    minSoil: { $min: '$soil' },
                    maxSoil: { $max: '$soil' },
                    dataCount: { $sum: 1 }
                }
            },
            // Stage 3: Project to reshape the output for a clean API response.
            {
                $project: {
                    _id: 0,
                    deviceId: deviceId,
                    period: { start: startDate, end: endDate },
                    temperature: {
                        average: '$avgTemperature',
                        min: '$minTemperature',
                        max: '$maxTemperature'
                    },
                    humidity: {
                        average: '$avgHumidity',
                        min: '$minHumidity',
                        max: '$maxHumidity'
                    },
                    soil: {
                        average: '$avgSoil',
                        min: '$minSoil',
                        max: '$maxSoil'
                    },
                    recordCount: '$dataCount'
                }
            }
        ]);

        if (report.length === 0) {
            return res.status(404).send({ message: 'No data found for the specified device and date range.' });
        }

        res.status(200).json(report[0]);

    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).send({ message: 'Server error while generating report.' });
    }
}

module.exports = { generateReport };
