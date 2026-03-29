const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const mysql = require('mysql');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ================= DATABASE CONNECTION =================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3309,
    database: 'codementor ai' // ⚠️ rename DB (NO SPACE)
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL');
});

// ================= PYTHON EXECUTION =================
app.post('/run-python', (req, res) => {
    const { code, studentId } = req.body;

    if (!code || !studentId) {
        return res.status(400).json({
            message: 'Code or Student ID missing'
        });
    }

    const fileName = `temp_${studentId}.py`;

    try {
        // Write code to temp file
        fs.writeFileSync(fileName, code);

        // Execute Python
        exec(`python ${fileName}`, (error, stdout, stderr) => {

            console.log(`\n🧠 Executing Python for Student: ${studentId}`);
            console.log("STDOUT:", stdout);
            console.log("STDERR:", stderr);
            console.log("ERROR:", error);

            let syntaxError = 0;
            let runtimeError = 0;
            let logicError = 0;

            // ================= ERROR CLASSIFICATION =================
            if (stderr.includes("SyntaxError")) {
                syntaxError = 1;
            } 
            else if (error) {
                runtimeError = 1;
            } 
            else if (!stdout.trim()) {
                logicError = 1;
            }

            // ================= DATABASE INSERT =================
            const query = `
                INSERT INTO progress_report 
                (language, syntax_error, runtime_error, logic_error, student_id, time_stamp)
                VALUES (?, ?, ?, ?, ?, NOW())
            `;

            db.query(
                query,
                ['python', syntaxError, runtimeError, logicError, studentId],
                (dbErr) => {
                    if (dbErr) {
                        console.error('❌ DB Insert Error:', dbErr);
                    }
                }
            );

            // ================= CLEAN FILE =================
            try {
                fs.unlinkSync(fileName);
            } catch (e) {
                console.warn("File cleanup failed:", e.message);
            }

            // ================= HANDLE REAL ERROR ONLY =================
            if (error) {
                return res.status(500).json({
                    message: 'Execution Error',
                    errorMessage: error.message
                });
            }

            // ================= FILTER PYTHON WARNING =================
            let cleanWarning = stderr.includes("Could not find")
                ? ""
                : stderr;

            // ================= FINAL RESPONSE =================
            res.status(200).json({
                message: "Code executed successfully",
                output: stdout.trim(),
                warning: cleanWarning || "None"
            });
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// ================= SERVER =================
const PORT = 3002;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});