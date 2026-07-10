// server.js

const Fastify = require("fastify");
const dotenv  = require("dotenv");
const deptRoutes             = require("./hr/routes/department.routes");
const cyclicOrderService     = require("./modules/production/services/cyclic-order.service");
const { autoLogHook }        = require("./utils/audit.util");
const { startPayrollCron } = require("./hr/payrollCron");
dotenv.config();

const fastify = Fastify({
  bodyLimit: 20 * 1024 * 1024,
  logger: process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : true,

});

// â”€â”€ Plugins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("@fastify/helmet"));
// Production origins come from CORS_ORIGINS (comma-separated), e.g.
// CORS_ORIGINS="https://app.mycompany.tn,https://www.mycompany.tn"
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

fastify.register(require("@fastify/cors"), {
  origin: (origin, cb) => {
    const isLocalDevOrigin =
      !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (isLocalDevOrigin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
fastify.register(require("@fastify/multipart"), {
  limits: { fileSize: 10 * 1024 * 1024 },
});
fastify.register(require("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({
    message: "Too many requests. Please try again later.",
  }),
});

fastify.register(require("./plugins/mongo.plugin"));
fastify.register(require("./plugins/jwt.plugin"));

// â”€â”€ Auth & Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./auth/routes/auth.routes"),  { prefix: "/api/auth"  });
fastify.register(require("./admin/routes/admin.routes"), { prefix: "/api/admin" });

// â”€â”€ Department (factory) routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(deptRoutes("HR"),           { prefix: "/api/hr"               });
fastify.register(deptRoutes("Marketing"),    { prefix: "/api/marketing"        });
fastify.register(deptRoutes("Online Sales"), { prefix: "/api/sales"            });
fastify.register(deptRoutes("Stock"),        { prefix: "/api/stock-admin"      });
fastify.register(deptRoutes("Commercial"),   { prefix: "/api/commercial-admin" });
fastify.register(deptRoutes("Finance"),      { prefix: "/api/finance-admin"    });
fastify.register(deptRoutes("Purchase"),     { prefix: "/api/purchase-admin"   });

// â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./hr/routes/systemNotification.routes"), { prefix: "/api/notifications" });

// â”€â”€ HR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./hr/routes/document.routes"),        { prefix: "/api/documents"        });
fastify.register(require("./hr/routes/avance.routes"),          { prefix: "/api/avances"          });
fastify.register(require("./hr/routes/attendance.routes"),      { prefix: "/api/attendance"       });
fastify.register(require("./hr/routes/dailyattendance.routes"), { prefix: "/api/daily-attendance" });
fastify.register(require("./hr/routes/performance.routes"),     { prefix: "/api/performance"      });
fastify.register(require("./hr/routes/payrollsummary.routes"),  { prefix: "/api/payroll"          });
fastify.register(require("./hr/routes/companyConfig.routes"),   { prefix: "/api/company-config"   });

// â”€â”€ Shared â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./shared/routes/deleteRequest.routes"), { prefix: "/api/delete-requests" });

// â”€â”€ Marketing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./marketing/routes/campaigns.routes"),           { prefix: "/api/campaigns" });
fastify.register(require("./marketing/routes/promotions.routes"),          { prefix: "/api/promotions" });
fastify.register(require("./marketing/routes/segments.routes"),            { prefix: "/api/segments"   });
fastify.register(require("./marketing/routes/social.routes"),              { prefix: "/api/social"     });
fastify.register(require("./marketing/routes/marketingCalendar.routes"),   { prefix: "/api/marketing"  });
fastify.register(require("./marketing/routes/marketingDocument.routes"),   { prefix: "/api/marketing"  });

// â”€â”€ Stock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./modules/stock/routes/stock.routes"),       { prefix: "/api/stock"                 });
fastify.register(require("./modules/stock/routes/product.routes"),     { prefix: "/api/stock/products"        });
fastify.register(require("./modules/stock/routes/threshold.routes"),   { prefix: "/api/stock/threshold-rules" });
fastify.register(require("./modules/stock/routes/alert.routes"),       { prefix: "/api/stock/alerts"          });
fastify.register(require("./modules/stock/routes/inventory.routes"),   { prefix: "/api/stock/inventories"     });
fastify.register(require("./modules/stock/routes/depot.routes"),       { prefix: "/api/stock/depots"          });
fastify.register(require("./modules/stock/routes/sku-setting.routes"), { prefix: "/api/stock/settings/sku"    });
fastify.register(require("./modules/stock/routes/document.routes"),    { prefix: "/api/stock/documents"       });

// â”€â”€ Commercial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./modules/commercial/routes/sales-order.routes"),       { prefix: "/api/commercial/orders"         });
fastify.register(require("./modules/commercial/routes/backorder.routes"),         { prefix: "/api/commercial/backorders"     });
fastify.register(require("./modules/commercial/routes/customer.routes"),          { prefix: "/api/commercial/customers"      });
fastify.register(require("./modules/commercial/routes/customer-invoice.routes"),  { prefix: "/api/commercial/invoices"       });
fastify.register(require("./modules/commercial/routes/devis.routes"),             { prefix: "/api/commercial/devis"          });
fastify.register(require("./modules/commercial/routes/carrier.routes"),           { prefix: "/api/commercial/carriers"       });
fastify.register(require("./modules/commercial/routes/vehicle.routes"),           { prefix: "/api/commercial/vehicles"       });
fastify.register(require("./modules/commercial/routes/rma.routes"),               { prefix: "/api/commercial/rmas"           });
fastify.register(require("./modules/commercial/routes/notification.routes"),      { prefix: "/api/commercial/notifications"  });
fastify.register(require("./modules/commercial/routes/delivery-plan.routes"),     { prefix: "/api/commercial/delivery-plans" });
fastify.register(require("./modules/commercial/routes/commercial-setting.routes"),{ prefix: "/api/commercial/settings"       });
fastify.register(require("./modules/commercial/routes/commercial-document.routes"),{ prefix: "/api/commercial/documents"     });

// â”€â”€ Purchase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./modules/purchase/routes/purchase-request.routes"),         { prefix: "/api/purchase/requests"              });
fastify.register(require("./modules/purchase/routes/supplier.routes"),                 { prefix: "/api/purchase/suppliers"             });
fastify.register(require("./modules/purchase/routes/tender.routes"),                   { prefix: "/api/purchase/tenders"               });
fastify.register(require("./modules/purchase/routes/purchase-order.routes"),           { prefix: "/api/purchase/orders"                });
fastify.register(require("./modules/purchase/routes/purchase-receipt.routes"),         { prefix: "/api/purchase/receipts"              });
fastify.register(require("./modules/purchase/routes/purchase-invoice.routes"),         { prefix: "/api/purchase/invoices"              });
fastify.register(require("./modules/purchase/routes/purchase-payment.routes"),         { prefix: "/api/purchase/payments"              });
fastify.register(require("./modules/purchase/routes/purchase-return.routes"),          { prefix: "/api/purchase/returns"               });
fastify.register(require("./modules/purchase/routes/purchase-setting.routes"),         { prefix: "/api/purchase/settings"              });
fastify.register(require("./modules/purchase/routes/purchase-scan.routes"),            { prefix: "/api/purchase/scan"                  });
fastify.register(require("./modules/purchase/routes/purchase-document.routes"),        { prefix: "/api/purchase/documents"             });
fastify.register(require("./modules/purchase/routes/supplementary-request.routes"),    { prefix: "/api/purchase/supplementary"         });
fastify.register(require("./modules/purchase/routes/supplementary-category.routes"),   { prefix: "/api/purchase/supplementary/categories" });
fastify.register(require("./modules/purchase/routes/purchase-product-category.routes"),{ prefix: "/api/purchase/product-categories"    });

// â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./modules/finance/routes/finance.routes"),          { prefix: "/api/finance"           });
fastify.register(require("./modules/finance/routes/finance-document.routes"), { prefix: "/api/finance/documents" });
fastify.register(require("./modules/finance/routes/emprunt.routes"), { prefix: "/api/finance/emprunts" });
// â”€â”€ Production â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./modules/production/routes/work-center.routes"),      { prefix: "/api/production/work-centers"  });
fastify.register(require("./modules/production/routes/production-order.routes"), { prefix: "/api/production/orders"        });
fastify.register(require("./modules/production/routes/cyclic-order.routes"),     { prefix: "/api/production/cyclic-orders" });

// â”€â”€ Online Sales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.register(require("./online-sales/routes/onlineSalesStats.routes"), { prefix: "/api/online-sales"           });
fastify.register(require("./online-sales/routes/onlineOrder.routes"),      { prefix: "/api/online-sales/orders"    });
fastify.register(require("./online-sales/routes/onlineProduct.routes"),    { prefix: "/api/online-sales/products"  });
fastify.register(require("./online-sales/routes/onlineShipment.routes"),   { prefix: "/api/online-sales/shipments" });
fastify.register(require("./online-sales/routes/onlineReturn.routes"),     { prefix: "/api/online-sales/returns"   });
fastify.register(require("./online-sales/routes/reseller.routes"),         { prefix: "/api/online-sales/resellers" });
fastify.register(require("./online-sales/routes/resellerPortal.routes"),   { prefix: "/api/online-sales/portal"    });
fastify.register(require("./online-sales/routes/onlineDocument.routes"),   { prefix: "/api/online-sales"           });
fastify.register(require("./online-sales/routes/stockRefill.routes"),      { prefix: "/api/online-sales/refill"    });

// GMAO intégré
fastify.register(require("./modules/gmao/routes/gmao.routes"), { prefix: "/api/gmao" });

// â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.get("/", async (req, reply) => {
  return { message: "ERP API is running âœ…" };
});

