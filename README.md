# Smart Greenhouse Backend

## Project Overview
This backend service is designed for managing sensor data and control commands in a smart greenhouse system. It collects temperature, humidity, and soil moisture data from IoT sensors, stores it in MongoDB (Atlas), and provides control commands (e.g., fan, lamp) to the devices. It supports real-time data transfer and secure access.

## Features
- Receive sensor data via API and save to MongoDB database
- Provide summarized sensor data (average temperature, humidity, soil moisture)
- Provide last 10 sensor data entries on request
- Manage and send control commands to IoT devices
- Real-time data updates to frontend via WebSocket
- User authentication and authorization with JWT tokens
- Input validation on POST routes
- Environment variables management for sensitive data

## Technology Stack
- Node.js with Express.js framework  
- MongoDB Atlas for cloud data storage  
- Mongoose for MongoDB object modeling  
- Body-parser middleware for JSON parsing  
- JWT for authentication and authorization  
- WebSocket for real-time communication  
- dotenv for environment variable management  

## Installation & Setup

1. Clone the repository  
   ```bash
   git clone <repository-url>
   cd <project-folder>

