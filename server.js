const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

require("dotenv").config();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

// import routes
const authRoutes = require("./controllers/auth.route");
const kycRoutes = require("./controllers/kyc.route");
const adminRoutes = require("./controllers/admin.route");
const accountRoutes = require("./controllers/account.route");
const transactionRoutes = require("./controllers/transaction.route");
const verifyToken = require("./middleware/verifyToken");
const requireRole = require("./middleware/requireRole");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({ origin: "http://localhost:5173" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
});

// Routes
app.use("/auth", limiter, authRoutes);
app.use("/kyc", verifyToken, kycRoutes);
app.use("/admin", verifyToken, requireRole("admin"), adminRoutes);
app.use("/accounts", verifyToken, accountRoutes);
app.use("/transactions", verifyToken, transactionRoutes);


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
