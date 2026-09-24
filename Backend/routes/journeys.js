const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ==========================================
// JOIN JOURNEY
// ==========================================

router.post("/join", async (req, res) => {

    try {

        const {
            user_id,
            train_number,
            journey_date,
            source,
            destination,
            coach_number,
            seat_number,
            current_berth,
            desired_berth
        } = req.body;


        // Check required fields
        if (
            !user_id ||
            !train_number ||
            !journey_date ||
            !source ||
            !destination ||
            !coach_number ||
            !seat_number ||
            !current_berth ||
            !desired_berth
        ) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }


        // ==========================================
        // CREATE UNIQUE JOURNEY ID
        // ==========================================

        const journey_id =
            `${train_number}_${journey_date}_${source}_${destination}`
            .replace(/\s+/g, "_")
            .toLowerCase();


        // ==========================================
        // CHECK IF JOURNEY ALREADY EXISTS
        // ==========================================

        const [existingJourney] = await pool.query(
            "SELECT journey_id FROM journeys WHERE journey_id = ?",
            [journey_id]
        );


        // ==========================================
        // CREATE JOURNEY IF IT DOES NOT EXIST
        // ==========================================

        if (existingJourney.length === 0) {

            await pool.query(
                `INSERT INTO journeys
                (journey_id, train_number, journey_date, source, destination)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    journey_id,
                    train_number,
                    journey_date,
                    source,
                    destination
                ]
            );

        }


        // ==========================================
        // ADD PASSENGER
        // ==========================================

        const [result] = await pool.query(
            `INSERT INTO passengers
            (
                user_id,
                journey_id,
                coach_number,
                seat_number,
                current_berth,
                desired_berth
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                journey_id,
                coach_number,
                seat_number,
                current_berth,
                desired_berth
            ]
        );


        // ==========================================
        // SUCCESS RESPONSE
        // ==========================================

        res.status(201).json({

            message: "Journey joined successfully",

            passenger_id: result.insertId,

            journey_id: journey_id

        });


    } catch (error) {

        console.error("Join journey error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }

});


module.exports = router;