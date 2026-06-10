const db = require('../config/database');
const PDFDocument = require('pdfkit');
const emailService = require('../services/emailService');

// Generate invoice number
const generateInvoiceNumber = (projectId, month, year) => {
  const paddedMonth = String(month).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  return `INV-${projectId}-${year}${paddedMonth}-${timestamp}`;
};

const normalizeRoleName = (value) => String(value || '').trim().toLowerCase();

const isProgramOrProjectManagerRole = (value) => {
  const role = normalizeRoleName(value);
  return role === 'program manager' || role === 'project manager';
};

// Get employees for invoice generation
const getEmployeesForInvoice = async (req, res) => {
  try {
    const { projectId, teamId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Get project details
    const [projects] = await db.query(
      'SELECT id, project_team_name FROM projects WHERE id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    let employees = [];

    if (teamId) {
      // Get employees for specific team including team leads
      const [team] = await db.query(
        `SELECT pt.*, p.project_team_name,
                otl.id as offshore_tl_id, otl.name as offshore_tl_name,
                otl.role as offshore_tl_role, otl.role_type as offshore_tl_role_type,
                otl.work_location as offshore_tl_work_location,
                ostl.id as onsite_tl_id, ostl.name as onsite_tl_name,
                ostl.role as onsite_tl_role, ostl.role_type as onsite_tl_role_type,
                ostl.work_location as onsite_tl_work_location
         FROM project_teams pt
         JOIN projects p ON pt.project_id = p.id
         LEFT JOIN employees otl ON pt.offshore_team_lead_id = otl.id AND otl.status = 'Active'
         LEFT JOIN employees ostl ON pt.onsite_team_lead_id = ostl.id AND ostl.status = 'Active'
         WHERE pt.id = ? AND pt.project_id = ?`,
        [teamId, projectId]
      );

      if (team.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      // Get team employees, excluding managers
      const [teamEmployees] = await db.query(
        `SELECT DISTINCT e.id, e.name, e.sso, e.role, e.role_type, e.work_location, pt.agile_board_name as team_name
         FROM project_employees pe
         JOIN employees e ON pe.employee_id = e.id
         LEFT JOIN project_teams pt ON pe.team_id = pt.id
         WHERE pe.team_id = ?
         AND e.status = 'Active'
         AND e.id NOT IN (
           SELECT offshore_manager_id FROM projects WHERE id = ? AND offshore_manager_id IS NOT NULL
           UNION
           SELECT onsite_manager_id FROM projects WHERE id = ? AND onsite_manager_id IS NOT NULL
         )
         ORDER BY e.name`,
        [teamId, projectId, projectId]
      );

      employees = [...teamEmployees];

      // Add team leads if not already in list
      if (team[0].offshore_tl_id && !employees.some(emp => emp.id === team[0].offshore_tl_id)) {
        employees.push({
          id: team[0].offshore_tl_id,
          name: team[0].offshore_tl_name,
          sso: null,
          role: team[0].offshore_tl_role,
          role_type: team[0].offshore_tl_role_type,
          work_location: team[0].offshore_tl_work_location,
          team_name: team[0].agile_board_name
        });
      }

      if (team[0].onsite_tl_id && !employees.some(emp => emp.id === team[0].onsite_tl_id)) {
        employees.push({
          id: team[0].onsite_tl_id,
          name: team[0].onsite_tl_name,
          sso: null,
          role: team[0].onsite_tl_role,
          role_type: team[0].onsite_tl_role_type,
          work_location: team[0].onsite_tl_work_location,
          team_name: team[0].agile_board_name
        });
      }
    } else {
      // Get all employees for project including managers and team leads
      const [project] = await db.query(
        `SELECT p.*,
                om.id as offshore_mgr_id, om.name as offshore_mgr_name,
                om.role as offshore_mgr_role, om.role_type as offshore_mgr_role_type,
                osm.id as onsite_mgr_id, osm.name as onsite_mgr_name,
                osm.role as onsite_mgr_role, osm.role_type as onsite_mgr_role_type
         FROM projects p
         LEFT JOIN employees om ON p.offshore_manager_id = om.id AND om.status = 'Active'
         LEFT JOIN employees osm ON p.onsite_manager_id = osm.id AND osm.status = 'Active'
         WHERE p.id = ?`,
        [projectId]
      );

      // Get all employees assigned to the project, excluding managers
      const [projectEmployees] = await db.query(
        `SELECT DISTINCT e.id, e.name, e.sso, e.role, e.role_type, e.work_location, pt.agile_board_name as team_name
         FROM project_employees pe
         JOIN employees e ON pe.employee_id = e.id
         LEFT JOIN project_teams pt ON pe.team_id = pt.id
         WHERE pe.project_id = ?
         AND e.status = 'Active'
         AND e.id NOT IN (
           SELECT offshore_manager_id FROM projects WHERE id = ? AND offshore_manager_id IS NOT NULL
           UNION
           SELECT onsite_manager_id FROM projects WHERE id = ? AND onsite_manager_id IS NOT NULL
         )
         ORDER BY e.name`,
        [projectId, projectId, projectId]
      );

      employees = [...projectEmployees];

      // Managers are excluded from the employee list and will be handled separately
      // They are returned in the managers object in the response

      // Get all team leads for the project
      const [teamLeads] = await db.query(
        `SELECT DISTINCT
                otl.id as id, otl.name as name, otl.role as role, otl.role_type as role_type, otl.work_location as work_location, pt.agile_board_name as team_name
         FROM project_teams pt
         LEFT JOIN employees otl ON pt.offshore_team_lead_id = otl.id
         WHERE pt.project_id = ? AND otl.id IS NOT NULL AND otl.status = 'Active'
         UNION
         SELECT DISTINCT
                ostl.id as id, ostl.name as name, ostl.role as role, ostl.role_type as role_type, ostl.work_location as work_location, pt.agile_board_name as team_name
         FROM project_teams pt
         LEFT JOIN employees ostl ON pt.onsite_team_lead_id = ostl.id
         WHERE pt.project_id = ? AND ostl.id IS NOT NULL AND ostl.status = 'Active'`,
        [projectId, projectId]
      );

      // Add team leads if not already in list
      teamLeads.forEach(tl => {
        if (!employees.some(emp => emp.id === tl.id)) {
          employees.push({
            id: tl.id,
            name: tl.name,
            sso: null,
            role: tl.role,
            role_type: tl.role_type,
            work_location: tl.work_location,
            team_name: tl.team_name
          });
        }
      });
    }

    // Sort employees by name
    employees.sort((a, b) => a.name.localeCompare(b.name));

    // Get project managers with full details
    const [projectManagers] = await db.query(
      `SELECT p.id,
              om.id as offshore_manager_id, om.name as offshore_manager_name,
              om.role as offshore_manager_role, om.role_type as offshore_manager_role_type,
              osm.id as onsite_manager_id, osm.name as onsite_manager_name,
              osm.role as onsite_manager_role, osm.role_type as onsite_manager_role_type
       FROM projects p
       LEFT JOIN employees om ON p.offshore_manager_id = om.id AND om.status = 'Active'
       LEFT JOIN employees osm ON p.onsite_manager_id = osm.id AND osm.status = 'Active'
       WHERE p.id = ?`,
      [projectId]
    );

    const managersData = projectManagers[0] || {};

    // Build managers array with full details
    const managersArray = [];
    if (managersData.offshore_manager_id) {
      managersArray.push({
        id: managersData.offshore_manager_id,
        name: managersData.offshore_manager_name,
        role: managersData.offshore_manager_role,
        role_type: managersData.offshore_manager_role_type,
        manager_type: 'offshore'
      });
    }
    if (managersData.onsite_manager_id) {
      managersArray.push({
        id: managersData.onsite_manager_id,
        name: managersData.onsite_manager_name,
        role: managersData.onsite_manager_role,
        role_type: managersData.onsite_manager_role_type,
        manager_type: 'onsite'
      });
    }

    res.json({
      success: true,
      data: employees,
      managers: {
        offshore_manager: managersData.offshore_manager_name || 'N/A',
        onsite_manager: managersData.onsite_manager_name || 'N/A'
      },
      managerDetails: managersArray
    });
  } catch (error) {
    console.error('Error fetching employees for invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Check if invoice already exists
const checkInvoiceExists = async (req, res) => {
  try {
    const { project_id, team_id, invoice_month, invoice_year } = req.query;

    // Validation
    if (!project_id || !invoice_month || !invoice_year) {
      return res.status(400).json({
        success: false,
        message: 'Project, month, and year are required'
      });
    }

    // Check for existing invoice
    const [existingInvoice] = await db.query(
      `SELECT id, invoice_number FROM invoices
       WHERE project_id = ? AND invoice_month = ? AND invoice_year = ?
       AND (team_id = ? OR (team_id IS NULL AND ? IS NULL))`,
      [project_id, invoice_month, invoice_year, team_id || null, team_id || null]
    );

    if (existingInvoice.length > 0) {
      return res.json({
        success: true,
        exists: true,
        data: existingInvoice[0]
      });
    }

    res.json({
      success: true,
      exists: false
    });
  } catch (error) {
    console.error('Error checking invoice existence:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking invoice',
      error: error.message
    });
  }
};

// Create invoice
const createInvoice = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      project_id,
      team_id,
      invoice_month,
      invoice_year,
      employees, // Array of {employee_id, employee_name, employee_role, role_type, billing_hours, leave_hours, cost_per_hour}
      notes,
      offshore_manager,
      onsite_manager
    } = req.body;

    // Validation
    if (!invoice_month || !invoice_year) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one employee is required'
      });
    }

    const invalidEmployee = employees.find(emp => {
      if (isProgramOrProjectManagerRole(emp.employee_role || emp.role)) {
        return false;
      }

      const billingHours = parseFloat(emp.billing_hours);
      const leaveHours = parseFloat(emp.leave_hours);
      const costPerHour = parseFloat(emp.cost_per_hour);

      if (Number.isNaN(billingHours) || billingHours < 0) return true;
      if (Number.isNaN(leaveHours) || leaveHours < 0) return true;
      if (leaveHours > billingHours) return true;
      if (Number.isNaN(costPerHour) || costPerHour <= 0) return true;

      return false;
    });

    if (invalidEmployee) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid billing data for ${invalidEmployee.employee_name || 'an employee'}`
      });
    }

    // Check for duplicate invoice
    let duplicateCheckQuery;
    let duplicateCheckParams;

    if (project_id) {
      duplicateCheckQuery = `SELECT id FROM invoices
         WHERE project_id = ? AND invoice_month = ? AND invoice_year = ?
         AND (team_id = ? OR (team_id IS NULL AND ? IS NULL))`;
      duplicateCheckParams = [project_id, invoice_month, invoice_year, team_id, team_id];
    } else {
      // When no project_id, check for duplicate across all projects for the same period
      duplicateCheckQuery = `SELECT id FROM invoices
         WHERE project_id IS NULL AND invoice_month = ? AND invoice_year = ?`;
      duplicateCheckParams = [invoice_month, invoice_year];
    }

    const [existingInvoice] = await connection.query(duplicateCheckQuery, duplicateCheckParams);

    if (existingInvoice.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this project/team and period'
      });
    }

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(project_id || 'ALL', invoice_month, invoice_year);

    // Calculate totals
    let totalBillingHours = 0;
    let totalLeaveHours = 0;
    let totalAmount = 0;

    employees.forEach(emp => {
      const billingHours = parseFloat(emp.billing_hours) || 0;
      const leaveHours = parseFloat(emp.leave_hours) || 0;
      const balanceHours = billingHours - leaveHours;
      const costPerHour = parseFloat(emp.cost_per_hour) || 0;
      let itemTotal = balanceHours * costPerHour;

      // Add 0.11% bonus for Offshore Managers
      if (emp.manager_type === 'Offshore') {
        itemTotal = itemTotal * 1.0011;
      }

      totalBillingHours += billingHours;
      totalLeaveHours += leaveHours;
      totalAmount += itemTotal;
    });

    // Create invoice
    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices
       (invoice_number, project_id, team_id, invoice_month, invoice_year,
        total_billing_hours, total_leave_hours, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        project_id || null,
        team_id || null,
        invoice_month,
        invoice_year,
        totalBillingHours,
        totalLeaveHours,
        totalAmount,
        notes || null,
        req.admin?.id || null
      ]
    );

    const invoiceId = invoiceResult.insertId;

    // Create invoice items
    for (const emp of employees) {
      const billingHours = parseFloat(emp.billing_hours) || 0;
      const leaveHours = parseFloat(emp.leave_hours) || 0;
      const balanceHours = billingHours - leaveHours;
      const costPerHour = parseFloat(emp.cost_per_hour) || 0;
      let itemTotal = balanceHours * costPerHour;

      // Add 0.11% bonus for Offshore Managers
      if (emp.manager_type === 'Offshore') {
        itemTotal = itemTotal * 1.0011;
      }

      await connection.query(
        `INSERT INTO invoice_items
         (invoice_id, employee_id, employee_name, employee_role, role_type, work_location,
          billing_hours, leave_hours, cost_per_hour, total_amount, notes, manager_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          emp.employee_id,
          emp.employee_name,
          emp.employee_role || null,
          emp.role_type || null,
          emp.work_location || null,
          billingHours,
          leaveHours,
          costPerHour,
          itemTotal,
          emp.notes || null,
          emp.manager_type || null
        ]
      );
    }

    // Log the action if admin is authenticated
    if (req.admin) {
      await connection.query(
        'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.admin.id,
          'CREATE',
          'invoices',
          invoiceId,
          `Created invoice ${invoiceNumber}`,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating invoice:', error);

    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get all invoices with pagination and filters
const getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const projectId = req.query.projectId;
    const teamId = req.query.teamId;
    const month = req.query.month;
    const year = req.query.year;

    let countQuery = 'SELECT COUNT(*) as total FROM invoices i';
    let dataQuery = `
      SELECT i.*,
             p.project_team_name,
             pt.agile_board_name as team_name,
             COALESCE(e_offshore.name, 'N/A') as offshore_manager,
             COALESCE(e_onsite.name, 'N/A') as onsite_manager
      FROM invoices i
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN project_teams pt ON i.team_id = pt.id
      LEFT JOIN employees e_offshore ON p.offshore_manager_id = e_offshore.id
      LEFT JOIN employees e_onsite ON p.onsite_manager_id = e_onsite.id
    `;

    const queryParams = [];
    const countParams = [];
    const conditions = [];

    if (status && status !== 'All') {
      conditions.push('i.status = ?');
      queryParams.push(status);
      countParams.push(status);
    }

    if (projectId) {
      conditions.push('i.project_id = ?');
      queryParams.push(projectId);
      countParams.push(projectId);
    }

    if (teamId) {
      conditions.push('i.team_id = ?');
      queryParams.push(teamId);
      countParams.push(teamId);
    }

    if (month) {
      conditions.push('i.invoice_month = ?');
      queryParams.push(month);
      countParams.push(month);
    }

    if (year) {
      conditions.push('i.invoice_year = ?');
      queryParams.push(year);
      countParams.push(year);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      countQuery += whereClause;
      dataQuery += whereClause;
    }

    // Get total count
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    // Add ordering and pagination
    dataQuery += ' ORDER BY i.invoice_year DESC, i.invoice_month DESC, i.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Get invoices
    const [invoices] = await db.query(dataQuery, queryParams);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// Get invoice by ID with items
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice
    const [invoices] = await db.query(
      `SELECT i.*,
              p.project_team_name,
              pt.agile_board_name as team_name,
              COALESCE(e_offshore.name, 'N/A') as offshore_manager,
              COALESCE(e_onsite.name, 'N/A') as onsite_manager
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN project_teams pt ON i.team_id = pt.id
       LEFT JOIN employees e_offshore ON p.offshore_manager_id = e_offshore.id
       LEFT JOIN employees e_onsite ON p.onsite_manager_id = e_onsite.id
       WHERE i.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get invoice items
    const [items] = await db.query(
      `SELECT ii.*,
              COALESCE(ii.work_location, e.work_location) as work_location
       FROM invoice_items ii
       LEFT JOIN employees e ON ii.employee_id = e.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.employee_name`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...invoices[0],
        items
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { status, items } = req.body;

    await connection.beginTransaction();

    // Check if invoice exists
    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Update invoice status if provided
    if (status) {
      await connection.query(
        'UPDATE invoices SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
    }

    // Update invoice items if provided
    if (items && Array.isArray(items)) {
      // Recalculate totals
      let totalBillingHours = 0;
      let totalLeaveHours = 0;
      let totalAmount = 0;

      for (const item of items) {
        const billingHours = parseFloat(item.billing_hours) || 0;
        const leaveHours = parseFloat(item.leave_hours) || 0;
        const balanceHours = billingHours - leaveHours;
        const costPerHour = parseFloat(item.cost_per_hour) || 0;
        let itemTotal = balanceHours * costPerHour;

        // Add 0.11% bonus for Offshore Managers
        if (item.manager_type === 'Offshore') {
          itemTotal = itemTotal * 1.0011;
        }

        totalBillingHours += billingHours;
        totalLeaveHours += leaveHours;
        totalAmount += itemTotal;

        // Update individual item
        await connection.query(
          `UPDATE invoice_items
           SET billing_hours = ?, leave_hours = ?, cost_per_hour = ?, total_amount = ?
           WHERE invoice_id = ? AND employee_id = ?`,
          [billingHours, leaveHours, costPerHour, itemTotal, id, item.employee_id]
        );
      }

      // Update invoice totals
      await connection.query(
        `UPDATE invoices
         SET total_billing_hours = ?, total_leave_hours = ?, total_amount = ?, updated_at = NOW()
         WHERE id = ?`,
        [totalBillingHours, totalLeaveHours, totalAmount, id]
      );
    }

    if (req.admin) {
      const updatedFields = [];
      if (status) updatedFields.push(`status=${status}`);
      if (items && Array.isArray(items)) updatedFields.push(`items=${items.length}`);

      await connection.query(
        'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.admin.id,
          'UPDATE',
          'invoices',
          id,
          `Updated invoice ${invoices[0].invoice_number}${updatedFields.length ? ` (${updatedFields.join(', ')})` : ''}`,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        ]
      );
    }

    await connection.commit();

    // Fetch updated invoice
    const [updatedInvoices] = await connection.query(
      `SELECT i.*,
              p.project_team_name,
              pt.agile_board_name as team_name
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN project_teams pt ON i.team_id = pt.id
       WHERE i.id = ?`,
      [id]
    );

    const [updatedItems] = await connection.query(
      `SELECT ii.*,
              COALESCE(ii.work_location, e.work_location) as work_location
       FROM invoice_items ii
       LEFT JOIN employees e ON ii.employee_id = e.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.employee_name`,
      [id]
    );

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: {
        ...updatedInvoices[0],
        items: updatedItems
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // Check if invoice exists
    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Delete invoice items first (due to foreign key constraint)
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

    // Delete invoice
    await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

    if (req.admin) {
      await connection.query(
        'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.admin.id,
          'DELETE',
          'invoices',
          id,
          `Deleted invoice ${invoices[0].invoice_number}`,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Generate PDF for invoice
const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice with items
    const [invoices] = await db.query(
      `SELECT i.*,
              p.project_team_name,
              pt.agile_board_name as team_name,
              COALESCE(e_offshore.name, 'N/A') as offshore_manager,
              COALESCE(e_onsite.name, 'N/A') as onsite_manager
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN project_teams pt ON i.team_id = pt.id
       LEFT JOIN employees e_offshore ON p.offshore_manager_id = e_offshore.id
       LEFT JOIN employees e_onsite ON p.onsite_manager_id = e_onsite.id
       WHERE i.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [items] = await db.query(
      `SELECT ii.*,
              COALESCE(ii.work_location, e.work_location) as work_location
       FROM invoice_items ii
       LEFT JOIN employees e ON ii.employee_id = e.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.employee_name`,
      [id]
    );

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    let isClosed = false;

    const handleStreamClosed = () => {
      isClosed = true;
      if (!doc.destroyed) {
        doc.destroy();
      }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);
    req.once('aborted', handleStreamClosed);
    res.once('close', handleStreamClosed);
    doc.once('end', () => {
      req.off('aborted', handleStreamClosed);
      res.off('close', handleStreamClosed);
    });

    // Helper function to format currency
    const formatCurrency = (amount) => currencyFormatter.format(amount);

    // Helper function to get month name
    const getMonthName = (month) => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return months[month - 1] || '';
    };

    const tableLeft = 25;
    const tableWidth = 545;
    const tableRight = tableLeft + tableWidth;
    const headerHeight = 34;
    const pageBottom = 740;
    const rowPaddingTop = 6;
    const rowPaddingBottom = 6;

    const tableHeaders = [
      { label: 'Employee', width: 150, align: 'left' },
      { label: 'Type / Location', width: 145, align: 'left' },
      { label: 'Bill\nHrs', width: 40, align: 'center' },
      { label: 'Leave\nHrs', width: 50, align: 'center' },
      { label: 'Bal\nHrs', width: 40, align: 'center' },
      { label: 'Cost/Hr', width: 55, align: 'center' },
      { label: 'Total', width: 65, align: 'center' }
    ];

    const getRoleTypeColor = (item) => {
      const roleType = String(item.role_type || '').toLowerCase();
      const workLocation = String(item.work_location || '').toLowerCase();

      if (roleType.includes('onsite') || workLocation.includes('onsite')) {
        return '#0066ff';
      }

      if (roleType.includes('offshore') || workLocation.includes('offshore')) {
        return '#ff8a00';
      }

      return '#333333';
    };

    const getTypeLocationLabel = (item) => {
      const roleType = item.role_type || 'N/A';
      const workLocation = item.work_location || 'N/A';
      return `${roleType} - ${workLocation}`;
    };

    const isManagerItem = (item) => {
      const role = String(item.employee_role || '').toLowerCase();
      const roleType = String(item.role_type || '').toLowerCase();
      return role.includes('manager') || roleType.includes('manager');
    };

    const drawHeader = (yPosition) => {
      doc.save();
      doc.lineWidth(0.8).strokeColor('#cbd5e1');
      doc.rect(tableLeft, yPosition, tableWidth, headerHeight).fillAndStroke('#ffffff', '#cbd5e1');

      let x = tableLeft;
      doc.font('Helvetica-Bold').fontSize(8.8).fillColor('#1f2937');

      tableHeaders.forEach((header, index) => {
        doc.text(header.label, x + 8, yPosition + 8, {
          width: header.width - 16,
          align: header.align,
          lineBreak: true
        });

        if (index < tableHeaders.length - 1) {
          x += header.width;
          doc.moveTo(x, yPosition).lineTo(x, yPosition + headerHeight).strokeColor('#cbd5e1').stroke();
        }
      });

      doc.restore();
    };

    const measureRow = (item) => {
      const billingHours = parseFloat(item.billing_hours) || 0;
      const leaveHours = parseFloat(item.leave_hours) || 0;
      const balanceHours = billingHours - leaveHours;
      let itemTotal = balanceHours * (parseFloat(item.cost_per_hour) || 0);

      if (item.manager_type === 'Offshore') {
        itemTotal = itemTotal * 1.0011;
      }

      const cells = [
        { value: item.employee_name || 'N/A', width: tableHeaders[0].width, align: 'left', color: '#333333', bold: false },
        { value: getTypeLocationLabel(item), width: tableHeaders[1].width, align: 'left', color: getRoleTypeColor(item), bold: true },
        { value: billingHours.toFixed(1), width: tableHeaders[2].width, align: 'right', color: '#333333', bold: false },
        { value: leaveHours.toFixed(1), width: tableHeaders[3].width, align: 'right', color: '#333333', bold: false },
        { value: balanceHours.toFixed(1), width: tableHeaders[4].width, align: 'right', color: '#333333', bold: false },
        { value: formatCurrency(parseFloat(item.cost_per_hour) || 0), width: tableHeaders[5].width, align: 'right', color: '#333333', bold: false },
        { value: formatCurrency(itemTotal), width: tableHeaders[6].width, align: 'right', color: '#333333', bold: false }
      ];

      const rowHeight = Math.max(
        24,
        ...cells.map(cell => doc.heightOfString(String(cell.value), {
          width: cell.width - 16,
          align: cell.align
        }) + rowPaddingTop + rowPaddingBottom)
      );

      return {
        cells,
        itemTotal,
        rowHeight
      };
    };

    const drawRow = (row, yPosition, index) => {
      recalculatedGrandTotal += row.itemTotal;

      const rowColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.save();
      doc.lineWidth(0.6).strokeColor('#d1d5db');
      doc.rect(tableLeft, yPosition, tableWidth, row.rowHeight).fillAndStroke(rowColor, '#d1d5db');

      let x = tableLeft;
      row.cells.forEach((cell, cellIndex) => {
        if (cellIndex > 0) {
          doc.moveTo(x, yPosition).lineTo(x, yPosition + row.rowHeight).strokeColor('#d1d5db').stroke();
        }

        doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.2).fillColor(cell.color);
        doc.text(String(cell.value), x + 8, yPosition + rowPaddingTop, {
          width: cell.width - 16,
          align: cell.align,
          lineBreak: true
        });
        x += cell.width;
      });

      doc.restore();
      return row.rowHeight;
    };

    const headerTitle = [
      invoice.project_team_name || 'Project',
      invoice.team_name || 'Team',
      `${getMonthName(invoice.invoice_month)} : ${invoice.invoice_year}`
    ].join(' - ');

    const drawPdfBanner = () => {
      const bannerTop = 36;
      const bannerLeft = 25;
      const titleWidth = tableWidth;
      let titleFontSize = 24;

      // Keep the banner more restrained and professional for long project/team names.
      if (headerTitle.length > 38) titleFontSize = 22;
      if (headerTitle.length > 52) titleFontSize = 20;
      if (headerTitle.length > 68) titleFontSize = 18;

      doc.font('Helvetica-Bold').fontSize(titleFontSize).fillColor('#2f343b');
      const titleHeight = doc.heightOfString(headerTitle, {
        width: titleWidth,
        align: 'left',
        lineBreak: true
      });
      doc.text(headerTitle, bannerLeft, bannerTop, {
        width: titleWidth,
        align: 'left',
        lineBreak: true
      });

      const subtitleY = bannerTop + titleHeight + 6;
      doc.font('Helvetica').fontSize(11).fillColor('#5b6572');
      doc.text('Invoice Document', bannerLeft, subtitleY, { width: 180, align: 'left' });

      const dividerY = subtitleY + 18;
      doc.moveTo(bannerLeft, dividerY).lineTo(tableRight, dividerY).lineWidth(1.5).strokeColor('#FFC500').stroke();

      return dividerY + 34;
    };

    const drawInvoiceMetadata = (startY) => {
      let yPosition = startY;

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Invoice Number:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(invoice.invoice_number, 215, yPosition);

      yPosition += 26;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Invoice Date:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(new Date(invoice.created_at).toLocaleDateString(), 215, yPosition);

      yPosition += 26;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Status:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(invoice.status, 215, yPosition);

      yPosition += 26;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Period:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(`${getMonthName(invoice.invoice_month)} ${invoice.invoice_year}`, 215, yPosition);

      yPosition += 26;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Project:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(invoice.project_team_name || 'N/A', 215, yPosition);

      yPosition += 26;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937');
      doc.text('Team:', 25, yPosition);
      doc.font('Helvetica').fillColor('#1f2937').text(invoice.team_name || 'N/A', 215, yPosition);

      yPosition += 24;
      drawHeader(yPosition);
      return yPosition + headerHeight;
    };

    const pdfItems = items.filter(item => !isManagerItem(item));
    const pdfRows = pdfItems.map(measureRow);
    const pdfTotalBillingHours = pdfItems.reduce((sum, item) => sum + (parseFloat(item.billing_hours) || 0), 0);
    const pdfTotalLeaveHours = pdfItems.reduce((sum, item) => sum + (parseFloat(item.leave_hours) || 0), 0);

    let yPosition = drawInvoiceMetadata(drawPdfBanner());

    let recalculatedGrandTotal = 0;

    pdfRows.forEach((row, index) => {
      if (isClosed) {
        return;
      }

      if (yPosition + row.rowHeight > pageBottom) {
        doc.addPage();
        yPosition = drawInvoiceMetadata(drawPdfBanner());
      }

      yPosition += drawRow(row, yPosition, index);
    });

    if (isClosed) {
      return;
    }

    yPosition += 14;

    const totalsHeight = 78;
    doc.save();
    doc.rect(tableLeft, yPosition, tableWidth, totalsHeight).fill('#333333');
    doc.restore();

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffc107');
    doc.text('Total Billing Hours:', tableLeft + 14, yPosition + 10, { width: 190, align: 'left' });
    doc.text(pdfTotalBillingHours.toFixed(1), tableRight - 104, yPosition + 10, { width: 90, align: 'right' });

    doc.text('Total Leave Hours:', tableLeft + 14, yPosition + 28, { width: 190, align: 'left' });
    doc.text(pdfTotalLeaveHours.toFixed(1), tableRight - 104, yPosition + 28, { width: 90, align: 'right' });

    doc.text('Total Balance Hours:', tableLeft + 14, yPosition + 46, { width: 190, align: 'left' });
    doc.text((pdfTotalBillingHours - pdfTotalLeaveHours).toFixed(1), tableRight - 104, yPosition + 46, { width: 90, align: 'right' });

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffc107');
    doc.text('TOTAL AMOUNT:', tableLeft + 14, yPosition + 61, { width: 170, align: 'left' });
    doc.text(formatCurrency(recalculatedGrandTotal), tableRight - 154, yPosition + 59, { width: 140, align: 'right' });

    const pageHeight = doc.page.height;
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica');
    doc.text('This is a computer-generated invoice. No signature required.', 25, pageHeight - 50, {
      align: 'center',
      width: tableWidth
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating invoice PDF:', error);

    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating invoice PDF',
        error: error.message
      });
    }
  }
};

