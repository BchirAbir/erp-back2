// utils/audit.util.js
const AuditLog = require("../models/AuditLog");

// ── Action label registry ─────────────────────────────────────────────────────
const ACTION_LABELS = {
  // HR
  CREATE_EMPLOYEE:    "Created employee",
  UPDATE_EMPLOYEE:    "Updated employee",
  DELETE_EMPLOYEE:    "Deleted employee",
  RESET_PASSWORD:     "Reset password for",
  CREATE_USER:        "Created user account",
  UPDATE_USER:        "Updated user account",
  DELETE_USER:        "Deleted user account",
  ADD_LEAVE:          "Added leave request",
  UPDATE_PAYROLL:     "Updated payroll",
  CREATE_AVANCE:      "Created salary advance",
  UPDATE_AVANCE:      "Updated salary advance",
  DELETE_AVANCE:      "Deleted salary advance",
  UPDATE_ATTENDANCE:  "Updated attendance",
  CREATE_PERFORMANCE: "Created performance review",
  UPDATE_PERFORMANCE: "Updated performance review",

  // Marketing
  CREATE_CAMPAIGN:    "Created campaign",
  UPDATE_CAMPAIGN:    "Updated campaign",
  DELETE_CAMPAIGN:    "Deleted campaign",
  CREATE_PROMOTION:   "Created promotion",
  UPDATE_PROMOTION:   "Updated promotion",
  DELETE_PROMOTION:   "Deleted promotion",
  CREATE_SEGMENT:     "Created segment",
  UPDATE_SEGMENT:     "Updated segment",
  DELETE_SEGMENT:     "Deleted segment",
  POST_SOCIAL:        "Published social media post",

  // Online Sales
  CREATE_ORDER:       "Created online order",
  UPDATE_ORDER:       "Updated online order",
  DELETE_ORDER:       "Deleted online order",
  UPDATE_ORDER_STATUS:"Updated order status",
  CREATE_PRODUCT:     "Added product to catalog",
  UPDATE_PRODUCT:     "Updated catalog product",
  DELETE_PRODUCT:     "Removed product from catalog",
  CREATE_SHIPMENT:    "Created shipment",
  UPDATE_SHIPMENT:    "Updated shipment",
  UPDATE_SHIPMENT_STATUS: "Updated shipment status",
  CREATE_RETURN:      "Created return request",
  UPDATE_RETURN:      "Updated return request",
  UPDATE_RETURN_STATUS:   "Updated return status",
  CREATE_RESELLER:    "Created reseller account",
  UPDATE_RESELLER:    "Updated reseller",
  DELETE_RESELLER:    "Deleted reseller",
  FULFILL_RESELLER_REQUEST: "Fulfilled reseller request",
  UPDATE_ALLOCATION:  "Updated stock allocation",
  CREATE_REFILL:      "Created stock refill request",

  // Commercial
  CREATE_SALES_ORDER: "Created sales order",
  UPDATE_SALES_ORDER: "Updated sales order",
  DELETE_SALES_ORDER: "Deleted sales order",
  CREATE_CUSTOMER:    "Created customer",
  UPDATE_CUSTOMER:    "Updated customer",
  DELETE_CUSTOMER:    "Deleted customer",
  CREATE_INVOICE:     "Created invoice",
  CREATE_RMA:         "Created RMA return",
  UPDATE_RMA:         "Updated RMA",

  // Stock
  CREATE_STOCK_PRODUCT:  "Created stock product",
  UPDATE_STOCK_PRODUCT:  "Updated stock product",
  DELETE_STOCK_PRODUCT:  "Deleted stock product",
  CREATE_STOCK_MOVEMENT: "Created stock movement",
  CREATE_INVENTORY:      "Created inventory check",
  UPDATE_INVENTORY:      "Updated inventory",

  // Purchase
  CREATE_PURCHASE_REQUEST: "Created purchase request",
  UPDATE_PURCHASE_REQUEST: "Updated purchase request",
  CREATE_PURCHASE_ORDER:   "Created purchase order",
  UPDATE_PURCHASE_ORDER:   "Updated purchase order",
  CREATE_SUPPLIER:         "Created supplier",
  UPDATE_SUPPLIER:         "Updated supplier",
  DELETE_SUPPLIER:         "Deleted supplier",
  CREATE_TENDER:           "Created tender",
  UPDATE_TENDER:           "Updated tender",

  // Finance
  CREATE_FINANCE_ENTRY:  "Created finance entry",
  UPDATE_FINANCE_ENTRY:  "Updated finance entry",

  // Production
  CREATE_PRODUCTION_ORDER: "Created production order",
  UPDATE_PRODUCTION_ORDER: "Updated production order",
  DELETE_PRODUCTION_ORDER: "Deleted production order",

  // Admin
  // Documents (all modules)
  UPLOAD_DOCUMENT: "Uploaded document",
  DELETE_DOCUMENT: "Deleted document",

  // Reports
  SAVE_REPORT:     "Saved report",

  APPROVE_ACCOUNT: "Approved account",
  REJECT_ACCOUNT:  "Rejected account",
  DELETE_ACCOUNT:  "Deleted account",
  APPROVE_DELETE:  "Approved document deletion",
};

