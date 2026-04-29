const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");

require("dotenv").config();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

// import routes
const authRoutes = require("./controllers/auth.route");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
// app.use(cors({ origin: "http://localhost:5173" }));

// Routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send(`${mongoose.connection.name} server is running`);
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🔥`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
startServer();
