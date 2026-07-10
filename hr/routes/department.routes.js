// routes/department.routes.js

const employeeService = require('../services/employee.service');
const Attendance      = require('../../models/Attendance');
const DailyAttendance = require('../../models/DailyAttendance');
const { createEmployeeSchema, updateEmployeeSchema } = require('../schemas/department.schema');
const { protect } = require('../../hooks/auth.hook');
const { success, error } = require('../../utils/response');
const { logAction } = require('../../utils/audit.util');

const MANAGER_ROLES = [
  'HR_MANAGER', 'MARKETING_MANAGER', 'SALES_MANAGER',
  'COMMERCIAL_MANAGER', 'FINANCE_MANAGER', 'STOCK_MANAGER',
  'PURCHASE_MANAGER', 'DEPOT_MANAGER', 'WAREHOUSE_OPERATOR',
];

function isManager(role) {
  return MANAGER_ROLES.includes(role);
}

// Returns true if the target employee is a manager-level account
// (i.e. has a login account — accountStatus is not "none")
async function isManagerAccount(id) {
  const User = require('../../models/User');
  const user = await User.findById(id).select('role accountStatus');
  if (!user) return false;
  // Employees have accountStatus "none" and role "EMPLOYEE"
  return user.role !== 'EMPLOYEE' && user.accountStatus !== 'none';
}

