const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromAccount: {
      // Account Id
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccount: {
      // Account Id
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.1,
      max: 1000,
    },
    currency: {
      type: String,
      default: "BHD",
      enum: ["BHD"],
    },
    type: {
      type: String,
      enum: ["credit", "debit"], // credit for future feature
      default: "debit",
    },
    status: {
      type: String,
      enum: ["pending", "success", "rejected"],
      default: "pending",
    },
    description: {
      type: String,
      // optional
    },
    rejectionReason: {
      type: String,
      // optional
    },
  },
  { timestamps: true },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
