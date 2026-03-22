const { prisma } = require('../utils/database');

const addCustomCity = async (req, res) => {
  try {
    const { name, state } = req.body;
    if (!name || !state) return res.status(400).json({ error: 'Name and state are required' });

    const existing = await prisma.customCity.findFirst({ where: { name, state } });
    if (existing) return res.status(200).json({ message: 'City already exists', city: existing });

    const city = await prisma.customCity.create({
      data: { name: name.trim(), state: state.trim() }
    });

    res.status(201).json({ message: 'Custom city added', city });
  } catch (error) {
    console.error('addCustomCity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCustomCitiesByState = async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ error: 'State is required' });

    const cities = await prisma.customCity.findMany({ where: { state } , orderBy: { createdAt: 'desc' } });
    res.json({ cities });
  } catch (error) {
    console.error('getCustomCitiesByState error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addSubCaste = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const existing = await prisma.subCaste.findUnique({ where: { name } });
    if (existing) return res.status(200).json({ message: 'Sub caste already exists', subCaste: existing });

    const subCaste = await prisma.subCaste.create({ data: { name: name.trim() } });
    res.status(201).json({ message: 'Sub caste added', subCaste });
  } catch (error) {
    console.error('addSubCaste error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSubCastes = async (req, res) => {
  try {
    const list = await prisma.subCaste.findMany({ orderBy: { name: 'asc' } });
    res.json({ subCastes: list });
  } catch (error) {
    console.error('getSubCastes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addCustomCity,
  getCustomCitiesByState,
  addSubCaste,
  getSubCastes
};
