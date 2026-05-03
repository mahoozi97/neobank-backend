const requireRole = (role) => (req, res, next) => {
  if (role !== req.user.role) {
    // Access Denied.
    return res.status(403).json({ message: `Forbidden: You are not authorized to access this resource.` });
  }
  next();
};

module.exports = requireRole