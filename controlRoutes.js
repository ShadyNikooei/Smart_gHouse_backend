let controlData = {
    fan: 1,
    lamp: 0
};

// Export a function that receives the app and sets up the control routes
function setupControlRoutes(app) {
    // Update control commands (e.g., from frontend)
    app.post('/set-control', (req, res) => {
        controlData = req.body;
        console.log('Control data updated:', controlData);
        res.status(200).send({ message: 'Control data updated' });
    });

    // Send control commands to IoT device
    app.get('/get-control', (req, res) => {
        res.status(200).send(controlData);
    });
}

module.exports = setupControlRoutes;
