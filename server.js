const express = require(“express”);
const cors = require(“cors”);
const fetch = require(“node-fetch”);

const app = express();
app.use(cors());
app.use(express.json());

const ASTRO_USER_ID = “652123”;
const ASTRO_API_KEY = “ak-4803abdc5f22b1d84fe9cf319a3bb889eb227dae”;
const ASTRO_BASE = “https://json.astrologyapi.com/v1”;
const ASTRO_AUTH = “Basic “ + Buffer.from(`${ASTRO_USER_ID}:${ASTRO_API_KEY}`).toString(“base64”);

// Geocode city + state → lat, lon, tzone
async function geocodeCity(city, state) {
const query = state && state !== “Outside the US”
? `${city}, ${state}, USA`
: city;
const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
const res = await fetch(url, {
headers: { “User-Agent”: “CelestialInsightsApp/1.0” }
});
const data = await res.json();
if (!data.length) throw new Error(“City not found. Please check the spelling.”);
const lat = parseFloat(data[0].lat);
const lon = parseFloat(data[0].lon);
const tzone = Math.round(lon / 15);
return { lat, lon, tzone };
}

// POST /chart — main endpoint
app.post(”/chart”, async (req, res) => {
try {
const { birthDate, birthTime, birthCity, birthState } = req.body;

```
if (!birthDate || !birthCity) {
  return res.status(400).json({ error: "birthDate and birthCity are required." });
}

// Geocode
const { lat, lon, tzone } = await geocodeCity(birthCity, birthState);

// Parse date & time
const [year, month, day] = birthDate.split("-").map(Number);
const [hour, min] = birthTime ? birthTime.split(":").map(Number) : [12, 0];

// Call AstrologyAPI
const body = {
  day, month, year,
  hour, min,
  lat, lon,
  tzone,
  house_type: "placidus",
  is_asteroids: "false"
};

const astroRes = await fetch(`${ASTRO_BASE}/western_horoscope`, {
  method: "POST",
  headers: {
    "Authorization": ASTRO_AUTH,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

if (!astroRes.ok) {
  const errText = await astroRes.text();
  return res.status(astroRes.status).json({ error: `AstrologyAPI error: ${errText}` });
}

const data = await astroRes.json();
return res.json(data);
```

} catch (err) {
console.error(“Server error:”, err.message);
return res.status(500).json({ error: err.message });
}
});

// Health check
app.get(”/”, (req, res) => res.json({ status: “Celestial Insights server is running ✦” }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