module.exports = function deptRoutes(department) {
  return async function (fastify, opts) {

    fastify.get('/stats', { preHandler: [protect] }, async (req, reply) => {
      try {
        return success(reply, await employeeService.getStats(department));
      } catch (err) { return error(reply, err.message); }
    });

    fastify.get('/employees', { preHandler: [protect] }, async (req, reply) => {
      try {
        return success(reply, await employeeService.getAllEmployees(department));
      } catch (err) { return error(reply, err.message); }
    });


    // ADMIN: get all pending manager accounts across ALL departments
    fastify.get('/pending-managers', { preHandler: [protect] }, async (req, reply) => {
      try {
        const User = require('../../models/User');
        const pending = await User.find({
          accountStatus: 'pending',
          role: { $nin: ['EMPLOYEE', 'ADMIN'] },
        }).select('name email role department position createdAt accountStatus').sort({ createdAt: -1 });
        return success(reply, pending);
      } catch (err) { return error(reply, err.message); }
    });

    // HR Manager only — returns employees across ALL departments
    fastify.get('/all-employees', { preHandler: [protect] }, async (req, reply) => {
      try {
        return success(reply, await employeeService.getAllEmployees(null));
      } catch (err) { return error(reply, err.message); }
    });

    fastify.post('/employees', { preHandler: [protect] }, async (req, reply) => {
      try {
        const { error: valErr, value } = createEmployeeSchema.validate(req.body);
        if (valErr) return error(reply, valErr.details[0].message, 400);
        const targetDept = value.department || department;
        const data = await employeeService.createEmployee(targetDept, value, req.user.role);
        if (isManager(req.user.role)) {
          await logAction(req.user, 'CREATE_EMPLOYEE', data.name, { department: targetDept });
        }
        return success(reply, data, 201);
      } catch (err) { return error(reply, err.message); }
    });

    fastify.put('/employees/:id', { preHandler: [protect] }, async (req, reply) => {
      try {
        // ── GUARD: only ADMIN can edit manager-level accounts ──────────────
        const targetIsManager = await isManagerAccount(req.params.id);
        if (targetIsManager && req.user.role !== 'ADMIN') {
          return error(reply, 'Only an Administrator can edit manager accounts', 403);
        }

        const { error: valErr, value } = updateEmployeeSchema.validate(req.body);
        if (valErr) return error(reply, valErr.details[0].message, 400);
        const data = await employeeService.updateEmployee(req.params.id, value);
        if (!data) return error(reply, 'Employee not found', 404);
        if (isManager(req.user.role)) {
          await logAction(req.user, 'UPDATE_EMPLOYEE', data.name, { department });
        }
        return success(reply, data);
      } catch (err) { return error(reply, err.message); }
    });

    fastify.delete('/employees/:id', { preHandler: [protect] }, async (req, reply) => {
      try {
        // ── GUARD: only ADMIN can delete manager-level accounts ─────────────
        const targetIsManager = await isManagerAccount(req.params.id);
        if (targetIsManager && req.user.role !== 'ADMIN') {
          return error(reply, 'Only an Administrator can delete manager accounts', 403);
        }

        const employee = await employeeService.getEmployeeById(req.params.id);
        await Promise.all([
          Attendance.deleteMany({ employeeId: req.params.id }),
          DailyAttendance.deleteMany({ employeeId: req.params.id }),
        ]);
        await employeeService.deleteEmployee(req.params.id);
        if (isManager(req.user.role)) {
          await logAction(req.user, 'DELETE_EMPLOYEE', employee?.name || req.params.id, { department });
        }
        return success(reply, { message: 'Employee deleted' });
      } catch (err) { return error(reply, err.message); }
    });

    // Admin approves a pending manager account → generates login credentials
    fastify.post('/employees/:id/approve', { preHandler: [protect] }, async (req, reply) => {
      try {
        const emp = await employeeService.getEmployeeById(req.params.id);
        if (!emp) return error(reply, 'Employee not found', 404);
        if (emp.accountStatus === 'approved')
          return error(reply, 'Account already approved', 400);

        const bcrypt   = require('bcryptjs');
        const User     = require('../../models/User');
        const rawPass  = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
        const hashed   = await bcrypt.hash(rawPass, 10);

        const updated = await User.findByIdAndUpdate(
          req.params.id,
          { password: hashed, accountStatus: 'approved' },
          { new: true }
        ).select('-password');

        if (!updated) return error(reply, 'User record not found', 404);

        await logAction(req.user, 'APPROVE_ACCOUNT', emp.name, { department });

        // Create notification for the HR Manager who created this account
        try {
          const SystemNotification = require('../../models/SystemNotification');
          await SystemNotification.create({
            recipientRole: 'HR_MANAGER',
            type:          'ACCOUNT_APPROVED',
            message:       `Manager account for ${emp.name} has been approved`,
            targetId:      req.params.id,
            targetName:    emp.name,
            actorName:     req.user.name || 'Admin',
          });
        } catch (_) {} // non-blocking

        return success(reply, {
          email:         updated.email,
          plainPassword: rawPass,
          employee:      updated,
        });
      } catch (err) { return error(reply, err.message); }
    });

    // Admin rejects/deletes a pending manager account
    fastify.delete('/employees/:id/reject', { preHandler: [protect] }, async (req, reply) => {
      try {
        const emp = await employeeService.getEmployeeById(req.params.id);
        if (!emp) return error(reply, 'Employee not found', 404);
        await employeeService.deleteEmployee(req.params.id);
        await logAction(req.user, 'REJECT_ACCOUNT', emp.name, { department });
        // Create notification for HR Manager
        try {
          const SystemNotification = require('../../models/SystemNotification');
          await SystemNotification.create({
            recipientRole: 'HR_MANAGER',
            type:          'ACCOUNT_REJECTED',
            message:       `Manager account for ${emp.name} has been declined`,
            targetId:      req.params.id,
            targetName:    emp.name,
            actorName:     req.user.name || 'Admin',
          });
        } catch (_) {} // non-blocking

        return success(reply, { message: 'Account rejected and removed' });
      } catch (err) { return error(reply, err.message); }
    });

    // Silent status update — no audit log
    fastify.patch('/employees/:id/status', { preHandler: [protect] }, async (req, reply) => {
      try {
        const { status } = req.body;
        if (!['Active', 'On Leave', 'Inactive'].includes(status))
          return error(reply, 'Invalid status', 400);
        const data = await employeeService.updateEmployee(req.params.id, { status });
        if (!data) return error(reply, 'Employee not found', 404);
        return success(reply, data);
      } catch (err) { return error(reply, err.message); }
    });

  };
};