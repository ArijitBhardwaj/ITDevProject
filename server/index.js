const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const navigationRoutes = require("./routes/navigationRoutes");
app.use("/api/navigation", navigationRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
