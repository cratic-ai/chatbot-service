require('dotenv').config(); // ✅ make sure .env is loaded

const { createClient } = require('@supabase/supabase-js');

// Use only environment variables — no hard-coded fallbacks
const supabaseUrl = "https://hjwzxypjecuogxgjagrh.supabase.co"

const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables. Check your .env file!");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// Optional connection test
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('auth_table').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

module.exports = { supabase, testConnection };
