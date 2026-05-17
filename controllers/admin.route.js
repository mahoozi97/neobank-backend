const router = require("express").Router();
const mongoose = require("mongoose");
const KYC = require("../models/KYC");
const User = require("../models/User");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const createAuditLog = require("../utils/auditLog");
const AuditLog = require("../models/AuditLog");

const dateRange = (date) => {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

// The mount route is /admin

//  - - - -  - -  - - -  - - - - ↓ Account ↓ - - - - -  - -  - - - - -  - - - -

// get Account by User ID
router.get("/account/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const foundAccount = await Account.findOne({ userId: userId });

    if (!foundAccount) {
      return res.status(404).json({ error: "Account not found!" });
    }

    console.log("✅ Fitched account successfully", foundAccount);
    res.status(200).json(foundAccount);
  } catch (error) {
    console.error("❌ Failed to fetch account", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ KYC ↓ - - - - -  - -  - - - - -  - - - -

// get kyc by userId
router.get("/kyc/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const userKyc = await KYC.find({ userId: userId }).sort({ createdAt: -1 });

    if (!userKyc) {
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    console.log("✅ Fitched KYC document successfully", userKyc);
    res.status(200).json(userKyc);
  } catch (error) {
    console.error("❌ Failed to fetch KYC document", error);
    res.status(500).json({ error: error.message });
  }
});

// approve KYC
router.patch("/kyc/:kycId/approve", async (req, res) => {
  console.log(req.params.kycId);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adminId = req.user._id;
    const adminName = req.user.name;
    const kycId = req.params.kycId;

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      { $set: { status: "approved" } },
      { returnDocument: "after", session }, // ← pass session
    );

    if (!kyc) {
      await session.abortTransaction(); // ❌ Any failure → rollback both
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    const user = await User.findByIdAndUpdate(
      kyc.userId,
      { $set: { kycStatus: "verified" } },
      { returnDocument: "after", session }, // ← pass session
    );

    if (!user) {
      await session.abortTransaction(); // ❌ Any failure → rollback both
      return res.status(404).json({ error: "User not found" });
    }

    const metadata = {
      targetUserId: kyc.userId,
      reviewedBy: `Admin - ${adminName}`,
    };
    await createAuditLog(req, adminId, "kyc_approved", metadata, session);

    await session.commitTransaction(); // ✅ Both succeed → save
    res.status(200).json({ message: "✅ KYC approved successfully" });
  } catch (error) {
    await session.abortTransaction(); // ❌ Any failure → rollback both
    console.log("❌ Error approving KYC: ", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Reject KYC
router.patch("/kyc/:kycId/reject", async (req, res) => {
  try {
    const adminId = req.user._id;
    const adminName = req.user.name;
    const kycId = req.params.kycId;
    // { $set: { status: "active" } }
    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      { $set: { status: "rejected", comment: req.body.comment } },
      { returnDocument: "after" },
    );

    if (!kyc) {
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    const metadata = {
      targetUserId: kyc.userId,
      reviewedBy: `Admin - ${adminName}`,
    };
    await createAuditLog(req, adminId, "kyc_rejected", metadata);

    res.status(200).json({ message: "✅ KYC rejected successfully" });
  } catch (error) {
    console.log("❌ Error rejecting KYC: ", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ USER ↓ - - - - -  - -  - - - - -  - - - -

router.get("/users", async (req, res) => {
  try {
    const { searchTerm } = req.query;

    let filter = { role: { $ne: "admin" } };
    if (searchTerm) {
      filter = {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { cpr: searchTerm },
        ],
        role: { $ne: "admin" },
      };
    }
    const allUsers = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("-password");

    if (!allUsers) {
      res.status(404).json({ error: "Users not found" });
    }

    console.log("✅ Fetched all users successfully", allUsers);
    res.status(200).json(allUsers);
  } catch (error) {
    console.log("✅ Fetched all users successfully", allUsers);
    res.status(500).json({ error: error.message });
  }
});

// block user
router.patch("/users/:userId/block", async (req, res) => {
  try {
    const adminId = req.user._id;
    const adminName = req.user.name;
    const userId = req.params.userId;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: { status: "blocked" },
      },
      { returnDocument: "after" },
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const metadata = {
      targetUserId: userId,
      reviewedBy: `Admin - ${adminName}`,
    };
    await createAuditLog(req, adminId, "blocked_user", metadata);

    console.log("✅ User status updated to Blocked");
    res.status(200).json({ message: "User has been successfully blocked." });
  } catch (error) {
    console.error("❌ Failed to block user", error);
    res.status(500).json({ error: error.message });
  }
});

// activate user
router.patch("/users/:userId/active", async (req, res) => {
  try {
    const adminId = req.user._id;
    const adminName = req.user.name;
    const userId = req.params.userId;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: { status: "active" },
      },
      { returnDocument: "after" },
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const metadata = {
      targetUserId: userId,
      reviewedBy: `Admin - ${adminName}`,
    };
    await createAuditLog(req, adminId, "activate_user", metadata);

    console.log("✅ User status updated to activated");
    res.status(200).json({ message: "User has been successfully activated." });
  } catch (error) {
    console.error("❌ Failed to active user", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ TRANSACTIONS ↓ - - - - -  - -  - - - - -  - - - -

// get all transactions
router.get("/transactions/:accountId", async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const { status, date } = req.query;

    let filter;

    if (date && status) {
      filter = {
        fromAccount: accountId,
        status: status,
        createdAt: dateRange(date),
      };
    } else if (date) {
      filter = {
        $or: [
          { fromAccount: accountId },
          { toAccount: accountId, status: "success" },
        ],
        createdAt: dateRange(date),
      };
    } else if (status) {
      filter = {
        fromAccount: accountId,
        status: status,
      };
    } else {
      filter = {
        $or: [
          { fromAccount: accountId },
          { toAccount: accountId, status: "success" },
        ],
      };
    }

    const allTransactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("toAccount fromAccount", "nickname");

    if (!allTransactions) {
      return res.status(404).json({ error: "Transactions not found" });
    }

    const formattedTransactions = allTransactions.map((transaction) => {
      const obj = transaction.toObject();
      obj.amount = new Intl.NumberFormat("en-BH", {
        minimumFractionDigits: 3,
      }).format(obj.amount);
      obj.amount += " BHD";
      return obj;
    });

    console.log("✅ Fitched transactions successfully", formattedTransactions);
    res.status(200).json(formattedTransactions);
  } catch (error) {
    console.error("❌ Failed to fetch transactions", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ AUDIT LOG ↓ - - - - -  - -  - - - - -  - - - -

router.get("/audit-logs", async (req, res) => {
  try {
    const { page = 1, limit = 10, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);
    console.log(logs[0]);

    console.log("✅ Fitched logs successfully");
    res.status(200).json({
      logs: logs,
      total: total,
    });
  } catch (error) {
    console.error("❌ Failed to fetch logs", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
