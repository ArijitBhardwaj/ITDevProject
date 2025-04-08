// index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.1.67:5173", // Add your laptop's IP if needed
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// Existing Navigation Routes
const navigationRoutes = require("./routes/navigationRoutes");
app.use("/api/navigation", navigationRoutes);

// NEW: Neo4j Routes
const neo4jRoutes = require("./routes/neo4jRoutes");
app.use("/api/neo4j", neo4jRoutes);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at:
  - Local: http://localhost:${PORT}
  - Network: http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
  const interfaces = require("os").networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
