const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "login",
        "failed_login",
        "open_account",
        "transfer",
        "transfer_failed",
        "freeze_account",
        "unfreeze_account",
        "kyc_upload",
        "kyc_approved",
        "kyc_rejected",
        "blocked_user",
        "activate_user",
        "deleted_user",
        "close_account",
      ],
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
module.exports = AuditLog;
