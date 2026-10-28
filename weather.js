// const API_KEY = "fa928432b9e931787b92c3138715d6f5";

// const cityInput = document.getElementById("cityInput");
// const searchBtn = document.getElementById("searchBtn");
// const weatherCard = document.getElementById("weatherCard");
// const loading = document.getElementById("loading");
// const error = document.getElementById("error");


// async function getWeather(city) {

//     const url =
//         `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${"fa928432b9e931787b92c3138715d6f5"}&units=metric`;

//     const response = await fetch(url);

//     if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.message);
//     }

//     const data = await response.json();

//     return data;
// }


// async function searchWeather() {

//     const city = cityInput.value.trim();

//     if (city === "") {
//         error.textContent = "Please enter a city";
//         return;
//     }

//     try {

//         loading.style.display = "block";
//         error.textContent = "";
//         weatherCard.style.display = "none";

//         const data = await getWeather(city);

//         weatherCard.innerHTML = `
//             <h2> ${data.name}</h2>

//             <p>Temperature: ${Math.round(data.main.temp)}°C</p>

//             <p> Feels Like: ${Math.round(data.main.feels_like)}°C</p>

//             <p> Weather: ${data.weather[0].description}</p>

//             <p> Humidity: ${data.main.humidity}%</p>

//             <p> Wind: ${data.wind.speed} m/s</p>
//         `;

//         weatherCard.style.display = "block";

//     }
//     catch (err) {

//         error.textContent = err.message;

//     }
//     finally {

//         loading.style.display = "none";

//     }
// }


// searchBtn.addEventListener("click", searchWeather);



const API_KEY = "fa928432b9e931787b92c3138715d6f5";


const cityInput = document.getElementById("cityInput");
const searchForm = document.getElementById("searchForm");
const searchBtn = document.getElementById("searchBtn");
const weatherSection = document.getElementById("weatherSection");
const weatherCard = document.getElementById("weatherCard");
const forecastCards = document.getElementById("forecastCards");
const favoritesList = document.getElementById("favoritesList");
const favoriteCount = document.getElementById("favoriteCount");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const themeBtn = document.getElementById("themeBtn");

let debounceTimer;
let requestNumber = 0;


let favorites = JSON.parse(
    localStorage.getItem("weatherFavorites") || "[]"
);

const savedTheme = localStorage.getItem("weatherTheme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
}

updateThemeButton();
renderFavorites();


function getWeatherIcon(condition) {
    const icons = {
        Clear: "☀️",
        Clouds: "☁️",
        Rain: "🌧️",
        Drizzle: "🌦️",
        Thunderstorm: "⛈️",
        Snow: "❄️",
        Mist: "🌫️",
        Fog: "🌫️",
        Haze: "🌫️",
        Smoke: "🌫️",
        Dust: "🌫️",
        Sand: "🌫️",
        Ash: "🌫️",
        Squall: "💨",
        Tornado: "🌪️"
    };

    return icons[condition] || "🌤️";
}


async function fetchWeatherData(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Unable to fetch weather data."
        );
    }

    return data;
}


async function getWeather(city) {
    const url =
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    const data = await fetchWeatherData(url);

    
    return {
        city: data.name,
        country: data.sys.country,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed
    };
}


async function getForecast(city) {
    const url =
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    const data = await fetchWeatherData(url);

    // Group forecast entries by calendar date
    const dailyForecasts = new Map();

    data.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];

        if (!dailyForecasts.has(date)) {
            dailyForecasts.set(date, []);
        }

        dailyForecasts.get(date).push(item);
    });

    return Array.from(dailyForecasts.entries())
        .map(([date, entries]) => {
            const middayEntry = entries.reduce((closest, item) => {
                const hour = Number(item.dt_txt.split(" ")[1].slice(0, 2));
                const closestHour = Number(
                    closest.dt_txt.split(" ")[1].slice(0, 2)
                );

                return Math.abs(hour - 12) <
                    Math.abs(closestHour - 12)
                    ? item
                    : closest;
            });

            return {
                date,
                temp: Math.round(middayEntry.main.temp),
                description: middayEntry.weather[0].description,
                condition: middayEntry.weather[0].main
            };
        })
        .slice(0, 5);
}


function renderWeather(weather) {
    const isFavorite = favorites.some(
        city => city.toLowerCase() === weather.city.toLowerCase()
    );

    weatherCard.innerHTML = `
        <div>
            <p>${weather.country}</p>
            <h2>${weather.city}</h2>
            <p class="weather-description">${weather.description}</p>
            <p class="temperature">${weather.temp}°C</p>

            <div class="weather-details">
                <span>Feels like: ${weather.feelsLike}°C</span>
                <span>Humidity: ${weather.humidity}%</span>
                <span>Wind: ${weather.windSpeed} m/s</span>
            </div>

            <button class="favorite-btn" id="favoriteBtn" type="button">
                ${isFavorite ? "★ Remove favorite" : "☆ Add to favorites"}
            </button>
        </div>

        <div class="weather-icon" aria-hidden="true">
            ${getWeatherIcon(weather.condition)}
        </div>
    `;

    document.getElementById("favoriteBtn").addEventListener(
        "click",
        () => toggleFavorite(weather.city)
    );
}


