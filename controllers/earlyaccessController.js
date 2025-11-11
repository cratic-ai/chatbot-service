const earlyAccessService = require('../services/earlyaccessService');

// ✅ POST /client/waitlist
exports.createClient = async (req, res) => {
  try {
    const {
      name,
      company,
      email,
      phone,
      position,
      company_size,
      compliance_status,
      biggest_compliance_challenge
    } = req.body;

    // Simple validation
    if (!name || !company || !email || !phone || !position || !company_size || !compliance_status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await earlyAccessService.createClient({
      name,
      company,
      email,
      phone,
      position,
      company_size,
      compliance_status,
      biggest_compliance_challenge
    });

    res.status(201).json(client);
  } catch (err) {
    console.error("❌ Error creating client:", err.message);
    res.status(500).json({ error: "Failed to create client" });
  }
};

// ✅ GET /client/waitlist
exports.getAllClients = async (req, res) => {
  try {
    const clients = await earlyAccessService.getAllClients();
    res.status(200).json(clients);
  } catch (err) {
    console.error("❌ Error fetching clients:", err.message);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
};
