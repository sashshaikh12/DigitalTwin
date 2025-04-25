# AC Digital Twin

An interactive 3D simulation of an air conditioning system that visualizes airflow patterns and temperature changes based on real-world data. This digital twin uses Three.js for 3D rendering and particle simulation to visualize how air conditioning affects room temperature.


## Features

- 3D visualization of a room with an air conditioning unit and window
- Particle system simulation showing airflow from AC unit and window
- Real-time simulation based on CSV time-series data
- Interactive controls for camera movement
- Visual representation of AC on/off state, window open/closed state, and temperature
- Responsive design that works across devices

## Live Demo

Visit the live demo: [AC Digital Twin on Vercel](https://digital-twin-blush.vercel.app/)

## Technical Overview

This project combines 3D visualization using Three.js with time-series simulation data to create a digital twin of an air conditioning system. 

### Key Components

- **3D Rendering**: Three.js with GLTF/GLB models and Draco compression
- **Particle Systems**: Custom particle system for visualizing air movement
- **Data Processing**: CSV parsing with PapaParse
- **User Interface**: Minimalist UI showing current simulation state

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- For local development: Python 3.6+ for running the local server

### Local Development

1. Clone this repository:
```bash
git clone <repository-url>
cd ac-digital-twin
```

2. Download dependencies (Three.js and PapaParse):
```bash
python download_deps.py
```

3. Start the local server:
```bash
python server.py
```

4. Open your browser and navigate to:
```
http://localhost:8000/
```

## Project Structure

- `main.js` - Core application logic and Three.js implementation
- `index.html` - HTML entry point with UI elements and import configuration
- `room_ac_model.compressed.glb` - 3D model with Draco compression
- `ac_input_dynamic_balanced.csv` - Time-series simulation data
- `js/` - Dependencies including Three.js and PapaParse
- `download_deps.py` - Script to download dependencies
- `server.py` - Simple HTTP server for local development
- `vercel.json` - Deployment configuration for Vercel

## Data Format

The simulation uses CSV data with the following columns:
- `Time` - Time of day
- `AC State` - Air conditioner state (1 = ON, 0 = OFF)
- `Window State` - Window state (1 = OPEN, 0 = CLOSED)
- `AC Temperature (°C)` - Temperature setting of the AC
- `room temperature` - Ambient room temperature

## Deployment

This project is configured for easy deployment to Vercel:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

## Performance Optimizations

- 3D model uses Draco compression to reduce file size
- External Draco decoder loaded from CDN
- Efficient particle system with optimized update logic
- Loading screen to enhance user experience during initialization
- Error handling for graceful degradation


## Acknowledgements

- Three.js for 3D rendering capabilities
- PapaParse for CSV parsing
- Draco library for 3D model compression
