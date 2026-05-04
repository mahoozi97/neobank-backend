const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
  },
  name: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
    unique: true,
  },
  cvv: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    required: true,
  },
  validThru: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    default: "debit",
  },
  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },
});

const Card = mongoose.model("Card", cardSchema);
module.exports = Card;
