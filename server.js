const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5004;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',        // change if needed
    password: '',        // your mysql password
port: 3309,
    database: 'codementor ai'  // EXACT DB name
});

// Connect DB
db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
    } else {
        console.log('✅ MySQL Connected');
    }
});


// ================= REGISTER =================
app.post('/register', (req, res) => {
    const { student_id, name, email, password } = req.body;

    if (!student_id || !name || !email || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    const checkQuery = 'SELECT * FROM students WHERE student_id = ?';

    db.query(checkQuery, [student_id], (err, result) => {
        if (err) return res.status(500).json({ message: "DB Error" });

        if (result.length > 0) {
            return res.status(400).json({ message: "Student already exists" });
        }

        const insertQuery = `
            INSERT INTO students (student_id, name, email, password)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertQuery, [student_id, name, email, password], (err) => {
            if (err) return res.status(500).json({ message: "Insert Failed" });

            res.status(200).json({ message: "Registration Successful!" });
        });
    });
});


// ================= LOGIN =================
app.post('/login', (req, res) => {
    const { student_id, password } = req.body;

    if (!student_id || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    const query = `
        SELECT * FROM students 
        WHERE student_id = ? AND password = ?
    `;

    db.query(query, [student_id, password], (err, result) => {
        if (err) return res.status(500).json({ message: "DB Error" });

        if (result.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.status(200).json({
            message: "Login Successful!",
            student_id: result[0].student_id
        });
    });
});


// ================= SERVER =================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});