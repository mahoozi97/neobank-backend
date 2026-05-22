const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const createAuditLog = require("../utils/auditLog");

const transfer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { fromAccount, toAccount, amount } = req.body;
    const metadata = {};
    metadata.transferDetails = {
      from: fromAccount,
      to: toAccount,
      amount: amount,
      status: "rejected",
    };

    if (fromAccount === toAccount) {
      const reasonMessage = "Sender and recipient accounts cannot be the same.";
      metadata.transferDetails.rejectionReason = reasonMessage;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      return res.status(400).json({
        error: reasonMessage,
      });
    }

    const sender = await User.findById(userId).select("kycStatus");

    if (sender.kycStatus !== "verified" && amount > 10) {
      const reasonMessage =
        "Your transfer limit is 10 BHD until identity verification is complete.";
      metadata.transferDetails.rejectionReason = reasonMessage;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      return res.status(403).json({
        error: reasonMessage,
      });
    }

    if (amount < 0.1) {
      const reasonMessage = "The amount is less than 100 fils";
      metadata.transferDetails.rejectionReason = reasonMessage;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      return res.status(400).json({ error: reasonMessage });
    }

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    endOfDay.setUTCHours(23, 59, 59, 999);

    // aggregate!!
    const transfers = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          fromAccount: new mongoose.Types.ObjectId(fromAccount),
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          status: "success",
        },
      },
      {
        $group: {
          _id: "$userId",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const declinedMessage =
      "Transfer declined. This amount would exceed your daily transfer limit.";

    if (transfers.length === 1) {
      const previousSpentToday = transfers[0].totalAmount;
      const expectedTotalSpent = previousSpentToday + amount;
      if (sender.kycStatus !== "verified" && expectedTotalSpent > 100) {
        const reasonMessage = `${declinedMessage} Identity verification must be completed to increase your daily limit.`;
        metadata.transferDetails.rejectionReason = reasonMessage;
        await createAuditLog(req, userId, "transfer_failed", metadata);
        return res.status(403).json({
          error: reasonMessage,
        });
      }

      if (expectedTotalSpent > 3000) {
        metadata.transferDetails.rejectionReason = declinedMessage;
        await createAuditLog(req, userId, "transfer_failed", metadata);
        return res.status(403).json({
          error: declinedMessage,
        });
      }
    }

    if (amount > 3000) {
      metadata.transferDetails.rejectionReason = declinedMessage;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      return res.status(403).json({
        error: declinedMessage,
      });
    }

    next();
  } catch (error) {
    console.error("❌ Transfer failed", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = transfer;
