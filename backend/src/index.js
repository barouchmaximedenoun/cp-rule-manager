const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Helper: get display priority mapping for a page
async function getDisplayPriorityMap(page, pageSize) {
  const rules = await prisma.rule.findMany({
    orderBy: { priority: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return rules.map((rule, idx) => ({
    ...rule,
    displayPriority: idx + 1 + (page - 1) * pageSize,
  }));
}

// GET /rules?page=&pageSize=
app.get('/rules', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const rules = await prisma.rule.findMany({
    orderBy: { priority: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  // Add displayPriority for UI
  const rulesWithDisplay = rules.map((rule, idx) => ({
    ...rule,
    displayPriority: idx + 1 + (page - 1) * pageSize,
  }));
  res.json(rulesWithDisplay);
});

// GET /rules/count
app.get('/rules/count', async (req, res) => {
  const count = await prisma.rule.count();
  res.json({ count });
});

// POST /rules
app.post('/rules', async (req, res) => {
  const { priority, name, sources, destinations } = req.body;
  try {
    const rule = await prisma.rule.create({
      data: { priority, name, sources, destinations },
    });
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /rules/:id
app.put('/rules/:id', async (req, res) => {
  const { id } = req.params;
  const { priority, name, sources, destinations } = req.body;
  try {
    const rule = await prisma.rule.update({
      where: { id },
      data: { priority, name, sources, destinations },
    });
    res.json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /rules/:id
app.delete('/rules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.rule.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /rules/reorder
// Body: { id, newPriority }
app.patch('/rules/reorder', async (req, res) => {
  const { id, newPriority } = req.body;
  try {
    const rule = await prisma.rule.update({
      where: { id },
      data: { priority: newPriority },
    });
    res.json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Always keep a "last row" (not editable, always at the end)
app.get('/rules/last', async (req, res) => {
  // This could be a static rule or a special marker
  res.json({
    id: 'last-row',
    priority: Number.POSITIVE_INFINITY,
    name: 'Last Row (Not Editable)',
    sources: [],
    destinations: [],
    displayPriority: '∞',
    isLast: true,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
