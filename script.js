// script.js

const API_KEY = '40776d44d9931a37888c16a0b5989c5e';

const DOM = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('search-input'),
    geoBtn: document.getElementById('location-btn'),
    cityName: document.getElementById('city-name'),
    countryName: document.getElementById('country-name'),
    currentTemp: document.getElementById('hero-temp'),
    conditionText: document.getElementById('condition-text'),
    humidity: document.getElementById('stat-humidity'),
    windSpeed: document.getElementById('stat-wind'),
    pressure: document.getElementById('stat-pressure'),
    visibility: document.getElementById('stat-vis'),
    feelsLike: document.getElementById('feels-like'),
    localTime: document.getElementById('local-time'),
    uvValue: document.getElementById('uv-val'),
    aqiValue: document.getElementById('aqi-val'),
    aqiLabel: document.getElementById('aqi-label'),
    sunrise: document.getElementById('sunrise-val'),
    sunset: document.getElementById('sunset-val'),
    windDir: document.getElementById('wind-dir-val'),
    windGust: document.getElementById('wind-gust-val'),
    uvLabel: document.getElementById('uv-label'),
    dewPoint: document.getElementById('dew-val'),
    cloudCover: document.getElementById('cloud-val'),
    pm25: document.getElementById('pm25'),
    pm10: document.getElementById('pm10'),
    hourlyContainer: document.getElementById('hourly-list'),
    weeklyContainer: document.getElementById('forecast-list'),
    dashboard: document.getElementById('dashboard'),
    loadingScreen: document.getElementById('loading-screen'),
    errorScreen: document.getElementById('error-screen'),
    favoritesToggle: document.getElementById('favorites-toggle'),
    favsCard: document.getElementById('favs-card'),
    weatherIconCanvas: document.getElementById('weather-icon-canvas'),
    favsList: document.getElementById('favs-list'),
    historyList: document.getElementById('history-list'),
    favThisBtn: document.getElementById('fav-this-btn'),
    searchContainer: document.querySelector('.search-container'),
    suggestionsContainer: document.getElementById('search-suggestions'),
    recommendations: document.getElementById('recommendations'),
    bgCanvas: document.getElementById('bg-canvas')
};

let weatherBackground;
let skycons;
let favorites = readStoredList('aether-favorites');
let history = readStoredList('aether-recent');
let currentCityName = "";
let lastRequestedCity = localStorage.getItem('aether-last-city') || 'London';

function readStoredList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch (error) {
        localStorage.removeItem(key);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Skycons is optional: a blocked CDN must not prevent the dashboard from loading.
    if (typeof window.Skycons !== 'undefined') {
        skycons = new window.Skycons({ color: 'white', resizeClear: true });
    }
    weatherBackground = new WeatherBackground(DOM.bgCanvas);
    DOM.searchForm.addEventListener('submit', handleSearchSubmit);
    DOM.geoBtn.addEventListener('click', handleGeolocation);
    document.getElementById('retry-btn').addEventListener('click', () => fetchWeatherByCity(lastRequestedCity));
    DOM.favoritesToggle.addEventListener('click', () => {
        DOM.favsCard.classList.toggle('hidden');
    });

    DOM.favThisBtn.addEventListener('click', toggleFavorite);

    // Initial load of favorites and history
    renderFavorites();
    renderHistory();

    // Search Suggestions Logic
    let debounceTimer;
    DOM.cityInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 3) {
            DOM.suggestionsContainer.classList.remove('open');
            return;
        }
        debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!DOM.searchContainer.contains(e.target)) {
            DOM.suggestionsContainer.classList.remove('open');
        }
    });
    
    // Load last searched city or default to London
    const lastCity = localStorage.getItem('aether-last-city');
    fetchWeatherByCity(lastCity || "London");
});

async function handleSearchSubmit(event) {
    event.preventDefault();
    const city = DOM.cityInput.value.trim();
    if (!city) return;
    fetchWeatherByCity(city);
}

async function handleGeolocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            showLoadingState();
            const weatherData = await fetchWeatherData(latitude, longitude);
            updateUI(weatherData, "Current Location");
        } catch (error) {
            handleError(error.message);
        }
    }, (error) => handleError(error.message || 'Unable to get your location.'));
}

