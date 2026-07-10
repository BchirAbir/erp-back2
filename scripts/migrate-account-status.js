// scripts/migrate-account-status.js
// Sets accountStatus on all existing User records that don't have it yet
// Run once: node scripts/migrate-account-status.js

require("dotenv").config();
const mongoose = require("mongoose");
const User     = require("../models/User");

const MANAGER_ROLES = ["HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "ADMIN"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/emm-erp");
  console.log("Connected");

  // Find all users without accountStatus set
  const users = await User.find({ accountStatus: { $exists: false } });
  console.log(`Found ${users.length} users without accountStatus`);

  let updated = 0;
  for (const user of users) {
    // Managers already in the system → approved (they were working before this field existed)
    // Employees → none (no login account)
    user.accountStatus = MANAGER_ROLES.includes(user.role) ? "approved" : "none";
    await user.save();
    console.log(`✅ ${user.name} (${user.role}) → ${user.accountStatus}`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated} records.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });