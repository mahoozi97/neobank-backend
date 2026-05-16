const router = require("express").Router();
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const createAuditLog = require("../utils/auditLog");

const dateRange = (date) => {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

// get by user Id and filtred by status
// router.get("/", async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { status } = req.query;

//     const filter = status ? { userId: userId, status } : { userId: userId };
//     const allTransactions = await Transaction.find(filter)
//       .sort({ createdAt: -1 })
//       .populate("toAccount fromAccount", "nickname");

//     if (!allTransactions) {
//       return res.status(404).json({ error: "Transactions not found" });
//     }

//     const formattedTransactions = allTransactions.map((transaction) => {
//       const obj = transaction.toObject();
//       obj.amount = new Intl.NumberFormat("en-BH", {
//         minimumFractionDigits: 3,
//       }).format(obj.amount);
//       obj.amount += " BHD";
//       return obj;
//     });

//     console.log("✅ Fitched transactions successfully", formattedTransactions);
//     res.status(200).json(formattedTransactions);
//   } catch (error) {
//     console.error("❌ Failed to fetch transactions", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// transfer amount
router.post("/transfer", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;
    const { fromAccount, toAccount, amount } = req.body;
    const metadata = {};
    metadata.transferDetails = {
      from: fromAccount,
      to: toAccount,
      amount: amount,
    };

    if (fromAccount === toAccount) {
      return res.status(400).json({
        error:
          "Transfer failed: sender and recipient accounts cannot be the same.",
      });
    }

    const sender = await User.findById(userId).select("kycStatus");

    if (sender.kycStatus !== "verified" && amount > 10) {
      return res.status(403).json({
        error:
          "Transfer limit for unverified user is 10 BHD. Please complete KYC verification to increase your limit.",
      });
    }

    if (amount < 0.1) {
      return res
        .status(400)
        .json({ error: "The amount is less than the minimum" });
    }

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );

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
      const totalSpentToday = (transfers[0].totalAmount += amount);
      console.log(totalSpentToday);
      if (sender.kycStatus !== "verified" && totalSpentToday > 100) {
        return res.status(403).json({
          error: `${declinedMessage} Please complete KYC verification to increase your daily limit.`,
        });
      }

      if (totalSpentToday > 3000) {
        return res.status(403).json({
          error: declinedMessage,
        });
      }
    }

    if (amount > 3000) {
      return res.status(403).json({
        error: declinedMessage,
      });
    }

    const newTransaction = await Transaction.create(
      [
        {
          userId: userId,
          ...req.body,
        },
      ],
      { session },
    );

    const from = await Account.findOneAndUpdate(
      {
        _id: fromAccount,
        userId: userId,
        balance: { $gte: amount }, // if amount >= balance
        status: { $nin: ["closed", "frozen"] }, // not equal closed or frozen
      },
      { $inc: { balance: -amount } },
      { returnDocument: "after", session },
    );

    if (!from) {
      const reasonMessage =
        "Transfer failed: insufficient balance or account is unavailable";
      const transaction = await Transaction.create({
        userId,
        fromAccount: fromAccount,
        toAccount: toAccount,
        amount,
        status: "rejected",
        rejectionReason: reasonMessage,
      });
      metadata.transferDetails.status = "rejected";
      metadata.transferDetails.rejectionReason = reasonMessage;
      metadata.transferDetails.ref = transaction._id;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      await session.abortTransaction();
      return res.status(422).json({ error: reasonMessage });
    }

    const to = await Account.findOneAndUpdate(
      { _id: toAccount, status: { $nin: ["closed", "frozen"] } },
      { $inc: { balance: +amount } },
      { returnDocument: "after", session },
    );

    if (!to) {
      const reasonMessage =
        "Transfer failed: recipient account is closed or does not exist";
      const transaction = await Transaction.create({
        userId,
        fromAccount: fromAccount,
        toAccount: toAccount,
        amount,
        status: "rejected",
        rejectionReason: reasonMessage,
      });
      metadata.transferDetails.status = "rejected";
      metadata.transferDetails.rejectionReason = reasonMessage;
      metadata.transferDetails.ref = transaction._id;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      await session.abortTransaction();
      return res.status(422).json({ error: reasonMessage });
    }

    newTransaction[0].status = "success";
    await newTransaction[0].save({ session });

    metadata.transferDetails.status = "success";
    metadata.transferDetails.ref = newTransaction[0]._id;
    await createAuditLog(req, userId, "transfer", metadata, session);

    const formattedAmount = new Intl.NumberFormat("en-BH", {
      minimumFractionDigits: 3,
    }).format(amount);

    const transferDetails = {
      from: from.nickname,
      to: to.nickname,
      amount: `${formattedAmount} BHD`,
      status: newTransaction[0].status,
      ref: newTransaction[0]._id,
    };

    await session.commitTransaction();
    console.log("✅ Transfer successfully", transferDetails);
    res.status(200).json(transferDetails);
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Transfer failed", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

router.get("/:accountId", async (req, res) => {
  try {
    const userId = req.user._id;
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

module.exports = router;
