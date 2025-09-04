Smart Greenhouse IoT Backend
<p align="center">
<img src="https://www.google.com/search?q=https://placehold.co/800x250/1a202c/9f7aea%3Ftext%3DSmart%2BGreenhouse%2BProject" alt="Project Banner">
</p>

<p align="center">
A robust, real-time backend for monitoring and controlling greenhouse environments using an IoT architecture.
</p>

<p align="center">
<!-- Badges -->
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Node.js-18.x-339933%3Fstyle%3Dfor-the-badge%26logo%3Dnode.js" alt="Node.js">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Express.js-4.x-000000%3Fstyle%3Dfor-the-badge%26logo%3Dexpress" alt="Express.js">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/MongoDB-6.x-47A248%3Fstyle%3Dfor-the-badge%26logo%3Dmongodb" alt="MongoDB">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/MQTT-Enabled-660066%3Fstyle%3Dfor-the-badge%26logo%3Dmqtt" alt="MQTT">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/Socket.io-4.x-010101%3Fstyle%3Dfor-the-badge%26logo%3Dsocket.io" alt="Socket.io">
<img src="https://www.google.com/search?q=https://img.shields.io/badge/License-MIT-blue.svg%3Fstyle%3Dfor-the-badge" alt="License: MIT">
</p>

Overview
This project provides the complete server-side infrastructure for a smart greenhouse system. It is designed to handle real-time data from multiple IoT devices, store it efficiently, and expose a secure API for a web-based client. The system uses the lightweight MQTT protocol for device communication and WebSockets for instant updates to the user interface.

Key Features
Real-time Data Monitoring: Instantly receives sensor telemetry (temperature, humidity, soil moisture) via MQTT and broadcasts it to clients using Socket.io.

Secure Remote Control: Allows authenticated users to control actuators like fans, lamps, and irrigation systems through a secure REST API.

Advanced JWT Authentication: Implements a robust authentication flow with Access Tokens and Refresh Tokens, stored securely in httpOnly cookies.

Multi-Device Architecture: Dynamically creates a separate MongoDB collection for each registered device, ensuring data isolation and scalability.

Powerful Reporting System: Features an endpoint to generate detailed statistical reports (average, min, max) for any device over a specified date range.

Modular & Maintainable Codebase: Organized into a clean structure of controllers, models, routes, and middleware for easy maintenance and future expansion.

Technology Stack
Core Platform: Node.js

Web Framework: Express.js

Database: MongoDB with Mongoose ODM

IoT Protocol: MQTT

Real-time Engine: Socket.io

Authentication: JSON Web Tokens (JWT)

Security: bcrypt (Password Hashing), Cookie-Parser

Environment Variables: dotenv

Getting Started
Follow these instructions to set up and run the project on your local machine.

Prerequisites
Node.js: Version 16.x or higher

MongoDB: A running instance (local or cloud)

MQTT Broker: A running instance (e.g., Mosquitto, HiveMQ)

Installation Guide
Install Dependencies

npm install

Configure Environment Variables Create a .env file in the root directory and add the following configuration. Use the .env.example file as a template.

# Server Configuration
PORT=2000

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/smart_greenhouse

# JWT Authentication Secrets (Use strong, random strings)
ACCESS_TOKEN_SECRET=your_super_strong_access_token_secret
REFRESH_TOKEN_SECRET=your_super_strong_refresh_token_secret

# MQTT Broker URL
MQTT_BROKER_URL=mqtt://localhost:1883

Run the Server

npm start

The server is now running at http://localhost:2000 (or the port you specified).

API Endpoints
All protected routes require a valid JWT accessToken sent via cookies.

Authentication (/auth)

POST /auth/register (Public): Register a new user.

POST /auth/login (Public): Log in and receive auth tokens in cookies.

POST /auth/refresh (Public): Use a valid refresh token to get a new access token.

POST /auth/logout (Public): Log out and clear the session.

Sensor Data

GET /sensor-summary/:deviceId (Private): Get summary statistics for a specific device.

GET /sensor-last10/:deviceId (Private): Get the last 10 data records for a device.

Control

GET /get-control (Private): Get the current status of actuators (fan, lamp).

POST /set-control (Private): Set a new status for the actuators.

Reporting

GET /reports/:deviceId (Private): Generate a report for a device. Requires startDate and endDate query parameters.

Programmer
Shady Nikooei