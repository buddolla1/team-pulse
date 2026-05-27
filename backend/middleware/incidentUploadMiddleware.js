const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadPath = path.resolve(__dirname, '..', 'uploads', 'incident-tracker');
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, safeName);
  }
});

module.exports = multer({ storage });
