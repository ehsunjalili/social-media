const multer = require("multer");
const fs = require("fs");
const path = require("path");

exports.multerStorage = (destination, allowedTypes = /jpeg|jpg|png|webp/) => {
  //* Create the destination directory if is doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination);
  }

  //* Multer Configs
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destination);
    },

    filename: function (req, file, cb) {
      const uniqe = Date.now() * Math.floor(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqe}${ext}`);
    },
  });

  const fileFilter = function (req, file, cb) {
    //* Allow extension
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      // cb(new Error(409));
      cb(new Error("Invalid file type"));
      // return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
  };

  const uploader = multer({
    storage,
    limits: {
      fileSize: 512_000_000, // 5 MB limit
    },
    fileFilter,
  });

  return uploader;
};

