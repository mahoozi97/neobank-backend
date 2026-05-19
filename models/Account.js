const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    iban: {
      type: String,
      unique: true,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      min: 0,
      default: 500,
    },
    currency: {
      type: String,
      default: "BHD",
      // enum: ["BHD", "USD", "EUR"],
    },
    type: {
      type: String,
      enum: ["savings", "current"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "frozen", "closed"],
      default: "active",
    },
  },
  { timestamps: true },
);

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
