require('dotenv').config();

const admin = require('firebase-admin');
// Initialize Firebase Admin
// Option 1: Using service account key file (recommended for development)
// Download your service account key from Firebase Console > Project Settings > Service Accounts
// and save it as firebase-service-account.json in your project root

try {
  const serviceAccount = require('../../firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized with service account');
} catch (error) {
  console.log('⚠️  Service account file not found, trying environment variables...');
  
  // Option 2: Using environment variables (recommended for production)
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized with environment variables');
}
const db = admin.firestore();
db.settings({
  databaseId: 'craticaifirestore' ,
      storageBucket: 'craticai-file-uploads'
});
const bucket = admin.storage().bucket();
console.log('✅ Firestore database instance created');
console.log('================================\n');

module.exports = { admin, db, bucket };
