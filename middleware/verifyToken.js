const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV;

const verifyToken = (req, res, next) => {
  if (NODE_ENV === "development") {
    req.user = {
      _id: "69a0ba02e13c1ed2fd6d5b33",
      username: "dev",
      role: "admin",
    };
    return next();
  }

  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied. No token provided" });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid credientials" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your user is blocked" });
    }

    if (user.status === "deleted") {
      return res.status(403).json({ message: "Account no longer exists" });
    }

    req.user = user;

    next();
  });
};

module.exports = verifyToken;
