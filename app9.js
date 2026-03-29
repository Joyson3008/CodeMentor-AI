const express = require("express");
const mysql = require("mysql2");

const app = express();
const port = 5002; // Ensure this matches the port used in HTML
const cors =require('cors');
app.use(cors());
// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
port:3309,
    database: "codementor ai",
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.stack);
        return;
    }
    console.log("Connected to MySQL database.");
});

app.get("/:student_id", (req, res) => {
    const studentId = req.params.student_id;
    const query = "SELECT * FROM progress_report WHERE student_id = ?";

    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }

        console.log("Results from database:", results);

        if (results.length === 0) {
            res.status(404).json({ error: "No data found for the given Student Id." });
        } else {
            res.json(results);
        }
    });
});

// Start server
app.listen(port, () => {
     console.log(`Server running at http://localhost:${port}`);
});