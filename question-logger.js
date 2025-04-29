import mysql from "mysql2/promise";

// Database configuration
const dbConfig = {
  host: "193.203.166.122",
  user: "u231187478_claviolette",
  password: "042217dV!",
  database: "u231187478_tmbdbs",
};

/**
 * Log an unanswered question to the database
 * @param {string} question - The user's question
 * @returns {Promise<boolean>} - Success status
 */
export async function logQuestion(question) {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);

    // Create table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        status ENUM('pending', 'addressed') DEFAULT 'pending'
      )
    `);

    // Insert the question
    await connection.execute(
      "INSERT INTO unanswered_questions (question, timestamp) VALUES (?, ?)",
      [question, new Date().toISOString().slice(0, 19).replace("T", " ")]
    );

    console.log("Question logged successfully:", question);
    return true;
  } catch (error) {
    console.error("Error logging question:", error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Example usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testQuestion = process.argv[2] || "This is a test question";
  logQuestion(testQuestion)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
