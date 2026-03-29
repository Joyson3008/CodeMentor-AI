const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: '', // Replace with your MySQL password
    port:3309,
    database: 'codementor ai' // Replace with your database name
});

// Endpoint to run Java code
app.post('/run-java', (req, res) => {
    const { code, student_id } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).send('Error: Invalid Java code input.');
    }

    const filePath = 'Main.java';
    try {
        fs.writeFileSync(filePath, code);
    } catch (err) {
        return res.status(500).send(`File Write Error: ${err.message}`);
    }

    // Compile the Java code
    exec(`javac ${filePath}`, (compileError, stdout, stderr) => {
        if (compileError) {
            // Log a syntax error and send detailed error output
            logError('syntax_error', student_id, stderr);
            return res.status(400).json({ error: 'Compilation Error', details: stderr });
        }

        // Run the compiled Java program
        exec(`java Main`, (runError, stdout, stderr) => {
            if (runError) {
                // Log a runtime error and send detailed error output
                logError('runtime_error', student_id, stderr);
                return res.status(400).json({ error: 'Runtime Error', details: stderr });
            }

            // If no errors occurred, send the program output
            res.send({ output: stdout });
        });
    });
});

// Function to log error in the database by inserting a new row
function logError(errorType, student_id, errorDetails) {
    const columns = {
        syntax_error: 0,
        runtime_error: 0,
        logic_error: 0
    };

    // Set appropriate column to 1 based on errorType
    columns[errorType] = 1;

    const query = `
        INSERT INTO progress_report (student_id, language, syntax_error, runtime_error, logic_error, time_stamp)
        VALUES (?, 'Java', ?, ?, ?, NOW())
    `;

    connection.query(query, [student_id, columns.syntax_error, columns.runtime_error, columns.logic_error], (err, results) => {
        if (err) {
            console.error('Error inserting into MySQL:', err);
        } else {
            console.log('Error logged successfully:', results);
        }
    });

    // Optionally log the error details to the console or file
    console.error(`Error Details (${errorType}):`, errorDetails);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