async function fetchWeatherByCity(city) {
    lastRequestedCity = city;
    try {
        showLoadingState();
        const geoData = await getCoordinates(city);
        const weatherData = await fetchWeatherData(geoData.lat, geoData.lon);
        updateUI(weatherData, geoData.name);
    } catch (error) {
        handleError(error.message);
    }
}

async function getCoordinates(city) {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const response = await fetch(geoUrl);
    if (!response.ok) throw new Error('Geocoding service failed.');
    const data = await response.json();
    if (!data || data.length === 0) throw new Error('City not found.');

    const result = data[0];
    return {
        lat: result.lat,
        lon: result.lon,
        name: `${result.name}, ${result.country || ''}`
    };
}

async function fetchWeatherData(lat, lon) {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    
    const [currentRes, forecastRes, aqiRes] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl),
        fetch(aqiUrl)
    ]);

    if (!currentRes.ok || !forecastRes.ok || !aqiRes.ok) throw new Error('Could not retrieve weather data.');
    
    return {
        current: await currentRes.json(),
        forecast: await forecastRes.json(),
        aqi: await aqiRes.json()
    };
}

/**
 * Maps OpenWeather icon codes to Skycons constants
 */
function updateWeatherIcon(iconCode) {
    if (!skycons) {
        drawWeatherIconFallback(iconCode);
        return;
    }
    const iconMap = {
        "01d": window.Skycons.CLEAR_DAY,
        "01n": window.Skycons.CLEAR_NIGHT,
        "02d": window.Skycons.PARTLY_CLOUDY_DAY,
        "02n": window.Skycons.PARTLY_CLOUDY_NIGHT,
        "03d": window.Skycons.CLOUDY,
        "03n": window.Skycons.CLOUDY,
        "04d": window.Skycons.CLOUDY,
        "04n": window.Skycons.CLOUDY,
        "09d": window.Skycons.RAIN,
        "09n": window.Skycons.RAIN,
        "10d": window.Skycons.RAIN,
        "10n": window.Skycons.RAIN,
        "11d": window.Skycons.RAIN,
        "13d": window.Skycons.SNOW,
        "50d": window.Skycons.FOG
    };
    skycons.set(DOM.weatherIconCanvas, iconMap[iconCode] || window.Skycons.CLOUDY);
    skycons.play();
}

function drawWeatherIconFallback(iconCode) {
    const canvas = DOM.weatherIconCanvas;
    const ctx = canvas.getContext('2d');
    const symbol = iconCode.startsWith('01') ? '☀' :
        iconCode.startsWith('02') ? '⛅' :
        iconCode.startsWith('03') || iconCode.startsWith('04') ? '☁' :
        iconCode.startsWith('09') || iconCode.startsWith('10') || iconCode.startsWith('11') ? '🌧' :
        iconCode.startsWith('13') ? '❄' : '🌫';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '76px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, canvas.width / 2, canvas.height / 2 + 4);
}

async function fetchSuggestions(query) {
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        displaySuggestions(data);
    } catch (error) {
        console.error('Suggestions fetch failed:', error);
    }
}

function displaySuggestions(cities) {
    if (!cities || cities.length === 0) {
        DOM.suggestionsContainer.classList.remove('open');
        return;
    }

    DOM.suggestionsContainer.innerHTML = cities.map(city => {
        const stateStr = city.state ? `${city.state}, ` : '';
        return `
            <div class="suggestion-item" data-city="${city.name}" data-country="${city.country}">
                ${city.name}, ${stateStr}${city.country}
            </div>
        `;
    }).join('');

    DOM.suggestionsContainer.classList.add('open');

    // Handle clicking on a suggestion
    DOM.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const cityQuery = `${item.dataset.city}, ${item.dataset.country}`;
            DOM.cityInput.value = cityQuery;
            DOM.suggestionsContainer.classList.remove('open');
            fetchWeatherByCity(cityQuery);
        });
    });
}

