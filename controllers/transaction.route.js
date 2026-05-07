const router = require("express").Router();
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// get by user Id and filtred by status
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = status ? { userId: userId, status } : { userId: userId };
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

// transfer amount
router.post("/transfer", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;
    const { fromAccount, toAccount, amount } = req.body;

    const sender = await User.findById(userId).select("kycStatus");

    if (sender.kycStatus !== "verified" && amount > 10) {
      return res
        .status(409)
        .json({ error: "You are not qualified to complete this proccess" });
    }

    if (amount < 0.1) {
      return res
        .status(409)
        .json({ error: "The amount is less than the minimum" });
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
        balance: { $gte: amount }, // if amount >= balance
        status: { $nin: ["closed", "frozen"] }, // not equal closed or frozen
      },
      { $inc: { balance: -amount } },
      { returnDocument: "after", session },
    );

    if (!from) {
      await session.abortTransaction();
      const reasonMessage =
        "Transfer failed: insufficient balance or account is unavailable";
      await Transaction.create({
        userId,
        fromAccount,
        toAccount,
        amount,
        status: "rejected",
        rejectionReason: reasonMessage,
      });
      return res.status(404).json({ error: reasonMessage });
    }

    const to = await Account.findOneAndUpdate(
      { _id: toAccount, status: { $ne: "closed" } },
      { $inc: { balance: +amount } },
      { returnDocument: "after", session },
    );

    if (!to) {
      await session.abortTransaction();
      const reasonMessage =
        "Transfer failed: recipient account is closed or does not exist";
      await Transaction.create({
        userId,
        fromAccount,
        toAccount,
        amount,
        status: "rejected",
        rejectionReason: reasonMessage,
      });
      return res.status(404).json({ error: reasonMessage });
    }

    newTransaction[0].status = "success";
    await newTransaction[0].save({ session });
    await session.commitTransaction();

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
    res.status(200).json(transferDetails);
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Transfer failed", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
