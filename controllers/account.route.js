const router = require("express").Router();
const Account = require("../models/Account");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const nanoidShort = customAlphabet(alphabet, 12);

// mount route ← /account

router.post("/new", async (req, res) => {
  try {
    const userId = req.user._id;
    const accountType = req.body.type;

    const existingAccount = await Account.findOne({
      userId: userId,
      type: accountType,
      status: { $ne: "closed" }, // not equal "closed"
    });

    if (existingAccount) {
      return res
        .status(409)
        .json({ error: `You already have a ${req.body.type} account!` });
    }

    let accountNumber = "00";
    let exist;

    do {
      accountNumber += nanoidShort();
      console.log(accountNumber);
      accountNumber;
      exist = await Account.findOne({ accountNumber });
    } while (exist);

    const iban = "BH26NBK" + accountNumber;
    console.log(iban);

    const createdAccount = await Account.create({
      userId: userId,
      accountNumber: accountNumber,
      iban: iban,
      mobile: req.body.mobile,
      type: accountType,
    });

    // change to object and delete the mobile No.
    const { mobile, ...accountObject } = createdAccount.toObject();

    console.log("✅ Account created successfully:", accountObject);
    res.status(201).json(accountObject);
  } catch (error) {
    console.log("❌ Account creation failed. Please try again:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
