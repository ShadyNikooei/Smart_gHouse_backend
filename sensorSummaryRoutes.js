function sensorSummaryRoutes(app, SensorData) {
  app.get('/sensor-summary', async (req, res) => {
    try {
      const summary = await SensorData.aggregate([
        {
          $group: {
            _id: null,
            avgTemperature: { $avg: "$temperature" },
            avgHumidity: { $avg: "$humidity" },
            avgSoilMoisture: { $avg: "$soilMoisture" },
            count: { $sum: 1 }
          }
        }
      ]);
      if (summary.length === 0) return res.status(404).send({ message: 'No sensor data found' });
      res.status(200).json(summary[0]);
    } catch (error) {
      res.status(500).send({ message: 'Server error' });
    }
  });
}

module.exports = sensorSummaryRoutes;
