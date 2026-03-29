const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
port: 3309,
    password: '', // Replace with your MySQL password
    database: 'codementor ai' // Replace with your database name
});

// Endpoint to run C++ code
app.post('/run-cpp', (req, res) => {
    const { code, student_id } = req.body;

    console.log("Received C++ Code:\n", code); // Log received code

    if (!code || typeof code !== 'string') {
        return res.status(400).send('Error: Invalid C++ code input.');
    }

    const filePath = 'TempCppFile.cpp';

    try {
        // Write the C++ code to a file
        fs.writeFileSync(filePath, code);
    } catch (err) {
        return res.status(500).send(`File Write Error: ${err.message}`);
    }

    // Compile the C++ code
    exec(`g++ ${filePath} -o TempCppFile.exe`, (compileError, stdout, stderr) => {
        console.log("Compilation Stdout:", stdout); // Log compilation output
        console.log("Compilation Stderr:", stderr); // Log compilation errors

        if (compileError) {
            logError('syntax_error', student_id, stderr);
            return res.status(400).json({ error: 'Syntax Error', details: stderr });
        }

        // Run the compiled program
        // Run the compiled program (Windows fix)
exec('TempCppFile.exe', (runError, stdout, stderr) => {

            console.log("Run Error:", runError); // Log runtime error object
            console.log("Program Output (Stdout):", stdout); // Log program output
            console.log("Program Error (Stderr):", stderr); // Log program errors

            if (runError || stderr) {
                const criticalErrors = stderr.split('\n').filter(line => line.trim());
                if (criticalErrors.length > 0) {
                    logError('runtime_error', student_id, stderr);
                    return res.status(400).json({ error: 'Runtime Error', details: stderr });
                }
            }

            // If no errors occurred, send the program output
            res.send({ output: stdout });
        });
    });
});

// Function to log errors in the database
function logError(errorType, student_id, errorDetails) {
    const columns = {
        syntax_error: 0,
        runtime_error: 0,
        logic_error: 0
    };

    // Increment the specific error type
    columns[errorType] = 1;

    const query = `
        INSERT INTO progress_report (student_id, language, syntax_error, runtime_error, logic_error, time_stamp)
        VALUES (?, 'C++', ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
        ${errorType} = ${errorType} + 1, time_stamp = NOW()
    `;

    connection.query(
        query,
        [student_id, columns.syntax_error, columns.runtime_error, columns.logic_error],
        (err, results) => {
            if (err) {
                console.error('Error updating MySQL:', err);
            } else {
                console.log('Error logged successfully:', results);
            }
        }
    );

    console.error(`Error Details (${errorType}):`, errorDetails); // Optional detailed logging
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