function renderForecast(forecasts) {
    forecastCards.innerHTML = forecasts.map(day => {
        const date = new Date(`${day.date}T12:00:00`);

        const dayName = date.toLocaleDateString("en", {
            weekday: "short"
        });

        const formattedDate = date.toLocaleDateString("en", {
            day: "numeric",
            month: "short"
        });

        return `
            <article class="forecast-card">
                <p class="day">${dayName}, ${formattedDate}</p>
                <p class="forecast-icon">
                    ${getWeatherIcon(day.condition)}
                </p>
                <p class="forecast-temp">${day.temp}°C</p>
                <p class="forecast-description">${day.description}</p>
            </article>
        `;
    }).join("");
}


async function searchWeather(city) {
    const searchId = ++requestNumber;

    if (!city.trim()) {
        error.textContent = "Please enter a city name.";
        return;
    }

    if (API_KEY === "YOUR_API_KEY_HERE") {
        error.textContent = "Please add your OpenWeatherMap API key.";
        return;
    }

    loading.hidden = false;
    error.textContent = "";
    searchBtn.disabled = true;

    try {
        
        const [weather, forecasts] = await Promise.all([
            getWeather(city),
            getForecast(city)
        ]);

        
        if (searchId !== requestNumber) return;

        renderWeather(weather);
        renderForecast(forecasts);

        weatherSection.hidden = false;
    } catch (err) {
        if (searchId !== requestNumber) return;

        weatherSection.hidden = true;

        if (err.message === "city not found") {
            error.textContent =
                "City not found. Please check the spelling and try again.";
        } else {
            error.textContent =
                `Could not load weather: ${err.message}`;
        }
    } finally {
        if (searchId === requestNumber) {
            loading.hidden = true;
            searchBtn.disabled = false;
        }
    }
}

function saveFavorites() {
    localStorage.setItem(
        "weatherFavorites",
        JSON.stringify(favorites)
    );
}


function toggleFavorite(city) {
    const existingIndex = favorites.findIndex(
        item => item.toLowerCase() === city.toLowerCase()
    );

    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(city);
    }

    saveFavorites();
    renderFavorites();

    
    if (!weatherSection.hidden) {
        const currentCity = weatherCard.querySelector("h2")?.textContent;

        if (currentCity) {
            
            const button = document.getElementById("favoriteBtn");

            if (button) {
                button.textContent = favorites.some(
                    item => item.toLowerCase() ===
                        currentCity.toLowerCase()
                )
                    ? "★ Remove favorite"
                    : "☆ Add to favorites";
            }
        }
    }
}


function renderFavorites() {
    favoriteCount.textContent =
        `${favorites.length} ${favorites.length === 1 ? "city" : "cities"}`;

    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <p class="empty-favorites">
                No favorite cities yet. Search for a city and add it here.
            </p>
        `;
        return;
    }

    favoritesList.innerHTML = favorites.map(city => `
        <div class="favorite-item">
            <button
                class="favorite-city"
                type="button"
                data-city="${city}"
            >📍 ${city}</button>

            <button
                class="remove-favorite"
                type="button"
                data-remove="${city}"
                aria-label="Remove ${city} from favorites"
            >×</button>
        </div>
    `).join("");

    favoritesList.querySelectorAll("[data-city]").forEach(button => {
        button.addEventListener("click", () => {
            cityInput.value = button.dataset.city;
            searchWeather(button.dataset.city);
        });
    });

    favoritesList.querySelectorAll("[data-remove]").forEach(button => {
        button.addEventListener("click", () => {
            toggleFavorite(button.dataset.remove);
        });
    });
}


cityInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    const city = cityInput.value.trim();

    
    if (city.length < 2) {
        ++requestNumber;
        loading.hidden = true;
        searchBtn.disabled = false;
        error.textContent = "";
        return;
    }

    debounceTimer = setTimeout(() => {
        searchWeather(city);
    }, 500);
});


searchForm.addEventListener("submit", event => {
    event.preventDefault();

    clearTimeout(debounceTimer);
    searchWeather(cityInput.value.trim());
});


function updateThemeButton() {
    themeBtn.textContent = document.body.classList.contains("dark")
        ? "☀️ Light mode"
        : "🌙 Dark mode";
}

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem("weatherTheme", theme);
    updateThemeButton();
});
