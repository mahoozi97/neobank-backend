const requestIp = require("request-ip");
const AuditLog = require("../models/AuditLog");
const UAParser = require("ua-parser-js");

const createAuditLog = async (req, userId, action, metadata) => {
  const clientIp = requestIp.getClientIp(req);
  const parser = new UAParser(req.headers["user-agent"]);
  metadata.device = parser.getDevice().model || "Unknown Device";
  metadata.browser = parser.getBrowser().name || "Unknown Browser";
  metadata.os = parser.getOS().name || "Unknown OS";
  const auditLog = await AuditLog.create({
    userId: userId,
    action: action,
    ipAddress: clientIp,
    metadata: metadata,
  });
};

module.exports = createAuditLog;
