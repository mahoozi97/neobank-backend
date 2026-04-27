const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
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
      // enum: ["BHD", "USD", "EUR"],
    },
    type: {
      type: String,
      enum: ["credit", "debit"], // credit for future feature
      default: "debit",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      required: true,
    },
    description: {
      type: String,
      // optional
    },
  },
  { timestamps: true },
);
