const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { trim } = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    cpr: {
      type: String,
      required: true,
      unique: true,
      maxlength: 9
    },
    password: {
      type: String,
      required: true,
    },
    kycStatus: {
      type: String,
      enum: ["unverified", "verified"],
      default: "unverified",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.name) {
    this.name = this.name.toUpperCase();
  }
});

userSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }

  if (update.name) {
    update.name = update.name.toUpperCase();
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
