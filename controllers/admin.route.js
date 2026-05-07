const router = require("express").Router();
const mongoose = require("mongoose");
const KYC = require("../models/KYC");
const User = require("../models/User");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

// The mount route is /admin

//  - - - -  - -  - - -  - - - - ↓ Account ↓ - - - - -  - -  - - - - -  - - - -

// get all Accounts and filtring by status & type
router.get("/accounts", async (req, res) => {
  try {
    const { status, type } = req.query;

    const filteredParams = {};

    if (status) filteredParams.status = status;
    if (type) filteredParams.type = type;
    // const filter = status ? { status } : type ? { type } : {};
    const accounts = await Account.find(filteredParams).sort({ createdAt: -1 });

    if (!accounts || accounts.length === 0) {
      return res.status(404).json({ error: "Accounts not found!" });
    }

    console.log("✅ Fitched all accounts successfully", accounts);
    res.status(200).json(accounts);
  } catch (error) {
    console.error("❌ Failed to fetch all accounts", error);
    res.status(500).json({ error: error.message });
  }
});

// get Account by ID
router.get("/account/:accountId", async (req, res) => {
  try {
    const accountId = req.params.accountId;

    const foundAccount = await Account.findById(accountId);

    if (!foundAccount) {
      return res.status(404).json({ error: "Account not found!" });
    }

    console.log("✅ Fitched account successfully", foundAccount);
    res.status(200).json(foundAccount);
  } catch (error) {
    console.error("❌ Failed to fetch account", error);
    res.status(500).json({ error: error.message });
  }
});

// get Account by User ID
router.get("/account/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const foundAccount = await Account.find({ userId: userId });

    if (!foundAccount || foundAccount === 0) {
      return res.status(404).json({ error: "Account not found!" });
    }

    console.log("✅ Fitched account successfully", foundAccount);
    res.status(200).json(foundAccount);
  } catch (error) {
    console.error("❌ Failed to fetch account", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ KYC ↓ - - - - -  - -  - - - - -  - - - -

// get all kyc and filtring by status
router.get("/kyc", async (req, res) => {
  try {
    // const adminId = req.user._id // ← for audit log!

    const { status } = req.query;

    const filter = status ? { status } : {};
    const allKyc = await KYC.find(filter).sort({ createdAt: -1 });

    if (!allKyc || allKyc.length === 0) {
      return res.status(404).json({ error: "No [KYC] documents found!" });
    }

    console.log("✅ [KYC] fitched all documents successfully", allKyc);
    res.status(200).json(allKyc);
  } catch (error) {
    console.error("❌ [KYC] Failed to fetch all documents", error);
    res.status(500).json({ error: error.message });
  }
});

// get kyc by _id
router.get("/kyc/:kycId", async (req, res) => {
  try {
    // const adminId = req.user._id // ← for audit log!
    const kycId = req.params.kycId;
    const Kyc = await KYC.findById(kycId);

    if (!Kyc) {
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    console.log("✅ Fitched KYC document successfully", Kyc);
    res.status(200).json(Kyc);
  } catch (error) {
    console.error("❌ Failed to fetch KYC document", error);
    res.status(500).json({ error: error.message });
  }
});

// get kyc by userId
router.get("/kyc/user/:userId", async (req, res) => {
  try {
    // const adminId = req.user._id // ← for audit log!
    const userId = req.params.userId;
    const userKyc = await KYC.findOne({ userId: userId });

    if (!userKyc) {
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    console.log("✅ Fitched KYC document successfully", userKyc);
    res.status(200).json(userKyc);
  } catch (error) {
    console.error("❌ Failed to fetch KYC document", error);
    res.status(500).json({ error: error.message });
  }
});

// approve KYC
router.put("/kyc/:kycId/approve", async (req, res) => {
  console.log(req.params.kycId);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // const adminId = req.user._id // ← for audit log!
    const kycId = req.params.kycId;

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      { status: "approved" },
      { new: true, session }, // ← pass session
    );

    if (!kyc) {
      await session.abortTransaction(); // ❌ Any failure → rollback both
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    const user = await User.findByIdAndUpdate(
      kyc.userId,
      { kycStatus: "verified" },
      { new: true, session }, // ← pass session
    );

    if (!user) {
      await session.abortTransaction(); // ❌ Any failure → rollback both
      return res.status(404).json({ error: "User not found" });
    }

    await session.commitTransaction(); // ✅ Both succeed → save
    res.status(200).json({ message: "✅ KYC approved successfully" });
  } catch (error) {
    await session.abortTransaction(); // ❌ Any failure → rollback both
    console.log("❌ Error approving KYC: ", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

// Reject KYC
router.put("/kyc/:kycId/reject", async (req, res) => {
  try {
    // const adminId = req.user._id // ← for audit log!
    const kycId = req.params.kycId;
    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      { status: "rejected", comment: req.body.comment },
      { new: true },
    );

    if (!kyc) {
      return res.status(404).json({ error: "KYC Document not found!" });
    }

    res.status(200).json({ message: "✅ KYC rejected successfully" });
  } catch (error) {
    console.log("❌ Error rejecting KYC: ", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ BLOCK USER ↓ - - - - -  - -  - - - - -  - - - -

// block user
router.patch("/users/:userId/block", async (req, res) => {
  try {
    const userId = req.params.userId;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        status: "blocked",
      },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    console.log("✅ User status updated to Blocked");
    res.status(200).json({ message: "User has been successfully blocked." });
  } catch (error) {
    console.error("❌ Failed to block user", error);
    res.status(500).json({ error: error.message });
  }
});

//  - - - -  - -  - - -  - - - - ↓ TRANSACTIONS ↓ - - - - -  - -  - - - - -  - - - -

// get all transactions
router.get("/transactions", async (req, res) => {
  try {
    const { status, userId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    const allTransactions = await Transaction.find(filter).sort({
      createdAt: -1,
    });

    if (!allTransactions) {
      return res.status(404).json({ error: "Transactions not found!" });
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
    console.error("❌ Failed to fetch all transactions", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
