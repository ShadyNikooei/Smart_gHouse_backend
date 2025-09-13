// controllers/reportController.js
const { TemperatureModel, HumidityModel, SoilModel } = require('../models/SensorData');

/**
 * Generates a statistical report (avg, min, max) over a date range for the single device.
 * Aggregates data from separate sensor collections.
 */
async function generateReport(req, res) {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).send({ message: 'startDate and endDate query parameters are required.' });
    }

    try {
        // Define a reusable aggregation function for a single metric model.
        const calculateStatistics = async (model) => {
            const matchStage = {
                $match: {
                    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            };

            const groupStage = {
                $group: {
                    _id: null,
                    average: { $avg: '$value' },
                    min: { $min: '$value' },
                    max: { $max: '$value' },
                    count: { $sum: 1 }
                }
            };
            
            const projectionStage = { $project: { _id: 0 } };

            const result = await model.aggregate([matchStage, groupStage, projectionStage]);
            return result.length > 0 ? result[0] : { average: null, min: null, max: null, count: 0 };
        };

        // Run aggregations in parallel for all metrics.
        const [tempStats, humidityStats, soilStats] = await Promise.all([
            calculateStatistics(TemperatureModel),
            calculateStatistics(HumidityModel),
            calculateStatistics(SoilModel)
        ]);

        const report = {
            period: { start: startDate, end: endDate },
            statistics: {
                temperature: tempStats,
                humidity: humidityStats,
                soil: soilStats
            }
        };

        res.status(200).json(report);

    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).send({ message: 'Server error while generating report.' });
    }
}

module.exports = { generateReport };