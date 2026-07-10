// scripts/migrate-documents.js
// Converts existing base64 documents in MongoDB to files on disk
// Run once: node scripts/migrate-documents.js

require("dotenv").config();
const mongoose = require("mongoose");
const path     = require("path");
const fs       = require("fs");

// Load model directly to access fileData
const documentSchema = new mongoose.Schema({
  employeeId:   mongoose.Schema.Types.ObjectId,
  employeeName: String,
  department:   String,
  type:         String,
  fileName:     String,
  filePath:     { type: String, default: "" },
  fileData:     { type: String, default: "" },
  mimeType:     { type: String, default: "application/pdf" },
  fileSize:     Number,
  note:         { type: String, default: "" },
  uploadedBy:   String,
}, { timestamps: true });

const Document = mongoose.models.Document ||
  mongoose.model("Document", documentSchema);

const UPLOAD_ROOT = path.join(__dirname, "../uploads");
const DEPT_FOLDER = {
  "HR":           "hr",
  "Marketing":    "marketing",
  "Online Sales": "sales",
};

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/emm-erp";
  await mongoose.connect(uri);
  console.log("Connected to:", uri);

  // Find all docs that still have base64 data and no filePath
  const docs = await Document.find({
    fileData: { $exists: true, $ne: "" },
    $or: [
      { filePath: { $exists: false } },
      { filePath: "" },
    ],
  });

  console.log(`Found ${docs.length} document(s) to migrate`);

  let success = 0;
  let failed  = 0;

  for (const doc of docs) {
    try {
      const folder = DEPT_FOLDER[doc.department] || "hr";
      const dir    = path.join(UPLOAD_ROOT, folder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const ext      = path.extname(doc.fileName) || ".pdf";
      const base     = path.basename(doc.fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const unique   = `${base}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const absPath  = path.join(dir, unique);
      const relPath  = `uploads/${folder}/${unique}`;

      // Write base64 to file
      const buffer = Buffer.from(doc.fileData, "base64");
      fs.writeFileSync(absPath, buffer);

      // Update DB record
      await Document.findByIdAndUpdate(doc._id, {
        filePath: relPath,
        fileData: "",       // clear base64 to save space
        fileSize: doc.fileSize || buffer.length,
      });

      console.log(`✅ Migrated: ${doc.fileName} → ${relPath}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed: ${doc.fileName} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${success} migrated, ${failed} failed.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });