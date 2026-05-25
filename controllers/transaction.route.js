const router = require("express").Router();
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const createAuditLog = require("../utils/auditLog");
const rateLimit = require("express-rate-limit");
const transfer = require("../middleware/transfer");

const dateRange = (date) => {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

const transferLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // 1 transfer request
  message: {
    status: 429,
    error:
      "Your previous transaction is still processing. Please wait a moment.",
  },
});

// transfer amount
router.post("/transfer", transferLimiter, transfer, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;
    const { fromAccount, toAccount, amount } = req.body;
    const metadata = {};
    metadata.amount = `${amount} BHD`;

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
      metadata.from = fromAccount;
      metadata.to = toAccount;
      metadata.status = "rejected";
      metadata.rejectionReason = reasonMessage;
      metadata.ref = transaction._id;
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
      metadata.from = from.nickname;
      metadata.to = toAccount;
      metadata.status = "rejected";
      metadata.rejectionReason = reasonMessage;
      metadata.ref = transaction._id;
      await createAuditLog(req, userId, "transfer_failed", metadata);
      await session.abortTransaction();
      return res.status(422).json({ error: reasonMessage });
    }

    newTransaction[0].status = "success";
    await newTransaction[0].save({ session });

    metadata.from = from.nickname;
    metadata.to = toAccount.nickname;
    metadata.status = "success";
    metadata.ref = newTransaction[0]._id;
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

// get transactions by account Id
// Shared endpoint — user fetches own account transactions, admin fetches any account
router.get("/:accountId", async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const accountId = req.params.accountId;
    const { page = 1, limit = 10, status, date } = req.query;

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

    if (role === "user") {
      filter.userId = userId;
    }

    const allTransactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("toAccount fromAccount", "nickname")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);

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
    res
      .status(200)
      .json({ transactions: formattedTransactions, totalDocuments: total });
  } catch (error) {
    console.error("❌ Failed to fetch transactions", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
