require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(
  cors({
    origin: "https://online-resume-generator-frontend-ql.vercel.app",
  })
);
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.log(err.message);
  }
});
app.post("/api/auth/register", (req, res) => {
  res.json({
    message: "Registration API working",
  });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      token: "dummy_token",
      user,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});
app.get("/api/auth/me", (req, res) => {
  res.json({
    success: true,
    user: {
      id: 1,
      name: "Jagadeesh",
      email: "jagadeesh2006r@gmail.com",
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
