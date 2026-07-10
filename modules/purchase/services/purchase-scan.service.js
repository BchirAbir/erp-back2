const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "../../../uploads");

function ensureUploads() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function parseInvoiceText(text) {
  const result = {};
  const t = text.replace(/\r/g, "").trim();

  // Supplier invoice reference
  const refMatch = t.match(
    /(?:facture\s*(?:n[°º]?|no\.?|num\.?)|n[°º]\s*facture|réf\.?\s*:?)\s*:?\s*([A-Z0-9][A-Z0-9/_-]{2,20})/i
  );
  if (refMatch) result.supplierInvoiceRef = refMatch[1].trim();

  // Invoice date (DD/MM/YYYY or DD-MM-YYYY)
  const dateMatch = t.match(
    /(?:date\s*(?:de\s*)?(?:la\s*)?facture|date\s*:)\s*(\d{1,2})[\/\-.]\s*(\d{1,2})[\/\-.]\s*(\d{4})/i
  );
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    result.invoiceDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  } else {
    // Generic date as fallback
    const fallback = t.match(/(\d{1,2})[\/\-.]\s*(\d{1,2})[\/\-.]\s*(\d{4})/);
    if (fallback) {
      const [, d, m, y] = fallback;
      result.invoiceDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  // Total TTC / Net à payer
  const ttcMatch = t.match(
    /(?:total\s+t\.?t\.?c\.?|net\s+[àa]\s+payer|montant\s+total\s+t\.?t\.?c\.?)\s*[:\s]+([\d\s]+[,.]\d{1,3})/i
  );
  if (ttcMatch) {
    const v = parseFloat(ttcMatch[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(v)) result.totalTtc = v;
  }

  // Total HT
  const htMatch = t.match(
    /(?:total\s+h\.?t\.?|montant\s+h\.?t\.?|sous[\s-]*total\s+h\.?t\.?)\s*[:\s]+([\d\s]+[,.]\d{1,3})/i
  );
  if (htMatch) {
    const v = parseFloat(htMatch[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(v)) result.subtotalHt = v;
  }

  // Matricule fiscal
  const mfMatch = t.match(/(?:m\.?f\.?|matricule\s*fiscal)\s*[:\s]+([0-9]{7}[A-Z]\/[A-Z]\/[0-9]{3}\/[0-9]{3}|[0-9A-Z\/]{8,})/i);
  if (mfMatch) result.supplierMf = mfMatch[1].trim();

  return result;
}

exports.uploadAndExtract = async (file) => {
  ensureUploads();

  const originalName = file.filename || "upload";
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  const buffer = await file.toBuffer();
  fs.writeFileSync(filepath, buffer);

  const fileUrl = `/uploads/${filename}`;
  let extracted = {};

  if (ext === ".pdf") {
    try {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      extracted = parseInvoiceText(data.text);
    } catch {
      // Extraction failed — return empty, user fills manually
    }
  }

  return { fileUrl, extracted };
};
