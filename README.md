# Smart Greenhouse Backend

## Project Overview
This backend service is designed for managing sensor data and control commands in a smart greenhouse system. It collects temperature, humidity, and soil moisture data from IoT sensors, stores it in MongoDB, and provides control commands (e.g., fan, lamp) to the devices.

## Features
- Receive sensor data via API and save to MongoDB database
- Provide summarized sensor data (average temperature, humidity, soil moisture)
- Manage and send control commands to IoT devices
- Simple RESTful APIs for communication with frontend and devices

## Technology Stack
- Node.js with Express.js framework
- MongoDB for data storage
- Mongoose for object modeling
- Body-parser middleware for JSON parsing

## Installation & Setup
1. Clone the repository  
   ```bash
   git clone <repository-url>
