const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
    required: true,
  },
  balance: {
    type: Number,
    min: 0,
    default: 0,
  },
  currency: {
    type: String,
    default: "BHD",
  },
  type: {
    type: String,
    enum: ["savings", "current"],
    required: true,
  },
});

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
