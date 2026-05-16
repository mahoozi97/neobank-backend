// Know Your Customer
const router = require("express").Router();
const cloudinary = require("cloudinary").v2;
const {
  uploadDocuments,
  formatFileSize,
  deleteFiles,
  multerErrorHandler,
} = require("../middleware/cloudinary");
const multer = require("multer");
const upload = multer({ storage: uploadDocuments });
const KYC = require("../models/KYC");

const createAuditLog = require("../utils/auditLog");

router.post(
  "/upload",
  upload.fields([
    { name: "frontId", maxCount: 1 },
    { name: "backId", maxCount: 1 },
    { name: "passport", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user._id;

      const foundCustomer = await KYC.findOne({
        userId: userId,
        status: { $ne: "rejected" }, // not equal "rejected"
      }).select("status");

      // convert uploaded files to object
      const files = Object.values(req.files).flat();

      if (foundCustomer) {
        if (foundCustomer.status === "approved") {
          deleteFiles(files);
          return res
            .status(400)
            .json({ error: "Your identity is already verified." });
        }

        if (foundCustomer.status === "pending") {
          deleteFiles(files);
          return res
            .status(400)
            .json({ error: "Your documents is already under review." });
        }
      }

      if (files.length !== 3) {
        // delete uploaded images
        deleteFiles(files);
        return res
          .status(400)
          .json({ error: "You must upload exactly 3 documents" });
      }

      // console.log(req.files);
      const documents = [
        { type: "front ID", url: req.files["frontId"][0].path },
        { type: "back ID", url: req.files["backId"][0].path },
        { type: "passport", url: req.files["passport"][0].path },
      ];

      const uploadedDocuments = await KYC.create({
        userId: userId,
        documents: documents,
      });

      const metadata = {
        documents: [
          {
            type: "front ID",
            size: formatFileSize(req.files["frontId"][0].size),
          },
          {
            type: "back ID",
            size: formatFileSize(req.files["backId"][0].size),
          },
          {
            type: "passport",
            size: formatFileSize(req.files["passport"][0].size),
          },
        ],
      };
      
      await createAuditLog(req, userId, "kyc_upload", metadata);

      console.log("✅ Documents uploaded successfully", uploadedDocuments);
      res.status(201).json(uploadedDocuments);
    } catch (error) {
      if (req.files) {
        await deleteFiles(Object.values(req.files).flat());
      }
      console.log("❌ Upload Documents failed. Please try again: ", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/", async (req, res) => {
  try {
    const userId = req.user._id;

    const kyc = await KYC.find({ userId: userId })
      .sort({ createdAt: -1 })
      .select("status createdAt comment");

    console.log("✅ Fitched KYC Documents successfully", kyc[0]);
    res.status(200).json(kyc[0]);
  } catch (error) {
    console.log("❌ Fetch KYC Documents failed. Please try again: ", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
