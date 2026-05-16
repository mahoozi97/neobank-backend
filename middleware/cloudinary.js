const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary-v2");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadDocuments = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "CloudinaryDemo",
    allowedFormats: ["jpeg", "png", "jpg"],
  },
});

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// delete uploaded files from Cloudinary
const deleteFiles = async (files) => {
  await Promise.all(
    files.map((file) => cloudinary.uploader.destroy(file.public_id)),
  );
};

const multerErrorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res
      .status(400)
      .json({ error: "You must upload exactly 3 documents." });
  }
  next(err);
};

module.exports = {
  uploadDocuments,
  formatFileSize,
  deleteFiles,
  multerErrorHandler,
};
