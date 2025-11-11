const waitlistRepository = require('../repositories/earlyaccessRepository');

// Business logic (thin for now, can be expanded later)
exports.createClient = async (clientData) => {
  return await waitlistRepository.insertClient(clientData);
};
exports.getAllClients = async () => {
  return await waitlistRepository.fetchAllClients();
};
