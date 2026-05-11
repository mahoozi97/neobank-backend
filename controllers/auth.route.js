const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const validator = require("validator");
const createAuditLog = require("../utils/auditLog");

router.post("/sign-up", async (req, res) => {
  try {
    const { email, cpr } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(409).json({ error: "Please enter a valid email" });
    }

    const foundUser = await User.findOne({
      $or: [{ cpr: cpr }, { email: email }],
    });

    if (foundUser) {
      return res.status(409).json({ error: "You already have an account." });
    }

    const createdUser = await User.create({ ...req.body });

    // change to object and delete the password & cpr. (modern way)
    const { password, cpr: _cpr, ...userObject } = createdUser.toObject();

    console.log("✅ Signed up successfully", userObject);
    res.status(201).json(userObject);
  } catch (error) {
    console.log("❌ Sign up failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(409).json({ error: "Please enter a valid email" });
    }

    const foundUser = await User.findOne({ email: email });

    if (!foundUser) {
      return res.status(401).json({ error: "email or password incorrect" });
    }

    const validPassword = await bcrypt.compare(password, foundUser.password);

    if (!validPassword) {
      const metadata = {
        reason: "wrong password",
      };
      await createAuditLog(req, foundUser._id, "failed_login", metadata);
      return res.status(401).json({ error: "email or password incorrect" });
    }

    // change to object and delete the password & cpr. (modern way)
    const { password: _password, cpr, ...payload } = foundUser.toObject();

    // Generate JWT token if authentication is successful
    const token = jwt.sign({ ...payload }, JWT_SECRET, { expiresIn: "24h" });

    console.log("✅ Signed in successfully");
    await createAuditLog(req, foundUser._id, "login", (metadata = {}));
    res.status(200).json({ token });
  } catch (error) {
    console.log("❌ Sign in failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
