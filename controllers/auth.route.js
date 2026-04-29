const router = require("express").Router();
const User = require("../models/User");
// mount route = /auth
router.post("/sign-up", async (req, res) => {
  try {
    const foundUser = await User.findOne({
      $or: [{ cpr: req.body.cpr }, { email: req.body.email }],
    });

    if (foundUser) {
      res.status(409).json({ error: "You already have an account." });
    }

    const createdUser = await User.create({ ...req.body });

    // change to object and delete the password & cpr. (modern way)
    const { password, cpr, ...userObject } = createdUser.toObject();

    console.log("✅ Signed up successfully", userObject);
    res.status(201).json(userObject);
  } catch (error) {
    console.log("❌ Sign up failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