// ── URL → action mapper ───────────────────────────────────────────────────────
// Maps (method + URL pattern) to an action string
function inferAction(method, url) {
  const u = url.split("?")[0].replace(/\/[a-f0-9]{24}/g, "/:id");

  const M = method.toUpperCase();

  // Online Sales
  if (M === "POST"  && u.includes("/online-sales/orders"))           return "CREATE_ORDER";
  if (M === "PUT"   && u.includes("/online-sales/orders"))           return "UPDATE_ORDER";
  if (M === "DELETE"&& u.includes("/online-sales/orders"))           return "DELETE_ORDER";
  if (M === "PATCH" && u.includes("/online-sales/orders") && u.includes("/status")) return "UPDATE_ORDER_STATUS";
  if (M === "POST"  && u.includes("/online-sales/products"))         return "CREATE_PRODUCT";
  if (M === "PUT"   && u.includes("/online-sales/products"))         return "UPDATE_PRODUCT";
  if (M === "DELETE"&& u.includes("/online-sales/products"))         return "DELETE_PRODUCT";
  if (M === "PATCH" && u.includes("/online-sales/products") && u.includes("/allocation")) return "UPDATE_ALLOCATION";
  if (M === "POST"  && u.includes("/online-sales/shipments"))        return "CREATE_SHIPMENT";
  if (M === "PUT"   && u.includes("/online-sales/shipments"))        return "UPDATE_SHIPMENT";
  if (M === "PATCH" && u.includes("/online-sales/shipments") && u.includes("/status")) return "UPDATE_SHIPMENT_STATUS";
  if (M === "POST"  && u.includes("/online-sales/returns"))          return "CREATE_RETURN";
  if (M === "PUT"   && u.includes("/online-sales/returns"))          return "UPDATE_RETURN";
  if (M === "PATCH" && u.includes("/online-sales/returns") && u.includes("/status")) return "UPDATE_RETURN_STATUS";
  if (M === "POST"  && u.includes("/online-sales/resellers") && !u.includes("/requests")) return "CREATE_RESELLER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/online-sales/resellers") && !u.includes("/requests")) return "UPDATE_RESELLER";
  if (M === "DELETE"&& u.includes("/online-sales/resellers"))        return "DELETE_RESELLER";
  if (M === "PATCH" && u.includes("/online-sales/resellers") && u.includes("/requests")) return "FULFILL_RESELLER_REQUEST";
  if (M === "POST"  && u.includes("/online-sales/refill"))           return "CREATE_REFILL";
  if (M === "POST"  && u.includes("/online-sales/documents"))        return "UPLOAD_DOCUMENT";
  if (M === "DELETE"&& u.includes("/online-sales/documents"))        return "DELETE_DOCUMENT";
  if (M === "POST"  && u.includes("/documents"))                     return "UPLOAD_DOCUMENT";
  if (M === "DELETE"&& u.includes("/documents"))                     return "DELETE_DOCUMENT";
  if (M === "POST"  && u.includes("/activity/report"))               return "SAVE_REPORT";

  // Marketing
  if (M === "POST"  && u.includes("/campaigns"))                     return "CREATE_CAMPAIGN";
  if ((M === "PUT" || M === "PATCH") && u.includes("/campaigns"))    return "UPDATE_CAMPAIGN";
  if (M === "DELETE"&& u.includes("/campaigns"))                     return "DELETE_CAMPAIGN";
  if (M === "POST"  && u.includes("/promotions"))                    return "CREATE_PROMOTION";
  if ((M === "PUT" || M === "PATCH") && u.includes("/promotions"))   return "UPDATE_PROMOTION";
  if (M === "DELETE"&& u.includes("/promotions"))                    return "DELETE_PROMOTION";
  if (M === "POST"  && u.includes("/segments"))                      return "CREATE_SEGMENT";
  if ((M === "PUT" || M === "PATCH") && u.includes("/segments"))     return "UPDATE_SEGMENT";
  if (M === "DELETE"&& u.includes("/segments"))                      return "DELETE_SEGMENT";
  if (M === "POST"  && u.includes("/social"))                        return "POST_SOCIAL";

  // HR
  if (M === "POST"  && u.includes("/avances"))                       return "CREATE_AVANCE";
  if ((M === "PUT" || M === "PATCH") && u.includes("/avances"))      return "UPDATE_AVANCE";
  if (M === "DELETE"&& u.includes("/avances"))                       return "DELETE_AVANCE";
  if (M === "POST"  && u.includes("/payroll"))                       return "UPDATE_PAYROLL";
  if (M === "POST"  && u.includes("/performance"))                   return "CREATE_PERFORMANCE";
  if ((M === "PUT" || M === "PATCH") && u.includes("/performance"))  return "UPDATE_PERFORMANCE";

  // Commercial
  if (M === "POST"  && u.includes("/commercial/orders"))             return "CREATE_SALES_ORDER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/commercial/orders")) return "UPDATE_SALES_ORDER";
  if (M === "DELETE"&& u.includes("/commercial/orders"))             return "DELETE_SALES_ORDER";
  if (M === "POST"  && u.includes("/commercial/customers"))          return "CREATE_CUSTOMER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/commercial/customers")) return "UPDATE_CUSTOMER";
  if (M === "DELETE"&& u.includes("/commercial/customers"))          return "DELETE_CUSTOMER";
  if (M === "POST"  && u.includes("/commercial/invoices"))           return "CREATE_INVOICE";
  if (M === "POST"  && u.includes("/commercial/rmas"))               return "CREATE_RMA";
  if ((M === "PUT" || M === "PATCH") && u.includes("/commercial/rmas")) return "UPDATE_RMA";

  // Stock
  if (M === "POST"  && u.includes("/stock/products"))                return "CREATE_STOCK_PRODUCT";
  if ((M === "PUT" || M === "PATCH") && u.includes("/stock/products")) return "UPDATE_STOCK_PRODUCT";
  if (M === "DELETE"&& u.includes("/stock/products"))                return "DELETE_STOCK_PRODUCT";
  if (M === "POST"  && u.includes("/stock/movements"))               return "CREATE_STOCK_MOVEMENT";
  if (M === "POST"  && u.includes("/stock/inventories"))             return "CREATE_INVENTORY";
  if ((M === "PUT" || M === "PATCH") && u.includes("/stock/inventories")) return "UPDATE_INVENTORY";

  // Purchase
  if (M === "POST"  && u.includes("/purchase/requests"))             return "CREATE_PURCHASE_REQUEST";
  if ((M === "PUT" || M === "PATCH") && u.includes("/purchase/requests")) return "UPDATE_PURCHASE_REQUEST";
  if (M === "POST"  && u.includes("/purchase/orders"))               return "CREATE_PURCHASE_ORDER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/purchase/orders")) return "UPDATE_PURCHASE_ORDER";
  if (M === "POST"  && u.includes("/purchase/suppliers"))            return "CREATE_SUPPLIER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/purchase/suppliers")) return "UPDATE_SUPPLIER";
  if (M === "DELETE"&& u.includes("/purchase/suppliers"))            return "DELETE_SUPPLIER";
  if (M === "POST"  && u.includes("/purchase/tenders"))              return "CREATE_TENDER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/purchase/tenders")) return "UPDATE_TENDER";

  // Finance
  if (M === "POST"  && u.includes("/finance"))                       return "CREATE_FINANCE_ENTRY";
  if ((M === "PUT" || M === "PATCH") && u.includes("/finance"))      return "UPDATE_FINANCE_ENTRY";

  // Production
  if (M === "POST"  && u.includes("/production/orders"))             return "CREATE_PRODUCTION_ORDER";
  if ((M === "PUT" || M === "PATCH") && u.includes("/production/orders")) return "UPDATE_PRODUCTION_ORDER";
  if (M === "DELETE"&& u.includes("/production/orders"))             return "DELETE_PRODUCTION_ORDER";

  // Admin
  if (M === "PATCH" && u.includes("/admin") && u.includes("/approve")) return "APPROVE_ACCOUNT";
  if (M === "PATCH" && u.includes("/admin") && u.includes("/reject"))  return "REJECT_ACCOUNT";

  return null; // not tracked
}

