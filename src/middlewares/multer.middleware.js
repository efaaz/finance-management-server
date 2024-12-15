import multer from "multer";

// Configure multer to save files in a temporary directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Save file with a timestamp prefix
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."));
    }
  },
});
