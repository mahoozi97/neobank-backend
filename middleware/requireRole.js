const requireRole = (role) => (req, res, next) => {
  if (role !== req.user.role) {
    // Access Denied.
    return res.status(403).json({ message: `Forbidden: ${role} only.` });
  }
  next();
};