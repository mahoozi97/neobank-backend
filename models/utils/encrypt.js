const crypto = require("crypto");

const algorithm = "aes-256-gcm";
const key = process.env.ENCRYPT_KEY;
const iv = Buffer.alloc(16, 0);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

const decrypt = (text) => {
  const decipher = 
    crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
};
