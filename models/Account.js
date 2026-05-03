const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      unique: true,
    },
    balance: {
      type: Number,
      min: 0,
      default: 0,
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
