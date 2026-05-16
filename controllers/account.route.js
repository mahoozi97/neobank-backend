const router = require("express").Router();
const Account = require("../models/Account");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const nanoidShort = customAlphabet(alphabet, 12);
const createAuditLog = require("../utils/auditLog");

// mount route ← /account

// Create a new Account
router.post("/", async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, mobile, nickname } = req.body;

    if (mobile) {
      if (mobile.length !== 8) {
        return res
          .status(400)
          .json({ error: "Please enter a valid mobile no." });
      }
    }

    const existingAccounts = await Account.find({
      userId: userId,
      status: { $ne: "closed" }, // not equal "closed"
    });

    for (const account of existingAccounts) {
      if (account.type === type) {
        return res
          .status(409)
          .json({ error: `You already have a ${type} account!` });
      }

      if (account.nickname === nickname) {
        return res
          .status(409)
          .json({ error: "You already have an account with this nickname." });
      }
    }

    let accountNumber = "00";
    let exist;

    do {
      accountNumber += nanoidShort();
      console.log(accountNumber);
      accountNumber;
      exist = await Account.findOne({ accountNumber });
    } while (exist);

    const iban = "BH26NEOB" + accountNumber;
    console.log(iban);

    const createdAccount = await Account.create({
      userId: userId,
      nickname: nickname,
      accountNumber: accountNumber,
      iban: iban,
      mobile: mobile,
      type: type,
    });

    // change to object and delete the mobile No.
    const { mobile: _mobile, ...accountObject } = createdAccount.toObject();

    console.log("✅ Account created successfully:", accountObject);
    await createAuditLog(req, userId, "open_account", (metadata = {}));
    res.status(201).json(accountObject);
  } catch (error) {
    console.log("❌ Account creation failed. Please try again:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Accounts by User ID (token)
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;

    const foundAccounts = await Account.find({
      userId: userId,
      status: { $ne: "closed" },
    });

    if (!foundAccounts || foundAccounts === 0) {
      return res.status(404).json({ error: "Account not found!" });
    }

    console.log("✅ Fitched account successfully", foundAccounts);
    res.status(200).json(foundAccounts);
  } catch (error) {
    console.error("❌ Failed to fetch account", error);
    res.status(500).json({ error: error.message });
  }
});

// get accounts by IBAN or Mobile No.
router.post("/lookup", async (req, res) => {
  try {
    const { iban, mobile, beneficiary } = req.body;

    if (mobile) {
      if (mobile.length !== 8) {
        return res
          .status(400)
          .json({ error: "Please enter a valid mobile no." });
      }
    }

    if (iban) {
      if (iban.length !== 22) {
        return res.status(400).json({ error: "Please enter a valid IBAN" });
      }
    }

    const foundAccounts = await Account.find({
      $or: [{ iban: iban }, { mobile: mobile }],
    })
      .select("nickname")
      .populate("userId", "name");

    if (!foundAccounts || foundAccounts === 0) {
      return res.status(404).json({ error: "Account not found!" });
    }

    for (account of foundAccounts) {
      if (account.userId.name !== beneficiary.toUpperCase()) {
        return res.status(404).json({
          error: "The provided information does not match any account!",
        });
      }
    }

    console.log("✅ Fitched account successfully", foundAccounts);
    res.status(200).json(foundAccounts);
  } catch (error) {
    console.error("❌ Failed to fetch account", error);
    res.status(500).json({ error: error.message });
  }
});

// activate account
router.patch("/:accountId/activate", async (req, res) => {
  try {
    const userId = req.user._id;
    const accountId = req.params.accountId;

    const updatedAccount = await Account.findOneAndUpdate(
      { _id: accountId, userId: userId },
      { $set: { status: "active" } },
      { returnDocument: "after" },
    );

    if (!updatedAccount) {
      return res.status(404).json({ error: "Account not found." });
    }

    console.log("✅ Account status updated to Active");
    await createAuditLog(req, userId, "unfreeze_account", (metadata = {}));
    res
      .status(200)
      .json({ message: "Account has been successfully activate." });
  } catch (error) {
    console.error("❌ Failed to active account", error);
    res.status(500).json({ error: error.message });
  }
});

// freeze account
router.patch("/:accountId/freeze", async (req, res) => {
  try {
    const userId = req.user._id;
    const accountId = req.params.accountId;

    const updatedAccount = await Account.findOneAndUpdate(
      { _id: accountId, userId: userId },
      { $set: { status: "frozen" } },
      { returnDocument: "after" },
    );

    if (!updatedAccount) {
      return res.status(404).json({ error: "Account not found." });
    }

    console.log("✅ Account status updated to Frozen");
    await createAuditLog(req, userId, "freeze_account", (metadata = {}));
    res.status(200).json({ message: "Account has been successfully frozen." });
  } catch (error) {
    console.error("❌ Failed to freeze account", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
