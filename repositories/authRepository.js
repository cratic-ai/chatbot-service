// const { db } = require('../config/firebase');

// console.log('================================');
// console.log('🔥 authRepository.js (Firestore) LOADING');
// console.log('================================');
// console.log('Firestore client available:', !!db);
// console.log('================================\n');

// /**
//  * Find user by email in Firestore
//  * Collection: users
//  * Document ID: email (for easy lookup)
//  */
// exports.findUserByEmail = async (email) => {
//   console.log('\n================================');
//   console.log('🔍 findUserByEmail (Firestore)');
//   console.log('================================');
//   console.log('Email:', email);

//   try {
//     // Get document with email as ID
//     const userDoc = await db.collection('users').doc(email).get();

//     if (!userDoc.exists) {
//       console.log('User not found (OK for signup)');
//       console.log('================================\n');
//       return null;
//     }

//     const userData = userDoc.data();
//     console.log('✅ User found in Firestore');
//     console.log('User data:', JSON.stringify({ ...userData, password: '***hidden***' }, null, 2));
//     console.log('================================\n');

//     // Return user with id field
//     return {
//       id: userDoc.id,
//       ...userData
//     };

//   } catch (error) {
//     console.error('\n================================');
//     console.error('❌ Error in findUserByEmail');
//     console.error('Error:', error.message);
//     console.error('Error stack:', error.stack);
//     console.error('================================\n');
//     throw error;
//   }
// };

// /**
//  * Create new user in Firestore
//  * Uses email as document ID for easy lookup
//  */
// exports.createUser = async (email, password) => {
//   console.log('\n================================');
//   console.log('📝 createUser (Firestore)');
//   console.log('================================');
//   console.log('Email:', email);
//   console.log('Password provided:', !!password);

//   try {
//     const userData = {
//       email,
//       password,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     };

//     // Use email as document ID
//     await db.collection('users').doc(email).set(userData);

//     console.log('✅ User created in Firestore');
//     console.log('================================\n');

//     return {
//       id: email,
//       ...userData
//     };

//   } catch (error) {
//     console.error('\n================================');
//     console.error('❌ Error in createUser');
//     console.error('Error:', error.message);
    
//     // Handle duplicate user error
//     if (error.code === 6) { // ALREADY_EXISTS
//       console.error('User already exists');
//       const customError = new Error('User already exists');
//       customError.status = 400;
//       throw customError;
//     }
    
//     console.error('Error stack:', error.stack);
//     console.error('================================\n');
//     throw error;
//   }
// };


console.log('================================');
console.log('🔬 DEEP DIAGNOSTIC authRepository.js LOADING');
console.log('================================');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current working directory:', process.cwd());
console.log('================================');

// Check what's available globally
console.log('Global fetch available:', typeof global.fetch);
console.log('Global fetch type:', typeof global.fetch);

// Check environment
console.log('Environment variables:');
console.log('- HTTP_PROXY:', process.env.HTTP_PROXY || 'Not set');
console.log('- HTTPS_PROXY:', process.env.HTTPS_PROXY || 'Not set');
console.log('- NO_PROXY:', process.env.NO_PROXY || 'Not set');
console.log('================================');

let supabase;
let createClientError = null;

try {
  console.log('Attempting to require @supabase/supabase-js...');
  const { createClient } = require('@supabase/supabase-js');
  console.log('✅ @supabase/supabase-js loaded successfully');
  console.log('createClient type:', typeof createClient);

  const supabaseUrl = 'https://hjwzxypjecuogxgjagrh.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd3p4eXBqZWN1b2d4Z2phZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODU1MDYsImV4cCI6MjA3MTE2MTUwNn0.9jz_WFq10vJ_oU3k_Nfo2Rt2baxVlIgocWfYnd-XToY';

  console.log('Creating Supabase client...');
  console.log('URL:', supabaseUrl);
  console.log('Key length:', supabaseKey.length);

  supabase = createClient(supabaseUrl, supabaseKey);

  console.log('✅ Supabase client created');
  console.log('Supabase client type:', typeof supabase);
  console.log('Supabase has .from method:', typeof supabase.from === 'function');

} catch (error) {
  console.error('================================');
  console.error('❌ FAILED TO CREATE SUPABASE CLIENT');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  createClientError = error;
  console.error('================================');
}

