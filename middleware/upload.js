const multerErrorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res
      .status(400)
      .json({ error: "You must upload exactly 3 documents." });
  }
  next(err);
};

module.exports = {
  multerErrorHandler,
};
