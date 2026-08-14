const express = require('express');
const router = express.Router();
const Geofence = require('../models/Geofence');

// Initial hazard & safe zones (focusing on North-East India & major tourist routes)
const DEFAULT_ZONES = [
  {
    name: 'Kaziranga Heavy Flood Hazard Zone',
    type: 'DANGER',
    latitude: 26.5775,
    longitude: 93.1711,
    radiusMeters: 3000,
    description: 'IMD Alert: Brahmaputra river overflow & wildlife crossway hazard.',
    warningMessage: '🚨 DANGER: Kaziranga Monsoonal Flood Zone! Stay on elevated national highway.',
    reportedBy: 'Assam State Disaster Management Authority (ASDMA)'
  },
  {
    name: 'Nathula Pass Landslide & Avalanche Cliff',
    type: 'DANGER',
    latitude: 27.3867,
    longitude: 88.8304,
    radiusMeters: 2500,
    description: 'Geological Survey: High altitude unstable rockfall & snowpack slope.',
    warningMessage: '⚠️ WARNING: High-Risk Landslide Cliff! Proceed only with army convoy.',
    reportedBy: 'Border Roads Organisation (BRO) / Sikkim Police'
  },
  {
    name: 'Manas Sanctuary Protected Wildlife Reserve',
    type: 'RESTRICTED',
    latitude: 26.7271,
    longitude: 90.9634,
    radiusMeters: 2000,
    description: 'UNESCO Protected Ecological Zone. Night travel prohibited.',
    warningMessage: '⛔ RESTRICTED: Entry permitted only with Forest Officer Pass.',
    reportedBy: 'Assam Forest Department'
  },
  {
    name: 'Tawang Frontier Protection Line',
    type: 'RESTRICTED',
    latitude: 27.5860,
    longitude: 91.8594,
    radiusMeters: 3000,
    description: 'Restricted Border Security Zone (Inner Line Permit Mandatory).',
    warningMessage: '🔒 RESTRICTED ZONE: Inner Line Permit (ILP) required for non-locals.',
    reportedBy: 'Arunachal Pradesh Home Department'
  },
  {
    name: 'Guwahati Central Tourist Police Hub',
    type: 'SAFE',
    latitude: 26.1445,
    longitude: 91.7362,
    radiusMeters: 5000,
    description: 'Main monitored safe tourist center with 24/7 Police & Medical Coverage.',
    warningMessage: '🛡️ You are inside Guwahati Central Monitored Safe Tourist Zone.',
    reportedBy: 'Assam Tourist Police'
  },
  {
    name: 'Shillong Tourist Safety Desk',
    type: 'SAFE',
    latitude: 25.5788,
    longitude: 91.8933,
    radiusMeters: 4000,
    description: 'Meghalaya Police Tourist Assistance and Emergency Desk.',
    warningMessage: '🛡️ You are in Shillong Tourist Safe Zone.',
    reportedBy: 'Meghalaya Police'
  },
  {
    name: 'High-Risk Landslide Hazard Area (Delhi NCR)',
    type: 'DANGER',
    latitude: 28.6300,
    longitude: 77.2200,
    radiusMeters: 1200,
    description: 'IMD Alert: Unstable slope terrain with active rockfalls.',
    warningMessage: '⚠️ WARNING: High-Risk Landslide Hazard Zone!',
    reportedBy: 'NDMA / Geological Survey of India'
  }
];

// GET /api/geofences - Fetch all active hazard & safe geofences
router.get('/', async (req, res) => {
  try {
    let zones = await Geofence.find().sort({ createdAt: -1 });
    
    // Seed defaults if empty
    if (zones.length === 0) {
      zones = await Geofence.insertMany(DEFAULT_ZONES);
    }

    res.json({
      success: true,
      count: zones.length,
      zones
    });
  } catch (err) {
    console.error('Error fetching geofences:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch geofences' });
  }
});

// POST /api/geofences - Add a new dynamic hazard/restricted zone (Police/Admin)
router.post('/', async (req, res) => {
  try {
    const { name, type, latitude, longitude, radiusMeters, description, warningMessage, reportedBy } = req.body;
    
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Name, latitude, and longitude are required' });
    }

    const zone = await Geofence.create({
      name,
      type: type || 'DANGER',
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters) || 1000,
      description: description || '',
      warningMessage: warningMessage || `⚠️ Warning: You have entered ${name}`,
      reportedBy: reportedBy || 'Police Control Room'
    });

    res.status(201).json({
      success: true,
      message: 'Geofence hazard zone created successfully',
      zone
    });
  } catch (err) {
    console.error('Error creating geofence:', err);
    res.status(500).json({ success: false, message: 'Failed to create geofence' });
  }
});

// DELETE /api/geofences/:id - Remove/resolve a hazard zone
router.delete('/:id', async (req, res) => {
  try {
    const zone = await Geofence.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Geofence zone not found' });
    }
    res.json({ success: true, message: 'Geofence zone resolved/removed' });
  } catch (err) {
    console.error('Error deleting geofence:', err);
    res.status(500).json({ success: false, message: 'Failed to delete geofence' });
  }
});

module.exports = router;
