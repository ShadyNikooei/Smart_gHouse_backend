Smart Greenhouse Backend Project
This repository contains the backend for a comprehensive Smart Greenhouse system designed for remote monitoring and control of environmental conditions. The system is built on an IoT architecture, utilizing the efficient MQTT protocol for hardware communication and a REST API with WebSockets for client-side interaction.

Key Features
Real-time Data Monitoring: Instantly receive sensor data (temperature, humidity, soil moisture, etc.) via MQTT and display it live on the user dashboard using Socket.io.

Remote Control: Ability to control actuators such as fans, lamps, and irrigation systems through a secure API.

Advanced Authentication: Secure registration and login system using JWT (Access & Refresh Tokens), with tokens stored in secure httpOnly cookies.

Multi-Device Support: The database architecture is designed to store data for each device (greenhouse) in a separate MongoDB collection, ensuring scalability.

Reporting System: Generate statistical reports (average, minimum, maximum) from sensor data for custom date ranges.

Modular and Scalable Architecture: The project is structured modularly (controllers, models, routes) for ease of development and maintenance.

Technology Stack
Platform: Node.js

Framework: Express.js

Database: MongoDB (with Mongoose ODM)

IoT Communication Protocol: MQTT

Real-time Client Communication: Socket.io

Authentication: JSON Web Tokens (JWT)

Password Security: bcrypt

Getting Started
To run this project locally, follow the steps below.

Prerequisites:

Node.js (v16 or higher)

MongoDB

An MQTT Broker (e.g., Mosquitto)

Installation Steps:

Install dependencies:

npm install

Create an environment file: Create a file named .env in the project root and populate it with your configuration details. You can use .env.example as a template.

# .env.example

# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/smart_greenhouse

# JWT Secrets (use strong, random strings)
ACCESS_TOKEN_SECRET=your_strong_access_token_secret
REFRESH_TOKEN_SECRET=your_strong_refresh_token_secret

# MQTT Broker URL
MQTT_BROKER_URL=mqtt://localhost:1883

# Server Port
PORT=2000

Run the server:

npm start

The server will be running on the port specified in your .env file (default: 2000).

API Endpoints
Authentication (/auth)
POST /auth/register: Register a new user.

POST /auth/login: Log in a user and receive tokens in cookies.

POST /auth/refresh: Refresh an expired access token.

POST /auth/logout: Log out the user and clear the session.

Sensor Data
GET /sensor-summary/:deviceId: Get summary statistics (average, count) for a specific device.

GET /sensor-last10/:deviceId: Get the last 10 sensor data records for a specific device.

Control
GET /get-control: Get the current status of actuators (fan, lamp).

POST /set-control: Set a new status for the actuators.

Reporting
GET /reports/:deviceId: Generate a statistical report for a device within a date range.

Query Params: startDate (e.g., 2025-09-01), endDate (e.g., 2025-09-30).

Programmer
Shady Nikooei