// â”€â”€ 404 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.setNotFoundHandler((req, reply) => {
  reply.code(404).send({ message: "Route not found" });
});

// â”€â”€ Global error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.setErrorHandler((err, req, reply) => {
  fastify.log.error(err);
  if (err.validation)           return reply.code(400).send({ message: "Validation error",  details: err.validation });
  if (err.name === "CastError") return reply.code(400).send({ message: "Invalid ID format", details: err.message   });
  if (err.name === "ValidationError") return reply.code(400).send({ message: "Validation error", details: err.message });
  if (err.code === 11000)       return reply.code(409).send({ message: "Duplicate entry",   details: err.message   });
  reply.code(err.statusCode || 500).send({ message: err.message || "Internal Server Error" });
});

// â”€â”€ Audit log hook â€” auto-tracks all manager mutations â”€â”€â”€â”€â”€
fastify.addHook("onResponse", autoLogHook);

// â”€â”€ Response time logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
fastify.addHook("onResponse", (request, reply, done) => {
  const ms = Number(reply.elapsedTime || 0);
  const status = ms > 1500 ? "SLOW" : ms > 800 ? "WARN" : "OK";
  fastify.log.info(`${status} ${request.method} ${request.url} - ${ms.toFixed(1)}ms`);
  done();
});

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PORT = process.env.PORT || 5000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) { fastify.log.error(err); process.exit(1); }

  cyclicOrderService.processDueOrders().catch(e => fastify.log.error(e));
  setInterval(() => {
    cyclicOrderService.processDueOrders().catch(e => fastify.log.error(e));
  }, 60 * 1000);
   startPayrollCron();
});