// ── Department mapper ─────────────────────────────────────────────────────────
function inferDepartment(url, userRole) {
  if (url.includes("/hr") || url.includes("/employees") || url.includes("/attendance") ||
      url.includes("/payroll") || url.includes("/performance") || url.includes("/avances"))
    return "HR";
  if (url.includes("/marketing") || url.includes("/campaigns") ||
      url.includes("/promotions") || url.includes("/segments") || url.includes("/social"))
    return "Marketing";
  if (url.includes("/online-sales") || url.includes("/reseller"))
    return "Online Sales";
  if (url.includes("/commercial"))   return "Commercial";
  if (url.includes("/stock"))        return "Stock";
  if (url.includes("/purchase") || url.includes("/achat")) return "Purchase";
  if (url.includes("/finance"))      return "Finance";
  if (url.includes("/production"))   return "Production";
  if (url.includes("/admin"))        return "Admin";

  // Fallback to role-based department
  const roleMap = {
    HR_MANAGER:         "HR",
    MARKETING_MANAGER:  "Marketing",
    SALES_MANAGER:      "Online Sales",
    COMMERCIAL_MANAGER: "Commercial",
    STOCK_MANAGER:      "Stock",
    PURCHASE_MANAGER:   "Purchase",
    FINANCE_MANAGER:    "Finance",
    ADMIN:              "Admin",
  };
  return roleMap[userRole] || "None";
}