function updateUI(data, fullCityName) {
    const { current, forecast, aqi } = data;
    const airQuality = aqi.list[0];
    currentCityName = fullCityName;
    
    // Determine if it's day or night at the location
    const isDay = current.dt > current.sys.sunrise && current.dt < current.sys.sunset;

    // Trigger Background Animation
    weatherBackground.setEffect(current.weather[0].main, isDay);
    updateThemeClass(current);
    updateWeatherIcon(current.weather[0].icon);
    updateFavoriteBtn();
    addToHistory(fullCityName);

    // Save as last searched city (avoiding "Current Location" generic string)
    if (fullCityName !== "Current Location") {
        localStorage.setItem('aether-last-city', fullCityName);
    }
    
    // Local Time Calculation
    const localDate = new Date((new Date().getTime()) + (current.timezone * 1000) + (new Date().getTimezoneOffset() * 60000));
    const timeString = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Basic Info
    DOM.cityName.textContent = fullCityName.split(',')[0];
    DOM.countryName.textContent = fullCityName.split(',').slice(1).join(',').trim();
    DOM.localTime.textContent = `Local time: ${timeString}`;
    DOM.currentTemp.textContent = `${Math.round(current.main.temp)}°`;
    DOM.feelsLike.textContent = `Feels like ${Math.round(current.main.feels_like)}°`;
    DOM.conditionText.textContent = current.weather[0].description;

    // Metrics
    DOM.humidity.textContent = `${current.main.humidity}%`;
    DOM.windSpeed.textContent = `${(current.wind.speed * 3.6).toFixed(1)} km/h`;
    DOM.pressure.textContent = `${current.main.pressure} hPa`;
    DOM.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    
    // Atmosphere Grid Handcoding
    const temp = current.main.temp;
    const humidity = current.main.humidity;
    const clouds = current.clouds.all;
    const mainWeather = current.weather[0].main;

    // 1. Dew Point Calculation (Magnus formula approximation)
    const dewPoint = (temp - ((100 - humidity) / 5)).toFixed(1);
    DOM.dewPoint.textContent = `${dewPoint}°`;

    // 2. Wind Direction & Gusts
    DOM.windDir.textContent = `${current.wind.deg}°`;
    DOM.windGust.textContent = current.wind.gust ? `Gust ${(current.wind.gust * 3.6).toFixed(1)} km/h` : 'Steady';

    // 3. Cloud Cover
    DOM.cloudCover.textContent = `${clouds}%`;

    // 4. UV Index Estimation (Derived from sun position, clouds, and weather)
    let uvIndex = 0;
    if (isDay) {
        const hour = localDate.getHours();
        const distFromNoon = Math.abs(12 - hour);
        uvIndex = Math.max(0, 10 - distFromNoon * 1.5); // Peak at noon
        if (clouds > 40) uvIndex *= 0.6; // Clouds block UV
        if (['Rain', 'Drizzle', 'Thunderstorm'].includes(mainWeather)) uvIndex *= 0.2;
    }
    const roundedUV = Math.round(uvIndex);
    DOM.uvValue.textContent = roundedUV;
    DOM.uvLabel.textContent = getUVDescription(roundedUV);

    // AQI
    const aqiIndex = airQuality.main.aqi;
    const aqiMap = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
    DOM.aqiValue.textContent = aqiIndex;
    DOM.aqiLabel.textContent = aqiMap[aqiIndex];
    DOM.pm25.textContent = airQuality.components.pm2_5.toFixed(1);
    DOM.pm10.textContent = airQuality.components.pm10.toFixed(1);

    // Sun
    const formatSunTime = (ts) => new Date((ts + current.timezone) * 1000).toISOString().substr(11, 5);
    DOM.sunrise.textContent = formatSunTime(current.sys.sunrise);
    DOM.sunset.textContent = formatSunTime(current.sys.sunset);

    // Recommendations
    const isRaining = ['Rain', 'Drizzle', 'Thunderstorm'].includes(mainWeather);

    let clothingRec = temp < 15 ? "It's chilly, wear a jacket." : "Warm out, light clothes are fine.";
    if (isRaining) clothingRec = "It's raining—bring an umbrella or a raincoat!";
    if (uvIndex >= 6) clothingRec += " High UV, wear sunscreen.";

    DOM.recommendations.innerHTML = `
        <div class="rec-item">
            <span class="rec-emoji">${isRaining ? '☔' : '👕'}</span>
            <div class="rec-text"><strong>Clothing</strong> ${clothingRec}</div>
        </div>
    `;

    // Hourly Forecast (OpenWeather provides 3-hour steps)
    DOM.hourlyContainer.innerHTML = forecast.list.slice(0, 8).map(item => `
        <div class="hour-item">
            <p class="hour-time">${new Date(item.dt * 1000).getHours()}:00</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon" width="30">
            <p class="hour-temp"><strong>${Math.round(item.main.temp)}°</strong></p>
        </div>
    `).join('');

    // Weekly Forecast
    const dailyData = forecast.list.filter(f => f.dt_txt.includes("12:00:00"));
    DOM.weeklyContainer.innerHTML = dailyData.map(item => {
        const day = new Date(item.dt * 1000).toLocaleDateString('en-US', {weekday: 'short'});
        return `
            <div class="forecast-row">
                <span class="forecast-day">${day}</span>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon" width="30">
                <span class="weekly-desc">${item.weather[0].main}</span>
                <span class="weekly-temps">
                    <strong>${Math.round(item.main.temp_max)}°</strong> 
                    <small>${Math.round(item.main.temp_min)}°</small>
                </span>
            </div>
        `;
    }).join('');

    clearLoadingState();
}

