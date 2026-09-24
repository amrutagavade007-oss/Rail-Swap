const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/auth");
const journeyRoutes = require("./routes/journeys");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/journeys", journeyRoutes);

app.get("/", (req, res) => {
    res.send("RailSwap Backend is Running!");
});

app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS db_ok");

        res.json({
            server: "ok",
            database: rows[0].db_ok === 1 ? "ok" : "error"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            server: "ok",
            database: "error"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`RailSwap server running on http://localhost:${PORT}`);
});