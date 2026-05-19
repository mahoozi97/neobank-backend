const validator = require("validator");

const validateUser = (req, res, next) => {
  const { email, cpr, name } = req.body;

  if (!validator.isAlpha(name, "en-US", { ignore: " " })) {
    return res.status(400).json({ error: "Name must contain only letters" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email" });
  }

  if (!validator.isNumeric(cpr)) {
    return res.status(400).json({ error: "CPR must contain only numbers" });
  }

  if (cpr.length !== 9) {
    return res.status(400).json({ error: "Please enter a valid CPR number" });
  }

  next();
};

module.exports = validateUser;