function getUVDescription(index) {
    if (index < 3) return "Low";
    if (index < 6) return "Moderate";
    if (index < 8) return "High";
    if (index < 11) return "Very High";
    return "Extreme";
}

function toggleFavorite() {
    if (!currentCityName || currentCityName === "Current Location") return;

    const index = favorites.indexOf(currentCityName);
    if (index === -1) {
        favorites.push(currentCityName);
    } else {
        favorites.splice(index, 1);
    }

    localStorage.setItem('aether-favorites', JSON.stringify(favorites));
    renderFavorites();
    updateFavoriteBtn();
}

function renderFavorites() {
    if (favorites.length === 0) {
        DOM.favsList.innerHTML = '<p class="api-note">No favorite cities added yet.</p>';
        return;
    }

    DOM.favsList.innerHTML = favorites.map(city => `
        <div class="fav-item" data-city="${city}">
            <span class="fav-name">${city.split(',')[0]}</span>
            <button class="fav-del" title="Remove">✕</button>
        </div>
    `).join('');

    DOM.favsList.querySelectorAll('.fav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-del')) {
                const cityToRemove = item.dataset.city;
                favorites = favorites.filter(f => f !== cityToRemove);
                localStorage.setItem('aether-favorites', JSON.stringify(favorites));
                renderFavorites();
                updateFavoriteBtn();
                return;
            }
            fetchWeatherByCity(item.dataset.city);
        });
    });
}

function updateFavoriteBtn() {
    const isFav = favorites.includes(currentCityName);
    DOM.favThisBtn.innerHTML = isFav ? '★ Favorite' : '☆ Add to Favorites';
    DOM.favThisBtn.classList.toggle('active', isFav);
}

function addToHistory(cityName) {
    if (!cityName || cityName === "Current Location") return;

    // Remove if already exists to move to top
    history = history.filter(item => item.name !== cityName);
    
    // Add new entry with current time
    history.unshift({
        name: cityName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Limit to 5 recent searches
    if (history.length > 5) history.pop();

    localStorage.setItem('aether-recent', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    if (!DOM.historyList) return;

    if (history.length === 0) {
        DOM.historyList.innerHTML = '<p class="api-note">No recent searches.</p>';
        return;
    }

    DOM.historyList.innerHTML = history.map(item => `
        <div class="history-item" data-city="${item.name}">
            <span class="history-name">${item.name.split(',')[0]}</span>
            <span class="history-time">${item.time}</span>
            <button class="history-del" title="Remove">✕</button>
        </div>
    `).join('');

    DOM.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-del')) {
                e.stopPropagation();
                const cityToRemove = item.dataset.city;
                history = history.filter(h => h.name !== cityToRemove);
                localStorage.setItem('aether-recent', JSON.stringify(history));
                renderHistory();
                return;
            }
            fetchWeatherByCity(item.dataset.city);
        });
    });
}

