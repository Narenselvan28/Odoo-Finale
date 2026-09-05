const ApprovalRequest = require("../models/ApprovalRequest.model");
const ApprovalAuditLog = require("../models/ApprovalAuditLog.model");
const Quotation = require("../models/Quotation.model");

// GET /api/approvals
const getAll = async (req, res) => {
  try {
    const approvals = await ApprovalRequest.findAll({
      include: [{ model: Quotation, as: "Quotation" }],
      order: [["created_at", "DESC"]],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/approvals/:id
const getOne = async (req, res) => {
  try {
    const approval = await ApprovalRequest.findByPk(req.params.id, {
      include: [{ model: Quotation, as: "Quotation" }],
    });
    if (!approval) return res.status(404).json({ message: "Approval not found" });
    res.json(approval);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/approvals — create approval request for a quotation
const create = async (req, res) => {
  try {
    const approval = await ApprovalRequest.create(req.body);

    // Move quotation to PENDING_APPROVAL
    await Quotation.update(
      { status: "PENDING_APPROVAL" },
      { where: { id: req.body.quotation_id } }
    );

    res.status(201).json(approval);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/approvals/:id/action — approve / reject / return
const action = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const approval = await ApprovalRequest.findByPk(req.params.id);
    if (!approval) return res.status(404).json({ message: "Approval not found" });

    const oldStatus = approval.status;
    await approval.update({ status, reason, acted_by: req.user.id, acted_at: new Date() });

    // Update quotation status accordingly
    const quotationStatusMap = {
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      RETURNED: "UNDER_NEGOTIATION",
    };
    if (quotationStatusMap[status]) {
      await Quotation.update(
        { status: quotationStatusMap[status] },
        { where: { id: approval.quotation_id } }
      );
    }

    // Write audit log
    await ApprovalAuditLog.create({
      quotation_id: approval.quotation_id,
      user_id: req.user.id,
      action: status,
      old_status: oldStatus,
      new_status: status,
      reason,
    });

    res.json({ message: `Approval ${status.toLowerCase()}`, approval });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/approvals/quotation/:quotationId — all approvals for a quotation
const getByQuotation = async (req, res) => {
  try {
    const approvals = await ApprovalRequest.findAll({
      where: { quotation_id: req.params.quotationId },
      order: [["created_at", "DESC"]],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, action, getByQuotation };