console.log('================================');
console.log('authRepository.js initialization complete');
console.log('================================\n');

exports.findUserByEmail = async (email) => {
  console.log('\n================================');
  console.log('🔬 DEEP DIAGNOSTIC: findUserByEmail');
  console.log('================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Email parameter:', email);
  console.log('Email type:', typeof email);
  console.log('Email length:', email ? email.length : 0);

  // Check if we had initialization errors
  if (createClientError) {
    console.error('❌ Cannot proceed - Supabase client creation failed earlier');
    console.error('Original error:', createClientError.message);
    throw createClientError;
  }

  if (!supabase) {
    const error = new Error('Supabase client is null or undefined');
    console.error('❌ Supabase client not available');
    throw error;
  }

  console.log('✅ Supabase client is available');

  try {
    console.log('\n--- STEP 1: Creating query builder ---');
    console.log('Calling supabase.from("auth_table")...');

    let queryBuilder;
    try {
      queryBuilder = supabase.from('auth_table');
      console.log('✅ Query builder created');
      console.log('Query builder type:', typeof queryBuilder);
      console.log('Query builder has .select:', typeof queryBuilder.select === 'function');
    } catch (qbError) {
      console.error('❌ Failed to create query builder');
      console.error('Error name:', qbError.name);
      console.error('Error message:', qbError.message);
      console.error('Error stack:', qbError.stack);
      throw qbError;
    }

    console.log('\n--- STEP 2: Building query ---');
    console.log('Calling .select("*")...');

    let selectQuery;
    try {
      selectQuery = queryBuilder.select('*');
      console.log('✅ .select() called');
      console.log('Select query type:', typeof selectQuery);
      console.log('Select query has .eq:', typeof selectQuery.eq === 'function');
    } catch (selectError) {
      console.error('❌ Failed to call .select()');
      console.error('Error:', selectError);
      throw selectError;
    }

    console.log('\n--- STEP 3: Adding filter ---');
    console.log('Calling .eq("email", "' + email + '")...');

    let filteredQuery;
    try {
      filteredQuery = selectQuery.eq('email', email);
      console.log('✅ .eq() called');
      console.log('Filtered query type:', typeof filteredQuery);
      console.log('Filtered query has .single:', typeof filteredQuery.single === 'function');
    } catch (eqError) {
      console.error('❌ Failed to call .eq()');
      console.error('Error:', eqError);
      throw eqError;
    }

    console.log('\n--- STEP 4: Limiting to single result ---');
    console.log('Calling .single()...');

    let singleQuery;
    try {
      singleQuery = filteredQuery.single();
      console.log('✅ .single() called');
      console.log('Single query type:', typeof singleQuery);
      console.log('Single query is Promise:', singleQuery instanceof Promise);
    } catch (singleError) {
      console.error('❌ Failed to call .single()');
      console.error('Error:', singleError);
      throw singleError;
    }

    console.log('\n--- STEP 5: EXECUTING QUERY (await) ---');
    console.log('This is where the network request happens...');
    console.log('Awaiting query result...');

    let result;
    try {
      // This is the critical line where fetch happens
      result = await singleQuery;
      console.log('✅ Query completed successfully!');
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
    } catch (executeError) {
      console.error('\n❌❌❌ QUERY EXECUTION FAILED ❌❌❌');
      console.error('This is the actual error!');
      console.error('================================');
      console.error('Error name:', executeError.name);
      console.error('Error message:', executeError.message);
      console.error('Error constructor:', executeError.constructor.name);

      // Get ALL error properties
      console.error('\n--- ALL ERROR PROPERTIES ---');
      const errorProps = Object.getOwnPropertyNames(executeError);
      errorProps.forEach(prop => {
        console.error(`${prop}:`, executeError[prop]);
      });

      // Check for cause chain
      console.error('\n--- ERROR CAUSE CHAIN ---');
      let currentError = executeError;
      let depth = 0;
      while (currentError && depth < 10) {
        console.error(`[Depth ${depth}]`, currentError.message);
        if (currentError.cause) {
          console.error(`  Cause type:`, currentError.cause.constructor.name);
          console.error(`  Cause message:`, currentError.cause.message);
          if (currentError.cause.code) {
            console.error(`  Cause code:`, currentError.cause.code);
          }
          if (currentError.cause.errno) {
            console.error(`  Cause errno:`, currentError.cause.errno);
          }
          if (currentError.cause.syscall) {
            console.error(`  Cause syscall:`, currentError.cause.syscall);
          }
          if (currentError.cause.address) {
            console.error(`  Cause address:`, currentError.cause.address);
          }
          if (currentError.cause.port) {
            console.error(`  Cause port:`, currentError.cause.port);
          }
        }
        currentError = currentError.cause;
        depth++;
      }

      // Check for specific error types
      console.error('\n--- ERROR TYPE ANALYSIS ---');
      console.error('Is TypeError:', executeError instanceof TypeError);
      console.error('Is Error:', executeError instanceof Error);
      console.error('Is NetworkError:', executeError.name === 'NetworkError');
      console.error('Is FetchError:', executeError.name === 'FetchError');

      // Network-specific debugging
      if (executeError.message.includes('fetch')) {
        console.error('\n--- FETCH ERROR DETECTED ---');
        console.error('This is a network connectivity issue');
        console.error('Possible causes:');
        console.error('1. Node.js version is too old (current:', process.version, ')');
        console.error('2. Firewall blocking outbound connections');
        console.error('3. DNS resolution failing');
        console.error('4. SSL/TLS certificate issues');
        console.error('5. No internet connection');
        console.error('6. Proxy configuration issues');
      }

      console.error('\n--- FULL ERROR OBJECT (JSON) ---');
      console.error(JSON.stringify(executeError, Object.getOwnPropertyNames(executeError), 2));

      console.error('\n--- STACK TRACE ---');
      console.error(executeError.stack);

      console.error('================================\n');
      throw executeError;
    }

    console.log('\n--- STEP 6: Processing result ---');
    const { data, error } = result;

    console.log('Result has data:', !!data);
    console.log('Result has error:', !!error);

    if (error) {
      console.log('\n--- Supabase returned an error ---');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', JSON.stringify(error, null, 2));

      // PGRST116 means "no rows found" - this is OK
      if (error.code === 'PGRST116') {
        console.log('✅ This is OK - user not found (expected for new signup)');
        console.log('================================\n');
        return null;
      }

      console.error('❌ Unexpected Supabase error');
      console.error('================================\n');
      throw error;
    }

    if (data) {
      console.log('✅ User found in database');
      console.log('User data:', JSON.stringify(data, null, 2));
    } else {
      console.log('User not found (OK for signup)');
    }

    console.log('================================\n');
    return data;

  } catch (error) {
    console.error('\n================================');
    console.error('❌ CAUGHT ERROR IN findUserByEmail');
    console.error('Error:', error.message);
    console.error('Re-throwing error...');
    console.error('================================\n');
    throw error;
  }
};

exports.createUser = async (email, password) => {
  console.log('\n================================');
  console.log('🔬 DEEP DIAGNOSTIC: createUser');
  console.log('================================');
  console.log('Email:', email);
  console.log('Password provided:', !!password);

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    console.log('Inserting into auth_table...');
    const { data, error } = await supabase
      .from('auth_table')
      .insert([{ email, password }])
      .select();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log('✅ User created');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('================================\n');
    return data;
  } catch (error) {
    console.error('❌ Error in createUser:', error.message);
    console.error('================================\n');
    throw error;
  }
};

