const router = require("express").Router();
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

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

    const transferDetails = {
      from: from.nickname,
      to: to.nickname,
      amount: `BD ${amount}`,
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
