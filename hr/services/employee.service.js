const User = require("../../models/User");

const generateEmail = async (name) => {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const base = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  const sanitized = base.replace(/[^a-z0-9.]/g, "");
  let email = `${sanitized}@erp.com`;
  let counter = 2;
  while (await User.findOne({ email })) {
    email = `${sanitized}${counter}@erp.com`;
    counter++;
  }
  return email;
};

const roleMap = {
  // Managers
  "HR Manager":            "HR_MANAGER",
  "Marketing Manager":     "MARKETING_MANAGER",
  "Sales Manager":         "SALES_MANAGER",
  "Finance Manager":       "FINANCE_MANAGER",
  "Commercial Manager":    "COMMERCIAL_MANAGER",
  "Stock Manager":         "STOCK_MANAGER",
  "Purchase Manager":      "PURCHASE_MANAGER",
  "Production Manager":    "PRODUCTION_MANAGER",
  "Maintenance Manager":   "MAINTENANCE_MANAGER",
  "Depot Manager":         "DEPOT_MANAGER",
  "Warehouse Operator":    "WAREHOUSE_OPERATOR",
  // HR
  "HR Coordinator":        "EMPLOYEE",
  "Recruiter":             "EMPLOYEE",
  "Payroll Officer":       "EMPLOYEE",
  // Marketing
  "Marketing Specialist":  "EMPLOYEE",
  "Content Creator":       "EMPLOYEE",
  "SEO Analyst":           "EMPLOYEE",
  "Social Media Manager":  "EMPLOYEE",
  // Sales
  "Sales Representative":  "EMPLOYEE",
  "Account Manager":       "EMPLOYEE",
  "Customer Support":      "EMPLOYEE",
  "Logistics Coordinator": "EMPLOYEE",
  // Generic
  "Employee":              "EMPLOYEE",
  "Intern":                "EMPLOYEE",
};

exports.getAllEmployees = async (department) => {
  const filter = department
    ? { department }
    : { role: { $in: ["EMPLOYEE", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "FINANCE_MANAGER", "COMMERCIAL_MANAGER", "STOCK_MANAGER", "PURCHASE_MANAGER", "PRODUCTION_MANAGER", "MAINTENANCE_MANAGER", "DEPOT_MANAGER"] } };
  const users = await User.find(filter).select("-password").sort({ department: 1, createdAt: -1 });
  // Normalize accountStatus for old records that predate the field
  const MANAGER_ROLES = [
    "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER",
    "FINANCE_MANAGER", "COMMERCIAL_MANAGER", "STOCK_MANAGER",
    "PURCHASE_MANAGER", "PRODUCTION_MANAGER", "MAINTENANCE_MANAGER",
    "DEPOT_MANAGER",
  ];
  return users.map(u => {
    const obj = u.toObject();
    if (!obj.accountStatus) {
      // Old record: infer from role — managers without accountStatus are considered approved
      obj.accountStatus = MANAGER_ROLES.includes(obj.role) ? "approved" : "none";
    }
    return obj;
  });
};

exports.getStats = async (department) => {
  const [total, onLeave, employees] = await Promise.all([
    User.countDocuments({ department }),
    User.countDocuments({ department, status: "On Leave" }),
    User.find({ department }),
  ]);

  let avgTenure = 0;
  if (employees.length > 0) {
    const now = new Date();
    const totalYears = employees.reduce((sum, e) => {
      const diff = (now - new Date(e.joinedDate || e.createdAt)) / (1000 * 60 * 60 * 24 * 365);
      return sum + diff;
    }, 0);
    avgTenure = parseFloat((totalYears / employees.length).toFixed(1));
  }

  return { total, onLeave, avgTenure };
};

exports.createEmployee = async (department, data, createdByRole = "EMPLOYEE") => {
  const { name, position, phone, salary, joinedDate,
          matricule, cnssNumber, address, qualification, category, echelon,
          situation, familyStatus, numChildren, hourlyRate, cin } = data;
  const email = await generateEmail(name);
  const plainPassword = Math.random().toString(36).slice(2, 10).padEnd(8, "x");
  const role = roleMap[position] || "EMPLOYEE";

  // Determine accountStatus:
  // - EMPLOYEE role → always "none" (no login account needed)
  // - Manager role created by ADMIN → "approved" immediately (admin doesn't need to approve their own creations)
  // - Manager role created by anyone else (HR_MANAGER etc.) → "pending" (requires admin approval)
  const MANAGER_ROLES = [
    "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER",
    "FINANCE_MANAGER", "COMMERCIAL_MANAGER", "STOCK_MANAGER",
    "PURCHASE_MANAGER", "PRODUCTION_MANAGER", "MAINTENANCE_MANAGER",
    "DEPOT_MANAGER",
  ];
  let accountStatus = "none";
  if (MANAGER_ROLES.includes(role)) {
    accountStatus = createdByRole === "ADMIN" ? "approved" : "pending";
  }

  const user = await User.create({
    name,
    email,
    password: plainPassword,
    role,
    department,
    position: position || "",
    phone: phone || "",
    salary: salary || 0,
    joinedDate: joinedDate || new Date(),
    matricule:     matricule     || "",
    cnssNumber:    cnssNumber    || "",
    address:       address       || "",
    qualification: qualification || "",
    category:      category      || "",
    echelon:       echelon       || "",
    situation:     situation     || "",
    familyStatus:  familyStatus  || "",
    numChildren:   numChildren   || 0,
    hourlyRate:    hourlyRate    || 0,
    cin:           cin           || "",
    accountStatus,
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    department: user.department,
    position: user.position,
    phone: user.phone,
    salary: user.salary,
    joinedDate: user.joinedDate,
    plainPassword,
  };
};

exports.getEmployeeById = (id) => User.findById(id).select("-password");

exports.updateEmployee = async (id, data) => {
  const { name, email, phone, position, salary, joinedDate, department, status,
          matricule, cnssNumber, address, qualification, category, echelon,
          situation, familyStatus, numChildren, hourlyRate, cin } = data;
  const role = position ? (roleMap[position] || "EMPLOYEE") : undefined;
  const update = {};
  if (name)       update.name       = name;
  if (email)      update.email      = email;
  if (phone !== undefined) update.phone = phone;
  if (position)   { update.position = position; update.role = role; }
  if (salary !== undefined) update.salary = salary;
  if (joinedDate) update.joinedDate = joinedDate;
  if (department) update.department = department;
  if (status)     update.status     = status;
  if (matricule     !== undefined) update.matricule     = matricule;
  if (cnssNumber    !== undefined) update.cnssNumber    = cnssNumber;
  if (address       !== undefined) update.address       = address;
  if (qualification !== undefined) update.qualification = qualification;
  if (category      !== undefined) update.category      = category;
  if (echelon       !== undefined) update.echelon       = echelon;
  if (situation     !== undefined) update.situation     = situation;
  if (familyStatus  !== undefined) update.familyStatus  = familyStatus;
  if (numChildren   !== undefined) update.numChildren   = numChildren;
  if (hourlyRate    !== undefined) update.hourlyRate    = hourlyRate;
  if (cin           !== undefined) update.cin           = cin;
  return User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select("-password");
};

exports.deleteEmployee = (id) => User.findByIdAndDelete(id);