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
        "login",//
        "open_account",//
        "transfer",
        "freeze_account",//
        "unfreeze_account",//
        "close_account",//
        "kyc_upload",
        "kyc_approved",
        "kyc_rejected",
        "blocked_user",
        "activate_user",
        "deleted_user",
        "failed_login",
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



// // 1️⃣ Login
// {
//   userId: "64abc123",
//   action: "login",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     device: "iPhone 15",
//     browser: "Safari"
//   }
// }

// // 2️⃣ Failed Login
// {
//   userId: "64abc123",
//   action: "failed_login",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     attempts: 3,
//     reason: "wrong password"
//   }
// }

// // 3️⃣ Transfer
// {
//   userId: "64abc123",
//   action: "transfer",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     amount: 500,
//     currency: "BHD",
//     fromAccount: "64acc111",
//     toAccount: "64acc222",
//     status: "completed"
//   }
// }

// // 4️⃣ Freeze Account
// {
//   userId: "64admin999",
//   action: "freeze_account",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     targetUserId: "64abc123",
//     reason: "fraud detection - 5 transfers in 1 minute"
//   }
// }

// // 5️⃣ KYC Upload
// {
//   userId: "64abc123",
//   action: "kyc_upload",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     documentType: "passport",
//     fileSize: "2MB"
//   }
// }

// // 6️⃣ KYC Approved
// {
//   userId: "64admin999",
//   action: "kyc_approved",
//   ipAddress: "192.168.1.1",
//   metadata: {
//     targetUserId: "64abc123",
//     reviewedBy: "Admin Ahmed"
//   }
// }