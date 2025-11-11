const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zrcxncrywssgnxkgewsi.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyY3huY3J5d3NzZ254a2dld3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTI1MjYsImV4cCI6MjA3MTMyODUyNn0.n9thb-NSp-gK0e620RvG0ZtNrgMz9AabfE-J5UyIhFQ')

// Insert new client
exports.insertClient = async (clientData) => {
  const { data, error } = await supabase
    .from('waitlist_clients')
    .insert([{
      ...clientData,
      status: false   // ensure default
    }])
    .select('*');

  if (error) {
    console.error("❌ Supabase insert error:", error.message);
    throw new Error(error.message);
  }

  return data[0];
};

// Fetch all clients
exports.fetchAllClients = async () => {
  const { data, error } = await supabase
    .from('waitlist_clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    throw new Error(error.message);
  }

  return data;
};
