# Myriad IOT Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-username/Myriad_IOT_Dashboard)

A dynamic and highly customizable web dashboard for visualizing your real-time MQTT data streams. Built with vanilla JavaScript, Myriad allows you to build the interface you need to monitor your IoT ecosystem with no server-side configuration required.

## Live Demo

**[Try Myriad IOT Dashboard Now](https://nonamedcat.github.io/Myriad_IOT_Dashboard/)**

(https://github.com/NoNamedCat/Myriad_IOT_Dashboard/blob/main/screenshots/Screenshot1.png?raw=true)


## Core Features

-   **Interactive Grid System:** Fully customizable layouts using a drag, drop, and resize grid powered by GridStack.js.
-   **Wide Variety of Widgets:** From simple text displays and buttons to complex charts, gauges, and geolocation maps.
-   **Real-time MQTT Connectivity:** Connects to any standard MQTT broker over WebSockets. Features auto-connect and auto-reconnect capabilities.
-   **Highly Customizable:**
    -   Multiple visual themes (Light, Dark, Sepia, Ocean, and more).
    -   Per-widget configuration for topics, colors, and behavior.
    -   Configurable grid size and client connection settings.
-   **Zero Dependencies & Full Portability:**
    -   Runs entirely in the browser. Just serve the static files.
    -   Save and load dashboard layouts to your local machine.
    -   Share your entire dashboard configuration—including connection settings, widgets, and theme—via a single, shareable URL.

## Getting Started

No complex setup is required. The project can be run locally with Python.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/Myriad_IOT_Dashboard.git](https://github.com/your-username/Myriad_IOT_Dashboard.git)
    cd Myriad_IOT_Dashboard
    ```

2.  **Run the local server:**
    The included Python script will automatically generate the `widgets.json` file and start a web server.
    ```bash
    python serve.py
    ```

3.  **Open the dashboard:**
    The script will automatically open a new tab in your browser. If not, navigate to `http://localhost:8080`.

## How to Use

#### 1. Connecting to an MQTT Broker

Use the top panel to configure your connection:
-   **Broker/Port:** Your MQTT broker's address and WebSocket port.
-   **SSL:** Check the box to use a secure connection (`wss://`).
-   **Client ID:** Use a random ID (default) or provide a custom one.
-   The dashboard will attempt to connect automatically on load and will try to reconnect if the connection is lost unexpectedly.

#### 2. Adding and Arranging Widgets

-   Select a widget type from the dropdown menu and click **"Añadir widget"** (Add Widget).
-   Drag widgets by their header to move them.
-   Resize widgets by dragging their bottom-right corner.
-   Click the **⚙️ (gear)** icon to configure a widget's topic, JSON path, and other options.
-   Click the **✖ (cross)** icon to delete a widget.

#### 3. Saving and Sharing

-   **Save Local:** Saves the current layout, widgets, and their configurations to your browser's `localStorage`.
-   **Load Local:** Loads the last saved layout from your browser.
-   **Share URL:** Generates a unique URL containing your entire dashboard state (layout, widgets, and connection settings). Copy this URL to save or share your exact setup.

## Technology Stack

-   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
-   **Grid System:** [GridStack.js](https://gridstackjs.com/)
-   **MQTT Client:** [Eclipse Paho MQTT JavaScript Client](https://www.eclipse.org/paho/index.php?page=clients/js/index.php)
-   **Charting:** [Chart.js](https://www.chartjs.org/)
-   **Mapping:** [Leaflet.js](https://leafletjs.com/)

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
