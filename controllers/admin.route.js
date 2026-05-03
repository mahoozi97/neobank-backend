const router = require("express").Router();
const mongoose = require("mongoose");
const KYC = require("../models/KYC");
const User = require("../models/User");

// The mount route is /admin

// get all kyc
router.get("/kyc", async (req, res) => {
  try {
    // const adminId = req.user._id // ← for audit log!
    const allKyc = await KYC.find().sort({ createdAt: -1 });

    if (!allKyc) {
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

module.exports = router;
