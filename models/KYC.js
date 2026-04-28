const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["front ID", "back ID", "passport"],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});

const kycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  documents: {
    type: [documentSchema],
    validate: {
      validator: (docs) => docs.length === 3, // should be 3 documents
      message: "You must upload exactly 3 documents",
    },
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

const KYC = mongoose.model("KYC", kycSchema);
module.exports = KYC;
