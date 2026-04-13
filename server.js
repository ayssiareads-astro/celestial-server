const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json());

const USER_ID = "652123";
const API_KEY = "ak-4803abdc5f22b1d84fe9cf319a3bb889eb227dae";
const AUTH = "Basic " + Buffer.from(USER_ID + ":" + API_KEY).toString("base64");

async function geocode(city, state) {
  const q = state && state !== "Outside the US" ? city + ", " + state + ", USA" : city;
  const r = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(q) + "&format=json&limit=1", { headers: { "User-Agent": "CelestialApp/1.0" } });
  const d = await r.json();
  if (!d.length) throw new Error("City not found.");
  return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), tzone: Math.round(parseFloat(d[0].lon) / 15) };
}

app.post("/chart", async (req, res) => {
  try {
    const { birthDate, birthTime, birthCity, birthState } = req.body;
    if (!birthDate || !birthCity) return res.status(400).json({ error: "Missing fields." });
    const { lat, lon, tzone } = await geocode(birthCity, birthState);
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, min] = birthTime ? birthTime.split(":").map(Number) : [12, 0];
    const astroRes = await fetch("https://json.astrologyapi.com/v1/western_horoscope", {
      method: "POST",
      headers: { "Authorization": AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ day, month, year, hour, min, lat, lon, tzone, house_type: "placidus", is_asteroids: "false" })
    });
    if (!astroRes.ok) return res.status(astroRes.status).json({ error: await astroRes.text() });
    res.json(await astroRes.json());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.json({ status: "running" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log("Server started on port " + PORT));
