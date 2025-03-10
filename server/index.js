const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = 5000;

// Secret Store
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

// API Keys and secrets - process.env file can be used
// MongoDB connection URI
const uri = process.env.MONGO_URI;
const jwt_key = process.env.JWT_SECRET_KEY;
const dbName = process.env.DB_NAME;
const collName = process.env.COLLECTION_NAME;

// MongoDB client setup
const client = new MongoClient(uri);
let usersCollection;

// Connect to MongoDB and then start the server
client.connect()
  .then(() => {
    console.log("MongoDB connected");
    usersCollection = client.db(`${dbName}`).collection(`${collName}`); // Use the 'users' collection

    // Start the server after MongoDB connection
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process if MongoDB connection fails
  });

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Routes
app.post("/api/users/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const result = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
    });

    // Create JWT token
    const token = jwt.sign({ id: result.insertedId }, `${jwt_key}`, { expiresIn: '1h' });

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: result.insertedId, name, email },
    });
  } catch (err) {
    console.error("Signup error:", err); // Log error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, `${jwt_key}`, { expiresIn: '1h' });

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err); // Log error for debugging
    res.status(500).json({ message: "Server error" });
  }
});

// Start server - will be done in the MongoDB connection setup above
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