function showLoadingState() {
    DOM.loadingScreen.classList.remove('hidden');
    DOM.dashboard.classList.add('hidden');
    DOM.errorScreen.classList.add('hidden');
}

function clearLoadingState() {
    DOM.loadingScreen.classList.add('hidden');
    DOM.dashboard.classList.remove('hidden');
}

function handleError(msg) {
    DOM.loadingScreen.classList.add('hidden');
    DOM.dashboard.classList.add('hidden');
    DOM.errorScreen.classList.remove('hidden');
    document.getElementById('error-msg').textContent = msg;
}

function updateThemeClass(current) {
    const main = current.weather[0].main;
    const now = Date.now() / 1000;
    const isDay = now > current.sys.sunrise && now < current.sys.sunset;
    
    // Calculate city local hour
    const localDate = new Date((new Date().getTime()) + (current.timezone * 1000) + (new Date().getTimezoneOffset() * 60000));
    const hour = localDate.getHours();
    
    let theme = isDay ? 'theme-day' : 'theme-night';

    if (['Rain', 'Drizzle', 'Thunderstorm'].includes(main)) {
        theme = main === 'Thunderstorm' ? 'theme-storm' : 'theme-rain';
    } else if (main === 'Snow') {
        theme = 'theme-snow';
    } else if (['Mist', 'Fog', 'Haze'].includes(main)) {
        theme = 'theme-fog';
    } else if (isDay) {
        if (hour < 11) theme = 'theme-morning';
        else if (hour > 17) theme = 'theme-evening';
        else theme = 'theme-afternoon';
    }
    document.body.className = theme;
}

class WeatherBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.effect = 'Clear';
        this.isDay = true;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initParticles();
    }

    setEffect(weatherMain, isDay) {
        this.isDay = isDay;
        const effectMap = {
            'Rain': 'Rain', 'Drizzle': 'Rain', 'Thunderstorm': 'Rain',
            'Snow': 'Snow',
            'Clouds': 'Clouds',
            'Clear': 'Clear',
            'Mist': 'Clouds', 'Fog': 'Clouds', 'Haze': 'Clouds'
        };
        this.effect = effectMap[weatherMain] || 'Clear';
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        let count = 0;
        if (this.effect === 'Rain') count = 150;
        else if (this.effect === 'Snow') count = 100;
        else if (this.effect === 'Clouds') count = 20;
        // Show stars only if it's night and clear
        else if (this.effect === 'Clear' && !this.isDay) count = 80;

        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (this.effect === 'Rain') {
            return { x: Math.random() * w, y: Math.random() * h, l: Math.random() * 20 + 10, v: Math.random() * 10 + 10 };
        } else if (this.effect === 'Snow') {
            return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 3 + 1, v: Math.random() * 1 + 0.5, d: Math.random() * 1 - 0.5 };
        } else if (this.effect === 'Clouds') {
            return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 100 + 50, v: Math.random() * 0.2 + 0.1, o: Math.random() * 0.2 };
        } else { // Night Stars
            return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5, o: Math.random(), s: Math.random() * 0.02 };
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => {
            if (this.effect === 'Rain') {
                this.ctx.strokeStyle = 'rgba(106, 228, 255, 0.4)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x, p.y + p.l);
                this.ctx.stroke();
                p.y += p.v;
                if (p.y > this.canvas.height) p.y = -p.l;
            } else if (this.effect === 'Snow') {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                p.y += p.v;
                p.x += p.d;
                if (p.y > this.canvas.height) p.y = -p.r;
                if (p.x > this.canvas.width) p.x = 0;
                else if (p.x < 0) p.x = this.canvas.width;
            } else if (this.effect === 'Clouds') {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.o})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                p.x += p.v;
                if (p.x - p.r > this.canvas.width) p.x = -p.r;
            } else if (this.effect === 'Clear' && !this.isDay) {
                // Twinkling Stars
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.o})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                p.o += p.s;
                if (p.o > 1 || p.o < 0) p.s = -p.s;
            }
        });
        requestAnimationFrame(() => this.animate());
    }
}
