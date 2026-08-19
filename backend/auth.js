const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "divinenet-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authenticateToken(request, response, next) {
  const header = request.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return response.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = header.slice(7);

  try {
    request.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return response.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    return next();
  };
}

module.exports = {
  signToken,
  authenticateToken,
  requireRole,
  JWT_SECRET
};