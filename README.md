# Smart Greenhouse Backend

This repository contains the backend for a Smart Greenhouse System designed for remote monitoring and control of environmental conditions.  
The backend is built on an IoT architecture using the MQTT protocol for hardware communication and a REST API with WebSockets for client-side interaction.


## Key Features

- **Real-time Data Monitoring**  
  Receive live sensor data (temperature, humidity, soil moisture, etc.) via MQTT and stream it to the dashboard using Socket.io.

- **Remote Control**  
  Control actuators (fans, lamps, irrigation systems) securely via the API.

- **Advanced Authentication**  
  Secure registration and login with JWT (Access & Refresh Tokens) stored in `httpOnly` cookies.

- **Sensor-Specific Data Collections**  
  Each sensor type has its own MongoDB collection, optimized for time-series queries and varying data rates.

- **Reporting System**  
  Generate statistical reports (average, minimum, maximum) for custom date ranges.

- **Modular & Scalable Architecture**  
  Organized controllers, models, and routes for easy development and maintenance.


## Technology Stack

- **Platform:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB (Mongoose ODM)  
- **IoT Protocol:** MQTT  
- **Real-time Communication:** Socket.io  
- **Authentication:** JWT (Access & Refresh Tokens)  
- **Password Security:** bcrypt  


## Project Architecture

```text
Hardware (ESP32/Arduino) → MQTT Broker → Backend (this project) → MongoDB
                                              ↓
                                        Web Client (Frontend)
```

- **Hardware (ESP32/Arduino):** Collects sensor data and publishes it to MQTT topics.  
- **Backend:** Subscribes to MQTT topics, processes data, and stores it in MongoDB.  
- **Frontend:** Communicates via REST API & WebSockets to show live data and send commands.  
- **Command Dispatch:** Backend publishes control commands → hardware executes them.  


## Getting Started

### Prerequisites
- Node.js (v16 or higher)  
- MongoDB  
- MQTT Broker (e.g., Mosquitto)  

### Installation

Clone the repository and install dependencies:
```bash
npm install
```

Create a `.env` file (based on `.env.example`):
```env
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

Run the server:
```bash
npm start
```

The server will be available at:  
`http://localhost:2000`


## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` – Register a new user  
- `POST /auth/login` – Login & receive tokens (cookies)  
- `POST /auth/refresh` – Refresh access token  
- `POST /auth/logout` – Logout user  

### Sensor Data
- `GET /sensor-summary` – Latest sensor readings summary  
- `GET /sensor-last10` – Last 10 records for each sensor type  

### Control
- `GET /get-control` – Get current actuator status (fan, lamp, etc.)  
- `POST /set-control` – Update actuator status  

### Reporting
- `GET /reports` – Generate statistical report  
  - Query Params: `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`  


## MQTT Topics

### Subscribed Topics (Incoming Sensor Data)
- `greenhouse/temperature`  
- `greenhouse/humidity`  
- `greenhouse/soil`  

### Published Topics (Outgoing Commands)
- `greenhouse/control/command`  


## Programmer
**Shady Nikooei**
