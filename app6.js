// Import required modules
const express = require('express'); // Express framework
const mysql = require('mysql');    // MySQL module
const bodyParser = require('body-parser'); // To parse request bodies
const { exec } = require('child_process'); // For executing code
const fs = require('fs'); // To handle files
const path = require('path'); // To manage file paths

// Initialize the express app
const app = express();
const port = 3000; // Set the port for the server

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
	port:3309,
    user: 'root', // Your MySQL username
    password: '', // Your MySQL password
    database: 'codementor ai' // Your database name
});

// Connect to MySQL database
db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit the server if database connection fails
    }
    console.log('Connected to the database');
});

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Endpoint to submit code
app.post('/submit-code', (req, res) => {
    const { code, language, studentId } = req.body;

    // Validate the input
    if (!code || !language || !studentId) {
        return res.status(400).send('Missing required fields');
    }

    // Path to temporarily store the code
    const filePath = path.join(__dirname, 'temp_code.' + language);

    // Write the code to the temporary file
    fs.writeFileSync(filePath, code);

    let command = '';
    let syntaxErrorCount = 0;
    let runtimeErrorCount = 0;
    let logicErrorCount = 0;

    // Determine the command to execute based on language
    if (language === 'python') {
        command = `python ${filePath}`;
    } else if (language === 'java') {
        command = `javac ${filePath} && java ${filePath.replace('.java', '')}`;
    } else if (language === 'cpp') {
        command = `g++ ${filePath} -o temp_code && ./temp_code`;
    } else if (language === 'php') {
        command = `php ${filePath}`;
    } else {
        return res.status(400).send('Unsupported language');
    }

    // Execute the code
    exec(command, (err, stdout, stderr) => {
        let errorMessage = stderr || err?.message || ''; // Capture any error message

        // Determine error types and increment counters accordingly
        if (stderr) {
            if (stderr.includes('SyntaxError')) {
                syntaxErrorCount++;
            } else if (stderr.includes('Exception')) {
                runtimeErrorCount++;
            } else {
                logicErrorCount++;  // All other errors are treated as logic errors
            }
        } else if (err) {
            runtimeErrorCount++; // Runtime errors from exec command
        }

        // Insert the error details into the database
        const query = `
            INSERT INTO progress_report (language, syntax_error, runtime_error, logic_error, student_id, time_stamp) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        db.query(query, [language, syntaxErrorCount, runtimeErrorCount, logicErrorCount, studentId], (error, results) => {
            if (error) {
                console.error('Error inserting into progress_report:', error);
                return res.status(500).send('Database error');
            }

            // Send response back to client
            res.status(200).send({
                message: 'Code executed',
                errorMessage,
                syntaxErrorCount,
                runtimeErrorCount,
                logicErrorCount
            });
        });

        // Clean up the temporary file after execution
        fs.unlinkSync(filePath);
    });

});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
