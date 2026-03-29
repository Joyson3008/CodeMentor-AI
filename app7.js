const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql');

// Initialize the app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  port:3309,
  database: 'codementor ai'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Endpoint to run PHP code
app.post('/run-php', (req, res) => {
  const { phpCode, student_id } = req.body;

  if (!phpCode || !student_id) {
    return res.status(400).json({ message: 'PHP code or student ID is missing' });
  }

  const phpFileName = 'temp.php';
  const phpFilePath = path.join(__dirname, phpFileName);

  // Write the PHP code to a temporary file
  try {
    fs.writeFileSync(phpFilePath, phpCode);
    console.log('PHP code written to temp.php');
  } catch (fileError) {
    console.error('Error writing PHP file:', fileError);
    return res.status(500).json({ message: 'Failed to write PHP code to file' });
  }

  // Execute the PHP script
  exec(`php ${phpFilePath}`, (error, stdout, stderr) => {
    let syntaxError = 0, runtimeError = 0, logicError = 0;
    const errorMessage = stderr || (error && error.message) || '';

    // Log the output for debugging
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    console.log('error:', errorMessage);

    if (stderr) {
      // Syntax errors will produce stderr
      syntaxError++;
      logError('syntax_error', student_id, stderr);
    } else if (error) {
      // Runtime errors will produce error
      runtimeError++;
      logError('runtime_error', student_id, error.message);
    } else if (!error && !stderr && stdout.trim() === '') {
      // Logic errors will produce no output when they shouldn't
      logicError++;
      logError('logic_error', student_id, 'No output (possible logic error)');
    }

    // Insert error information into the database
    const query = `
      INSERT INTO progress_report (student_id, language, syntax_error, runtime_error, logic_error, time_stamp)
      VALUES (?, 'php', ?, ?, ?, NOW())
    `;

    db.query(query, [student_id, syntaxError, runtimeError, logicError], (err, results) => {
      if (err) {
        console.error('Error inserting into MySQL:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      console.log('Database insert results:', results);

      if (results.affectedRows > 0) {
        console.log('Record inserted successfully');
      } else {
        console.error('No rows affected, insert failed');
      }
    });

    // Remove the temp PHP file after execution
    fs.unlink(phpFilePath, (err) => {
      if (err) {
        console.error('Error deleting temp PHP file:', err);
      }
    });

    if (errorMessage) {
      return res.status(400).json({ message: 'Execution error', errorMessage });
    }

    res.status(200).json({ message: 'PHP code executed successfully', output: stdout });
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
    VALUES (?, 'php', ?, ?, ?, NOW())
  `;

  // Log query for debugging
  console.log('Executing query to log error:', query);
  db.query(query, [student_id, columns.syntax_error, columns.runtime_error, columns.logic_error], (err, results) => {
    if (err) {
      console.error('Error inserting into MySQL:', err);
    } else {
      console.log('Error logged successfully in MySQL:', results);
    }
  });

  // Optionally log the error details to the console
  console.error(`Error Details (${errorType}):`, errorDetails);
}

// Start the server
const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Server (PHP) is running on http://localhost:${PORT}`);
});