// ── Core logAction (called explicitly from routes) ─────────────────────────────
exports.logAction = async (actor, action, target = "", meta = {}) => {
  try {
    if (!actor || !actor._id || !actor.name || !actor.role) {
      console.warn("[AuditLog] No actor provided, skipping log");
      return;
    }
    await AuditLog.create({
      userId:      actor._id,
      userName:    actor.name,
      userRole:    actor.role,
      action,
      actionLabel: ACTION_LABELS[action] || action,
      target,
      department:  meta.department || actor.department || "None",
      meta,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write log:", err.message);
  }
};

// ── Auto-log hook (attached to Fastify onResponse) ────────────────────────────
// Call this once in server.js: fastify.addHook("onResponse", autoLogHook)
exports.autoLogHook = async (request, reply) => {
  try {
    // Only log successful mutating requests
    const method = request.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
    if (reply.statusCode >= 400) return; // don't log failed requests

    const user = request.user;
    if (!user || !user._id) return; // not authenticated

    const url    = request.url;
    const action = inferAction(method, url);
    if (!action) return; // not a tracked action

    // Skip if this action was already explicitly logged by the route handler
    // (e.g. HR routes call logAction manually — avoid duplicates)
    const alreadyLogged = [
      "CREATE_EMPLOYEE", "UPDATE_EMPLOYEE", "DELETE_EMPLOYEE",
      "ADD_LEAVE", "APPROVE_ACCOUNT", "REJECT_ACCOUNT", "UPLOAD_DOCUMENT", "DELETE_DOCUMENT", "DELETE_ORDER",
    ];
    if (alreadyLogged.includes(action)) return;

    const department = inferDepartment(url, user.role);

    // Try to extract a meaningful target from the request body
    const body   = request.body || {};
    const target = body.name || body.title || body.orderNo || body.shipmentNo ||
                   body.returnNo || body.sku || body.code || body.email ||
                   url.split("/").filter(Boolean).pop() || "";

    await AuditLog.create({
      userId:      user._id,
      userName:    user.name,
      userRole:    user.role,
      action,
      actionLabel: ACTION_LABELS[action] || action,
      target:      String(target).slice(0, 100),
      department,
      meta:        { method, url },
    });
  } catch (err) {
    // Never crash the request — audit logging is best-effort
    console.error("[AuditLog] autoLogHook failed:", err.message);
  }
};