// Get employees for invoice by Purchase Order
const getEmployeesByPo = async (req, res) => {
  try {
    const { poId } = req.query;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Order ID is required'
      });
    }

    // Get PO details
    const [pos] = await db.query(
      'SELECT id, po_number, po_owner_name, status FROM pos WHERE id = ?',
      [poId]
    );

    if (pos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found'
      });
    }

    // Get all projects associated with this PO
    const [projects] = await db.query(
      'SELECT id, project_team_name FROM projects WHERE po_id = ?',
      [poId]
    );

    if (projects.length === 0) {
      return res.json({
        success: true,
        data: [],
        projects: [],
        po: pos[0],
        message: 'No projects found for this Purchase Order'
      });
    }

    const projectIds = projects.map(p => p.id);

    // Get all employees from these projects, excluding managers
    const [employees] = await db.query(
      `SELECT DISTINCT e.id, e.name, e.sso, e.role, e.role_type, e.work_location,
              p.project_team_name, p.id as project_id,
              pt.agile_board_name as team_name
       FROM project_employees pe
       JOIN employees e ON pe.employee_id = e.id
       JOIN projects p ON pe.project_id = p.id
       LEFT JOIN project_teams pt ON pe.team_id = pt.id
       WHERE pe.project_id IN (?)
       AND e.status = 'Active'
       AND e.id NOT IN (
         SELECT offshore_manager_id FROM projects WHERE po_id = ? AND offshore_manager_id IS NOT NULL
         UNION
         SELECT onsite_manager_id FROM projects WHERE po_id = ? AND onsite_manager_id IS NOT NULL
       )
       ORDER BY p.project_team_name, e.name`,
      [projectIds, poId, poId]
    );

    // Get all team leads from projects associated with this PO
    const [teamLeads] = await db.query(
      `SELECT DISTINCT
              e.id, e.name, e.sso, e.role, e.role_type, e.work_location,
              p.project_team_name, p.id as project_id,
              pt.agile_board_name as team_name
       FROM project_teams pt
       JOIN projects p ON pt.project_id = p.id
       LEFT JOIN employees e ON (pt.offshore_team_lead_id = e.id OR pt.onsite_team_lead_id = e.id)
       WHERE p.po_id = ?
       AND e.id IS NOT NULL
       AND e.status = 'Active'
       AND e.id NOT IN (
         SELECT offshore_manager_id FROM projects WHERE po_id = ? AND offshore_manager_id IS NOT NULL
         UNION
         SELECT onsite_manager_id FROM projects WHERE po_id = ? AND onsite_manager_id IS NOT NULL
       )
       ORDER BY p.project_team_name, e.name`,
      [poId, poId, poId]
    );

    // Combine employees and team leads
    const allEmployees = [...employees];
    teamLeads.forEach(tl => {
      if (!allEmployees.some(emp => emp.id === tl.id && emp.project_id === tl.project_id)) {
        allEmployees.push(tl);
      }
    });

    // Get managers from projects associated with this PO
    const [managers] = await db.query(
      `SELECT DISTINCT
              e.id, e.name, e.role, e.role_type,
              p.project_team_name, p.id as project_id,
              CASE
                WHEN p.offshore_manager_id = e.id THEN 'offshore'
                WHEN p.onsite_manager_id = e.id THEN 'onsite'
              END as manager_type
       FROM projects p
       LEFT JOIN employees e ON (p.offshore_manager_id = e.id OR p.onsite_manager_id = e.id)
       WHERE p.po_id = ?
       AND e.id IS NOT NULL
       AND e.status = 'Active'
       ORDER BY p.project_team_name, e.name`,
      [poId]
    );

    res.json({
      success: true,
      data: allEmployees,
      managers: managers,
      projects: projects,
      po: pos[0]
    });
  } catch (error) {
    console.error('Error fetching employees by PO:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Send invoice via email
const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, subject, customMessage } = req.body;

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient email address is required'
      });
    }

    // Get invoice details
    const [invoices] = await db.query(
      `SELECT
        i.*,
        p.project_team_name as project_name,
        pt.agile_board_name as team_name,
        COALESCE(e_offshore.name, 'N/A') as offshore_manager_name,
        COALESCE(e_onsite.name, 'N/A') as onsite_manager_name
      FROM invoices i
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN project_teams pt ON i.team_id = pt.id
      LEFT JOIN employees e_offshore ON p.offshore_manager_id = e_offshore.id
      LEFT JOIN employees e_onsite ON p.onsite_manager_id = e_onsite.id
      WHERE i.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [items] = await db.query(
      `SELECT ii.*,
              COALESCE(ii.work_location, e.work_location) as work_location
       FROM invoice_items ii
       LEFT JOIN employees e ON ii.employee_id = e.id
       WHERE ii.invoice_id = ?
       ORDER BY ii.employee_name`,
      [id]
    );

    // Generate PDF in memory
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#333333').text('INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#666666').text('TeamPulse', { align: 'center' });
      doc.moveDown(2);

      // Invoice details
      doc.fontSize(10).fillColor('#000000');
      const leftX = 50;
      const rightX = 350;
      let currentY = doc.y;

      doc.text(`Invoice Number: ${invoice.invoice_number}`, leftX, currentY);
      doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, rightX, currentY);
      currentY += 20;

      doc.text(`Status: ${invoice.status}`, leftX, currentY);
      doc.text(`Period: ${invoice.invoice_month}/${invoice.invoice_year}`, rightX, currentY);
      currentY += 30;

      // Project and Team info
      doc.fontSize(12).fillColor('#333333').text('Project Details', leftX, currentY);
      currentY += 20;
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Project: ${invoice.project_name || 'N/A'}`, leftX, currentY);
      currentY += 15;
      doc.text(`Team: ${invoice.team_name || 'N/A'}`, leftX, currentY);
      currentY += 15;
      doc.text(`Offshore Manager: ${invoice.offshore_manager_name}`, leftX, currentY);
      currentY += 15;
      doc.text(`Onsite Manager: ${invoice.onsite_manager_name}`, leftX, currentY);
      currentY += 30;

      // Table
      doc.fontSize(12).fillColor('#333333').text('Invoice Items', leftX, currentY);
      currentY += 20;

      const tableTop = currentY;
      const tableHeaders = ['Employee', 'Role', 'Billing Hrs', 'Leave Hrs', 'Cost/Hr', 'Total'];
      const colWidths = [120, 80, 70, 60, 60, 70];
      const colX = [50, 170, 250, 320, 380, 440];

      // Table headers
      doc.fontSize(9).fillColor('#FFFFFF');
      doc.rect(50, tableTop - 5, 510, 20).fill('#4CAF50');
      tableHeaders.forEach((header, i) => {
        doc.text(header, colX[i], tableTop, { width: colWidths[i], align: i > 1 ? 'right' : 'left' });
      });

      currentY = tableTop + 20;

      // Table rows
      doc.fillColor('#000000');
      items.forEach((item, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const rowColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
        doc.rect(50, currentY - 5, 510, 20).fill(rowColor);

        doc.fillColor('#000000');
        doc.text(item.employee_name || 'N/A', colX[0], currentY, { width: colWidths[0] });
        doc.text(item.employee_role || 'N/A', colX[1], currentY, { width: colWidths[1] });
        doc.text(item.billing_hours?.toString() || '0', colX[2], currentY, { width: colWidths[2], align: 'right' });
        doc.text(item.leave_hours?.toString() || '0', colX[3], currentY, { width: colWidths[3], align: 'right' });
        doc.text(`$${parseFloat(item.cost_per_hour || 0).toFixed(2)}`, colX[4], currentY, { width: colWidths[4], align: 'right' });
        doc.text(`$${parseFloat(item.total_amount || 0).toFixed(2)}`, colX[5], currentY, { width: colWidths[5], align: 'right' });

        currentY += 20;
      });

      // Total
      currentY += 10;
      doc.fontSize(12).fillColor('#333333');
      doc.rect(50, currentY - 5, 510, 25).fill('#E8F5E9');
      doc.fillColor('#000000');
      doc.text('Total Amount:', 380, currentY, { width: 60, align: 'right' });
      doc.text(`$${parseFloat(invoice.total_amount || 0).toFixed(2)}`, 440, currentY, { width: 70, align: 'right' });

      // Footer
      currentY += 40;
      doc.fontSize(8).fillColor('#666666');
      doc.text('This is a computer generated invoice.', 50, currentY, { align: 'center' });

      doc.end();
    });

    // Prepare email details
    const emailSubject = subject || `Invoice ${invoice.invoice_number} - ${invoice.project_name}`;
    const additionalInfo = {
      projectName: invoice.project_name,
      teamName: invoice.team_name,
      invoiceMonth: invoice.invoice_month,
      invoiceYear: invoice.invoice_year,
      totalAmount: parseFloat(invoice.total_amount || 0).toFixed(2),
      status: invoice.status,
      customMessage: customMessage || ''
    };

    // Send email
    const result = await emailService.sendInvoiceEmail(
      recipients,
      emailSubject,
      pdfBuffer,
      invoice.invoice_number,
      additionalInfo
    );

    // Log the email activity in audit logs
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.admin?.id || null,
        'EMAIL_SENT',
        'invoices',
        id,
        `Invoice email sent to ${recipients.length} recipient(s). Subject: ${emailSubject}`,
        req.ip,
        req.get('user-agent') || 'Unknown'
      ]
    );

    res.json({
      success: true,
      message: `Invoice email sent successfully to ${recipients.length} recipient(s)`,
      data: {
        messageId: result.messageId,
        recipients: result.recipients,
        invoiceNumber: invoice.invoice_number
      }
    });

  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invoice email',
      error: error.message
    });
  }
};

module.exports = {
  getEmployeesForInvoice,
  getEmployeesByPo,
  checkInvoiceExists,
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  generateInvoicePDF,
  sendInvoiceEmail
};
