const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FLIGHTLINE_DIR = path.join(process.cwd(), '.flightline');
const WORK_ORDERS_DIR = path.join(FLIGHTLINE_DIR, 'work-orders');

// Ensure directories exist
if (!fs.existsSync(FLIGHTLINE_DIR)) {
  fs.mkdirSync(FLIGHTLINE_DIR, { recursive: true });
}
if (!fs.existsSync(WORK_ORDERS_DIR)) {
  fs.mkdirSync(WORK_ORDERS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// ============================================================================
// Helper Functions
// ============================================================================

function generateId() {
  return 'wo_' + crypto.randomUUID();
}

function checksumFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

function getWorkOrderPath(orderId) {
  return path.join(WORK_ORDERS_DIR, orderId, 'manifest.json');
}

// ============================================================================
// Routes: Work Orders
// ============================================================================

// GET /api/v1/work-orders - List all work orders
app.get('/api/v1/work-orders', (req, res) => {
  try {
    if (!fs.existsSync(WORK_ORDERS_DIR)) {
      return res.json({ work_orders: [] });
    }

    const directories = fs.readdirSync(WORK_ORDERS_DIR);
    const workOrders = [];

    for (const dirName of directories) {
      const manifestPath = path.join(WORK_ORDERS_DIR, dirName, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      workOrders.push(manifest);
    }

    res.json({ work_orders });
  } catch (error) {
    console.error('Error listing work orders:', error);
    res.status(500).json({ error: 'Failed to list work orders' });
  }
});

// POST /api/v1/work-orders - Create new work order
app.post('/api/v1/work-orders', (req, res) => {
  try {
    const { title, description, priority = 'medium', assigned_to = [] } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const orderId = generateId();
    const now = new Date().toISOString();

    const manifest = {
      id: orderId,
      title,
      description: description || '',
      status: 'pending',
      priority,
      created_at: now,
      updated_at: now,
      assigned_to: assigned_to,
      cells: [],
      tech_orders: [],
    };

    const orderDir = path.join(WORK_ORDERS_DIR, orderId);
    const manifestPath = path.join(orderDir, 'manifest.json');

    fs.mkdirSync(orderDir, { recursive: true });
    fs.mkdirSync(path.join(orderDir, 'cells'), { recursive: true });
    fs.mkdirSync(path.join(orderDir, 'events'), { recursive: true });
    fs.mkdirSync(path.join(orderDir, 'artifacts'), { recursive: true });

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Created work order: ${orderId} - ${title}`);

    res.status(201).json({ work_order: manifest });
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// GET /api/v1/work-orders/:id - Get specific work order
app.get('/api/v1/work-orders/:id', (req, res) => {
  try {
    const manifestPath = getWorkOrderPath(req.params.id);
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    res.json({ work_order: manifest });
  } catch (error) {
    console.error('Error getting work order:', error);
    res.status(500).json({ error: 'Failed to get work order' });
  }
});

// PATCH /api/v1/work-orders/:id - Update work order
app.patch('/api/v1/work-orders/:id', (req, res) => {
  try {
    const manifestPath = getWorkOrderPath(req.params.id);
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Update fields
    if (req.body.title) manifest.title = req.body.title;
    if (req.body.description !== undefined) manifest.description = req.body.description;
    if (req.body.status) manifest.status = req.body.status;
    if (req.body.priority) manifest.priority = req.body.priority;
    if (req.body.assigned_to) manifest.assigned_to = req.body.assigned_to;

    manifest.updated_at = new Date().toISOString();

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Updated work order: ${req.params.id}`);
    res.json({ work_order: manifest });
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /api/v1/work-orders/:id - Delete work order
app.delete('/api/v1/work-orders/:id', (req, res) => {
  try {
    const orderDir = path.join(WORK_ORDERS_DIR, req.params.id);
    if (!fs.existsSync(orderDir)) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Recursive delete
    fs.rmSync(orderDir, { recursive: true, force: true });

    console.log(`Deleted work order: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

// ============================================================================
// Routes: CTK (File Reservations)
// ============================================================================

const CTK_DIR = path.join(FLIGHTLINE_DIR, 'ctk');

if (!fs.existsSync(CTK_DIR)) {
  fs.mkdirSync(CTK_DIR, { recursive: true });
}

// GET /api/v1/ctk/reservations - List all reservations
app.get('/api/v1/ctk/reservations', (req, res) => {
  try {
    const files = fs.readdirSync(CTK_DIR);
    const reservations = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(CTK_DIR, file), 'utf-8');
        const reservation = JSON.parse(content);
        reservations.push(reservation);
      }
    }

    res.json({ reservations });
  } catch (error) {
    console.error('Error listing CTK reservations:', error);
    res.status(500).json({ error: 'Failed to list reservations' });
  }
});

// POST /api/v1/ctk/reserve - Reserve a file
app.post('/api/v1/ctk/reserve', (req, res) => {
  try {
    const { file, specialist_id, purpose = 'edit' } = req.body;

    if (!file || !specialist_id) {
      return res.status(400).json({ error: 'file and specialist_id are required' });
    }

    const reservation = {
      id: crypto.randomUUID(),
      file,
      reserved_by: specialist_id,
      reserved_at: new Date().toISOString(),
      released_at: null,
      purpose,
      checksum: checksumFile(file),
    };

    const reservationPath = path.join(CTK_DIR, `${reservation.id}.json`);
    fs.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));

    console.log(`Reserved file ${file} for specialist ${specialist_id}`);
    res.status(201).json({ reservation });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// POST /api/v1/ctk/release - Release a file reservation
app.post('/api/v1/ctk/release', (req, res) => {
  try {
    const { reservation_id } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ error: 'reservation_id is required' });
    }

    const reservationPath = path.join(CTK_DIR, `${reservation_id}.json`);
    if (!fs.existsSync(reservationPath)) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = JSON.parse(fs.readFileSync(reservationPath, 'utf-8'));
    reservation.released_at = new Date().toISOString();

    fs.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));

    console.log(`Released reservation ${reservation_id}`);
    res.json({ reservation });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: 'Failed to release reservation' });
  }
});

// ============================================================================
// Routes: Tech Orders
// ============================================================================

const TECH_ORDERS_DIR = path.join(FLIGHTLINE_DIR, 'tech-orders');

if (!fs.existsSync(TECH_ORDERS_DIR)) {
  fs.mkdirSync(TECH_ORDERS_DIR, { recursive: true });
}

// GET /api/v1/tech-orders - List all tech orders
app.get('/api/v1/tech-orders', (req, res) => {
  try {
    const files = fs.readdirSync(TECH_ORDERS_DIR);
    const techOrders = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(TECH_ORDERS_DIR, file), 'utf-8');
        const techOrder = JSON.parse(content);
        techOrders.push(techOrder);
      }
    }

    res.json({ tech_orders });
  } catch (error) {
    console.error('Error listing tech orders:', error);
    res.status(500).json({ error: 'Failed to list tech orders' });
  }
});

// POST /api/v1/tech-orders - Create new tech order
app.post('/api/v1/tech-orders', (req, res) => {
  try {
    const { name, pattern, context, usage_count = 0 } = req.body;

    if (!name || !pattern) {
      return res.status(400).json({ error: 'name and pattern are required' });
    }

    const techOrder = {
      id: 'to_' + crypto.randomUUID(),
      name,
      pattern,
      context,
      usage_count,
      success_rate: 0,
      anti_pattern: false,
      created_at: new Date().toISOString(),
      last_used: null,
    };

    const techOrderPath = path.join(TECH_ORDERS_DIR, `${techOrder.id}.json`);
    fs.writeFileSync(techOrderPath, JSON.stringify(techOrder, null, 2));

    console.log(`Created tech order: ${name}`);
    res.status(201).json({ tech_order });
  } catch (error) {
    console.error('Error creating tech order:', error);
    res.status(500).json({ error: 'Failed to create tech order' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`FleetTools API server listening on port ${PORT}`);
  console.log(`Flightline directory: ${FLIGHTLINE_DIR}`);
});
