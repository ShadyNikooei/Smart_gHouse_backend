# Smart Greenhouse IoT Backend

This repository contains the backend for a Smart Greenhouse System designed for remote monitoring and control of environmental conditions. The backend is built on a robust IoT architecture using the MQTT protocol for hardware communication and a secure REST API with WebSockets for client-side interaction.


## Key Features

- **Real-time Sensor Monitoring**: Receive live sensor data (temperature, humidity, soil moisture) via MQTT and stream it directly to client dashboards using Socket.IO.

- **Comprehensive Remote Control**: Securely control a full range of actuators via the API, including:
  - **Fan**
  - **Lamp**
  - **Water Pump**
  - **Solenoid Valve**

- **Advanced Authentication**: Secure user registration and login with a JWT-based system (Access & Refresh Tokens) stored in `httpOnly` cookies to protect against XSS attacks.

- **Hardware State Synchronization (Ack)**: The system listens for state acknowledgment messages from the hardware. This ensures the backend and frontend are always in sync with the actual state of the physical devices.

- **Autonomous Hardware Logic Support (Edge Logic)**: The architecture supports hardware that can make autonomous decisions (e.g., turn on a fan if the temperature exceeds a threshold) and report its new state back to the server for seamless synchronization.

- **Reporting System**: Generate detailed statistical reports (average, minimum, maximum, count) for any sensor over custom date ranges using MongoDB's aggregation framework.

- **Modular & Scalable Architecture**: Logically separated controllers, models, and routes make the codebase easy to maintain, test, and extend.


## Technology Stack

- **Platform:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **IoT Protocol:** MQTT
- **Real-time Client Communication:** Socket.IO
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **Validation:** express-validator
- **Environment Management:** dotenv


## Project Architecture

The system uses a decoupled, event-driven architecture to ensure reliability and real-time performance.



1.  **Data Ingestion (Sensor → Backend):** Hardware sensors publish data to specific MQTT topics (e.g., `greenhouse/temperature`). The backend's MQTT client subscribes to these topics, saves the data to MongoDB, and pushes a `sensor_update` event to all connected web clients via Socket.IO.

2.  **Command Dispatch (Client → Backend → Hardware):** A user sends a command from the frontend to a secure API endpoint. The backend validates the request and publishes a command message to the `greenhouse/control/command` MQTT topic. The hardware subscribes to this topic and executes the command.

3.  **State Synchronization (Hardware → Backend → Client):** After executing a command or taking autonomous action, the hardware publishes a complete JSON payload of its current state to the `greenhouse/state/relay` topic. The backend receives this "acknowledgment," processes it, and emits a `relay_state_update` event via Socket.IO to synchronize all client dashboards with the ground truth.


## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- An MQTT Broker (e.g., Mosquitto, EMQ X)

### Installation

1.  Clone the repository:
    ```bash
    git clone [your-repo-url]
    cd [your-repo-name]
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env` file in the root directory and populate it with your configuration:
    ```env
    # Server Port
    PORT=2000

    # MongoDB Connection URI
    MONGODB_URI=mongodb://localhost:27017/smart_greenhouse

    # JWT Secrets (use long, random strings in production)
    ACCESS_TOKEN_SECRET=your_strong_access_token_secret
    REFRESH_TOKEN_SECRET=your_strong_refresh_token_secret

    # MQTT Broker URL
    MQTT_BROKER_URL=mqtt://localhost:1883
    ```

4.  Run the server:
    ```bash
    npm start
    ```

The server will be available at `http://localhost:2000`.


## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` – Register a new user.
- `POST /auth/login` – Login and receive tokens in secure cookies.
- `POST /auth/refresh` – Get a new access token using a refresh token.
- `POST /auth/logout` – Invalidate the user session.

### Sensor Data (`/`)
- `GET /sensor-summary` – Get a summary of the latest sensor readings.
- `GET /sensor-last10` – Get the last 10 historical records for each sensor.

### Control (`/`)
- `GET /get-control` – Get the last known actuator status from the server.
- `POST /set-control` – Update actuator status.
  - **Request Body:** `{ "fan": 1, "lamp": 0, "pump": 1, "valve": 0 }`

### Reporting (`/`)
- `GET /reports` – Generate a statistical report.
  - **Query Params:** `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Location (`/location` - Future Implementation)
- `GET /location/last` – Get the last reported GPS location.


## MQTT Topics

### Topics Subscribed To by Backend (Incoming Data)
- `greenhouse/temperature`: For temperature sensor data.
- `greenhouse/humidity`: For humidity sensor data.
- `greenhouse/soil`: For soil moisture sensor data.
- `greenhouse/state/relay`: For receiving full state/ack messages from hardware.
- `greenhouse/location`: For receiving GPS data.

### Topics Published To by Backend (Outgoing Commands)
- `greenhouse/control/command`: For sending control commands to hardware.


## Programmer
**Shady Nikooei**
