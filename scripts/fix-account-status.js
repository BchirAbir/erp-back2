require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Set all managers with real @erp.com email to "approved"
  const r1 = await User.updateMany(
    { role: { $in: ["HR_MANAGER","MARKETING_MANAGER","SALES_MANAGER"] }, email: { $regex: "@erp.com$" } },
    { $set: { accountStatus: "approved" } }
  );
  console.log("Set to approved:", r1.modifiedCount);

  // Set remaining managers (placeholder emails) to "pending"
  const r2 = await User.updateMany(
    { role: { $in: ["HR_MANAGER","MARKETING_MANAGER","SALES_MANAGER"] }, accountStatus: { $ne: "approved" } },
    { $set: { accountStatus: "pending" } }
  );
  console.log("Set to pending:", r2.modifiedCount);

  // Show result
  const managers = await User.find({ role: { $in: ["HR_MANAGER","MARKETING_MANAGER","SALES_MANAGER"] } })
    .select("name role email accountStatus");
  console.log("\nAll managers after fix:");
  managers.forEach(u => console.log(" - " + u.name + " | " + u.email + " | " + u.accountStatus));

  await mongoose.disconnect();
  console.log("\nDone.");
});