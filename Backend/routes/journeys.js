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


        // ==========================================
        // VALIDATE REQUIRED FIELDS
        // ==========================================

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
        // CHECK IF USER ALREADY JOINED THIS JOURNEY
        // ==========================================

        const [existingPassenger] = await pool.query(
            `SELECT passenger_id
             FROM passengers
             WHERE user_id = ?
             AND journey_id = ?`,
            [user_id, journey_id]
        );


        // ==========================================
        // STOP DUPLICATE JOIN
        // ==========================================

        if (existingPassenger.length > 0) {
            return res.status(409).json({
                message: "You have already joined this journey."
            });
        }


        // ==========================================
        // CHECK IF JOURNEY ALREADY EXISTS
        // ==========================================

        const [existingJourney] = await pool.query(
            `SELECT journey_id
             FROM journeys
             WHERE journey_id = ?`,
            [journey_id]
        );


        // ==========================================
        // CREATE JOURNEY IF IT DOES NOT EXIST
        // ==========================================

        if (existingJourney.length === 0) {

            await pool.query(
                `INSERT INTO journeys
                (
                    journey_id,
                    user_id,
                    train_number,
                    journey_date,
                    source,
                    destination,
                    coach,
                    seat_number,
                    current_berth,
                    preferred_berth
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    journey_id,
                    user_id,
                    train_number,
                    journey_date,
                    source,
                    destination,
                    coach_number,
                    seat_number,
                    current_berth,
                    desired_berth
                ]
            );

        }


        // ==========================================
        // ADD PASSENGER
        // ==========================================

        await pool.query(
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
            journey_id: journey_id
        });


    } catch (error) {

        console.error("Join journey error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }
});


// GET MY JOURNEY
router.get("/my/:user_id", async (req, res) => {

    try {

        const { user_id } = req.params;

        // Check user_id
        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        // Get user's journey details
        const [rows] = await pool.query(
            `SELECT
                p.passenger_id,
                p.user_id,
                p.journey_id,
                j.train_number,
                j.journey_date,
                j.source,
                j.destination,
                p.coach_number,
                p.seat_number,
                p.current_berth,
                p.desired_berth
             FROM passengers p
             JOIN journeys j
             ON p.journey_id = j.journey_id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC
             LIMIT 1`,
            [user_id]
        );

        // No journey found
        if (rows.length === 0) {
            return res.status(404).json({
                message: "No journey found"
            });
        }

        // Send journey details
        res.json({
            message: "Journey found",
            journey: rows[0]
        });

    } catch (error) {

        console.error("Get my journey error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
// ==========================================
// FIND MATCHING PASSENGERS
// ==========================================

router.get("/matches/:user_id", async (req, res) => {

    try {

        const { user_id } = req.params;

        // Check user_id
        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        // Get current user's journey details
        const [myJourney] = await pool.query(
            `SELECT
                p.passenger_id,
                p.journey_id,
                p.coach_number,
                p.seat_number,
                p.current_berth,
                p.desired_berth,
                j.train_number,
                j.journey_date,
                j.source,
                j.destination
             FROM passengers p
             JOIN journeys j
             ON p.journey_id = j.journey_id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC
             LIMIT 1`,
            [user_id]
        );

        // No journey found
        if (myJourney.length === 0) {
            return res.status(404).json({
                message: "Please join a journey first"
            });
        }

        const me = myJourney[0];

        // Find compatible passengers
        const [matches] = await pool.query(
            `SELECT
                p.passenger_id,
                p.user_id,
                u.name,
                p.journey_id,
                p.coach_number,
                p.seat_number,
                p.current_berth,
                p.desired_berth
             FROM passengers p
             JOIN users u
             ON p.user_id = u.user_id
             WHERE p.journey_id = ?
             AND p.user_id != ?
             AND p.coach_number = ?
             AND p.current_berth = ?
             AND p.desired_berth = ?`,
            [
                me.journey_id,
                user_id,
                me.coach_number,
                me.desired_berth,
                me.current_berth
            ]
        );

        // No match found
        if (matches.length === 0) {
            return res.json({
                message: "No compatible passengers found",
                matches: []
            });
        }

        // Return matches
        res.json({
            message: "Compatible passengers found",
            matches: matches
        });

    } catch (error) {

        console.error("Matching error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
// SEND SWAP REQUEST
router.post("/swap-request", async (req, res) => {

    try {

        const {
            sender_id,
            receiver_id,
            sender_passenger_id,
            receiver_passenger_id
        } = req.body;

        // Check required fields
        if (
            !sender_id ||
            !receiver_id ||
            !sender_passenger_id ||
            !receiver_passenger_id
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Prevent sending request to yourself
        if (sender_id == receiver_id) {
            return res.status(400).json({
                message: "You cannot send a request to yourself"
            });
        }

        // Check if the request already exists
        const [existingRequest] = await pool.query(
            `SELECT request_id
             FROM swap_requests
             WHERE sender_id = ?
             AND receiver_id = ?
             AND sender_passenger_id = ?
             AND receiver_passenger_id = ?
             AND status = 'Pending'`,
            [
                sender_id,
                receiver_id,
                sender_passenger_id,
                receiver_passenger_id
            ]
        );

        if (existingRequest.length > 0) {
            return res.status(409).json({
                message: "Swap request already sent"
            });
        }

        // Create swap request
        const [result] = await pool.query(
            `INSERT INTO swap_requests
            (
                sender_id,
                receiver_id,
                sender_passenger_id,
                receiver_passenger_id,
                status
            )
            VALUES (?, ?, ?, ?, 'Pending')`,
            [
                sender_id,
                receiver_id,
                sender_passenger_id,
                receiver_passenger_id
            ]
        );

        res.status(201).json({
            message: "Swap request sent successfully",
            request_id: result.insertId
        });

    } catch (error) {

        console.error("Send swap request error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
// GET RECEIVED SWAP REQUESTS
router.get("/requests/received/:user_id", async (req, res) => {

    try {

        const { user_id } = req.params;

        // Check user_id
        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        // Get received requests
        const [requests] = await pool.query(
            `SELECT
                sr.request_id,
                sr.sender_id,
                u.name AS sender_name,
                sr.sender_passenger_id,
                sr.receiver_passenger_id,
                p.seat_number AS sender_seat,
                p.current_berth AS sender_berth,
                p.desired_berth AS sender_desired_berth,
                sr.status,
                sr.created_at
             FROM swap_requests sr
             JOIN users u
             ON sr.sender_id = u.user_id
             JOIN passengers p
             ON sr.sender_passenger_id = p.passenger_id
             WHERE sr.receiver_id = ?
             ORDER BY sr.created_at DESC`,
            [user_id]
        );

        // No requests
        if (requests.length === 0) {
            return res.json({
                message: "No received swap requests",
                requests: []
            });
        }

        // Return requests
        res.json({
            message: "Received requests found",
            requests: requests
        });

    } catch (error) {

        console.error("Get received requests error:", error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
// ACCEPT SWAP REQUEST
router.post("/requests/accept/:request_id", async (req, res) => {

    const connection = await pool.getConnection();

    try {

        const { request_id } = req.params;
        const { user_id } = req.body;

        // Check required fields
        if (!request_id || !user_id) {
            connection.release();

            return res.status(400).json({
                message: "Request ID and user ID are required"
            });
        }

        await connection.beginTransaction();

        // Get request details
        const [requests] = await connection.query(
            `SELECT
                request_id,
                sender_id,
                receiver_id,
                sender_passenger_id,
                receiver_passenger_id,
                status
             FROM swap_requests
             WHERE request_id = ?
             FOR UPDATE`,
            [request_id]
        );

        // Request not found
        if (requests.length === 0) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                message: "Swap request not found"
            });
        }

        const request = requests[0];

        // Check receiver
        if (request.receiver_id != user_id) {

            await connection.rollback();
            connection.release();

            return res.status(403).json({
                message: "You are not authorized to accept this request"
            });
        }

        // Check request status
        if (request.status !== "Pending") {

            await connection.rollback();
            connection.release();

            return res.status(400).json({
                message: "This request is no longer pending"
            });
        }

        // Get both passenger records
        const [passengers] = await connection.query(
            `SELECT
                passenger_id,
                user_id,
                journey_id,
                coach_number,
                seat_number,
                current_berth,
                desired_berth
             FROM passengers
             WHERE passenger_id IN (?, ?)
             FOR UPDATE`,
            [
                request.sender_passenger_id,
                request.receiver_passenger_id
            ]
        );

        // Check both passengers exist
        if (passengers.length !== 2) {

            await connection.rollback();
            connection.release();

            return res.status(404).json({
                message: "Passenger details not found"
            });
        }

        const senderPassenger = passengers.find(
            p => p.passenger_id == request.sender_passenger_id
        );

        const receiverPassenger = passengers.find(
            p => p.passenger_id == request.receiver_passenger_id
        );

        // Verify both passengers are on same journey
        if (senderPassenger.journey_id !== receiverPassenger.journey_id) {

            await connection.rollback();
            connection.release();

            return res.status(400).json({
                message: "Passengers are not on the same journey"
            });
        }

        // Update request status
        await connection.query(
            `UPDATE swap_requests
             SET status = 'Accepted'
             WHERE request_id = ?`,
            [request_id]
        );
// Swap seat number and berth values

await connection.query(
    `UPDATE passengers
     SET seat_number = ?,
         current_berth = ?
     WHERE passenger_id = ?`,
    [
        receiverPassenger.seat_number,
        receiverPassenger.current_berth,
        senderPassenger.passenger_id
    ]
);

await connection.query(
    `UPDATE passengers
     SET seat_number = ?,
         current_berth = ?
     WHERE passenger_id = ?`,
    [
        senderPassenger.seat_number,
        senderPassenger.current_berth,
        receiverPassenger.passenger_id
    ]
);

        // Reject other pending requests involving these passengers
        await connection.query(
            `UPDATE swap_requests
             SET status = 'Rejected'
             WHERE status = 'Pending'
             AND request_id != ?
             AND (
                sender_passenger_id IN (?, ?)
                OR receiver_passenger_id IN (?, ?)
             )`,
            [
                request_id,
                senderPassenger.passenger_id,
                receiverPassenger.passenger_id,
                senderPassenger.passenger_id,
                receiverPassenger.passenger_id
            ]
        );

        await connection.commit();
        connection.release();

        res.json({
            message: "Swap request accepted successfully",
            request_id: request_id
        });

    } catch (error) {

        await connection.rollback();
        connection.release();

        console.error("Accept swap request error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }

});
router.post("/requests/reject/:request_id", async (req, res) => {
    try {
        const { request_id } = req.params;
        const { user_id } = req.body;

        if (!request_id || !user_id) {
            return res.status(400).json({
                message: "Request ID and user ID are required"
            });
        }

        const [requests] = await pool.query(
            `SELECT
                request_id,
                receiver_id,
                status
             FROM swap_requests
             WHERE request_id = ?`,
            [request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                message: "Swap request not found"
            });
        }

        const request = requests[0];

        if (request.receiver_id != user_id) {
            return res.status(403).json({
                message: "You are not authorized to reject this request"
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message: "This request is no longer pending"
            });
        }

        await pool.query(
            `UPDATE swap_requests
             SET status = 'Rejected'
             WHERE request_id = ?`,
            [request_id]
        );

        res.json({
            message: "Swap request rejected successfully",
            request_id: request_id
        });

    } catch (error) {
        console.error("Reject swap request error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// GET ALL USERS' JOURNEY DETAILS
router.get("/all", async (req, res) => {
    try {
        const [journeys] = await pool.query(
            `SELECT
                p.passenger_id,
                u.user_id,
                u.name,
                u.email,
                p.journey_id,
                p.coach_number,
                p.seat_number,
                p.current_berth,
                p.desired_berth,
                j.train_number,
                j.journey_date,
                j.source,
                j.destination,
                p.created_at
             FROM passengers p
             JOIN users u
                ON p.user_id = u.user_id
             JOIN journeys j
                ON p.journey_id = j.journey_id
             ORDER BY p.created_at DESC`
        );

        res.json({
            message: "All journey details found",
            journeys: journeys
        });

    } catch (error) {
        console.error("Get all journeys error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});
module.exports = router;