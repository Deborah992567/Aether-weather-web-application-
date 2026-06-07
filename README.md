# ⬡ Aether Weather

Aether is a high-performance, modernized weather dashboard featuring a glassmorphism interface and a dynamic canvas-based atmospheric engine. Unlike standard weather apps, Aether simulates the current weather conditions directly on your screen using a custom particle system.

![Version](https://img.shields.io/badge/version-1.0.0-6ae4ff?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-white?style=for-the-badge)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow?style=for-the-badge)

## ⚡ Key Features

- **Dynamic Atmospheric Engine**: A custom HTML5 Canvas system that renders real-time rain, snow, drifting clouds, or twinkling stars based on local conditions.
- **Smart Theming**: Context-aware UI that transitions through Morning, Afternoon, Evening, and Night modes, as well as specific "Storm" and "Fog" visual states.
- **Handcoded Atmosphere Metrics**:
    - **UV Index Estimation**: Derived via solar position and cloud-cover algorithms.
    - **Dew Point Calculation**: Real-time approximation using the Magnus formula.
    - **Wind Analysis**: Tracks direction and gust intensity.
- **Interactive Forecasts**: 3-hourly and 7-day data visualization powered by OpenWeather.
- **Personalized Experience**:
    - **Smart Guide**: Clothing and activity recommendations based on temperature and precipitation.
    - **Persistence**: Favorite cities and search history stored locally via `LocalStorage`.
    - **Real-time Suggestions**: Debounced search input for city geocoding.

## 🎨 UI Design

Aether utilizes a "Glassmorphism" design language:
- **Backdrop Blurs**: Heavy saturation and 20px blurs for a frosted glass effect.
- **Typography**: A bold pairing of `Syne` for headings and `DM Sans` for data clarity.
- **Animated Icons**: Integrated **Skycons** for smooth, canvas-drawn weather glyphs.

## 🛠️ Technical Stack

| Component | Technology |
| :--- | :--- |
| **Styling** | CSS3 (Custom Properties, Flexbox, Grid) |
| **Logic** | Vanilla JavaScript (ES6+) |
| **Icons** | Skycons (Canvas API) |
| **Background** | HTML5 Canvas Particle System |
| **API** | OpenWeather Map (Current, Forecast, Pollution, Geocoding) |

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/aether-weather.git
   ```

2. **Configure the API Key:**
   The application is currently configured with a demo API key in `script.js`. For production use, please replace it:
   ```javascript
   const API_KEY = 'YOUR_OPENWEATHER_API_KEY';
   ```

3. **Run the App:**
   Simply open `index.html` in any modern web browser.

## 📂 Project Structure

```text
.
├── index.html      # Structure & Canvas setup
├── style.css       # Glassmorphism & Theme definitions
├── script.js      # API handling, Particle engine & UI logic
└── README.md       # Project documentation
```

## 🧠 Architecture Highlights

### The Particle Engine
The `WeatherBackground` class manages the animation loop. It uses `requestAnimationFrame` for 60fps performance and intelligently throttles particle counts based on the weather effect (e.g., 150 particles for Rain vs 80 for Night Stars) to ensure smooth performance on mobile devices.

### UV Index Modeling
Since standard free-tier APIs often omit UV data, Aether calculates an estimate based on:
1. Distance from solar noon.
2. Cloud coverage percentage.
3. Current precipitation type.

---

*Designed with ⬡ by the Aether Team.*

<!-- 
  Note: This project was built to showcase high-end front-end capabilities 
  without the need for heavy frameworks. 
-->