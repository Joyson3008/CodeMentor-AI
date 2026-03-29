const express = require('express');
const mysql = require('mysql2/promise'); // Use promise wrapper for async/await
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3006;

// MySQL Connection
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
port:3309,
  password: '', // Add your MySQL password here if any
  database: 'codementor ai', // Make sure the database name is correct
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get('/achievements/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    // Step 1: Fetch data from progress_report
    const [progressData] = await db.query(
      `
      SELECT 
        student_id, 
        COUNT(*) AS total_programs,
        SUM(CASE WHEN syntax_error = 0 AND runtime_error = 0 AND logic_error = 0 THEN 1 ELSE 0 END) AS correct_programs
      FROM progress_report 
      WHERE student_id = ? 
      GROUP BY student_id
      `, 
      [studentId]
    );

    if (progressData.length === 0) {
      return res.status(404).send({ message: 'No data found in progress_report for this student ID.' });
    }

    const { correct_programs, total_programs } = progressData[0];

    // Step 2: Determine milestone based on the number of correct programs
    let milestone = 'No milestone yet';
    if (correct_programs >= 50) {
      milestone = 'Silver';
    } else if (correct_programs >= 25) {
      milestone = 'Bronze';
    }

    const last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Step 3: Insert or update achievements table
    await db.query(
      `
      INSERT INTO achievements (Id, milestone, correct_programs, last_updated)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        milestone = VALUES(milestone),
        correct_programs = VALUES(correct_programs),
        last_updated = VALUES(last_updated)
      `,
      [studentId, milestone, correct_programs, last_updated]
    );

    // Step 4: Send response to the frontend
    res.send({
      message: 'Achievements updated successfully!',
      achievement: {
        milestone,
        correct_programs,
        total_programs,
        last_updated,
      },
    });
  } catch (err) {
    console.error('Error fetching or updating achievements:', err);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});