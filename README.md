# Smart Greenhouse Backend

This repository contains the backend for a **Smart Greenhouse System** designed for remote monitoring and control of environmental conditions. The backend is built on an IoT architecture using the MQTT protocol for hardware communication and a REST API with WebSockets for client-side interaction.  


## Key Features

- **Real-time Data Monitoring**  
  Receive live sensor data (temperature, humidity, soil moisture, etc.) via MQTT and stream it to the dashboard using Socket.io.  

- **Remote Control**  
  Control actuators such as fans, lamps, and irrigation systems securely via the API.  

- **Advanced Authentication**  
  Secure registration and login with JWT (Access & Refresh Tokens) stored in httpOnly cookies.  

- **Multi-Device Support**  
  Separate MongoDB collections per device (greenhouse) for scalability.  

- **Reporting System**  
  Generate statistical reports (average, minimum, maximum) for custom date ranges.  

- **Modular and Scalable Architecture**  
  Organized structure (controllers, models, routes) for easy development and maintenance.  


## Technology Stack

- Platform: **Node.js**  
- Framework: **Express.js**  
- Database: **MongoDB** (Mongoose ODM)  
- IoT Protocol: **MQTT**  
- Real-time Communication: **Socket.io**  
- Authentication: **JWT (Access & Refresh Tokens)**  
- Password Security: **bcrypt**  


## Project Architecture

- **Hardware (ESP32/Arduino):** Collects sensor data and publishes it to the MQTT broker.  
- **Backend (this project):** Subscribes to MQTT topics, processes incoming data, and stores it in MongoDB.  
- **Web Client (Frontend):** Communicates with the backend via a secure REST API. Authenticated users can view live data via Socket.io and send control commands.  
- **Command Dispatch:** Backend publishes user control commands to MQTT topics, which hardware devices execute.  


## Getting Started

### Prerequisites
- Node.js (v16 or higher)  
- MongoDB  
- MQTT Broker (e.g., Mosquitto)  

### Installation
- Install dependencies:  
  ```bash
  npm install
  ```
- Create a `.env` file in the project root (use `.env.example` as reference):  
  ```bash
  # MongoDB Connection URI
  MONGODB_URI=mongodb://localhost:27017/smart_greenhouse

  # JWT Secrets
  ACCESS_TOKEN_SECRET=your_strong_access_token_secret
  REFRESH_TOKEN_SECRET=your_strong_refresh_token_secret

  # MQTT Broker
  MQTT_BROKER_URL=mqtt://localhost:1883

  # Server Port
  PORT=2000
  ```
- Run the server:  
  ```bash
  npm start
  ```
- Server will be running at the port specified in `.env` (default: 2000).  


## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` – Register a new user  
- `POST /auth/login` – Login user, tokens returned in cookies  
- `POST /auth/refresh` – Refresh access token  
- `POST /auth/logout` – Logout and clear session  

### Sensor Data
- `GET /sensor-summary/:deviceId` – Get summary statistics (average, count) for a device  
- `GET /sensor-last10/:deviceId` – Get the last 10 sensor records  

### Control
- `GET /get-control` – Get current status of actuators (fan, lamp)  
- `POST /set-control` – Update actuator status  

### Reporting
- `GET /reports/:deviceId` – Generate statistical report for a device  
  - Query Params: `startDate=YYYY-MM-DD`, `endDate=YYYY-MM-DD`  


## Programmer
- **Shady Nikooei**  
