#!/usr/bin/env node

/**
 * Data Cleanup Script - Secured for SIH 2025
 * Clears all user data, emergency alerts, and tracking logs
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// Safety Check: NODE_ENV
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('❌ ERROR: Data cleanup is prohibited in PRODUCTION mode without the --force flag.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function performClear() {
  console.log('🧹 Smart Tourist Safety System - Data Cleanup');
  console.log('============================================');
  
  rl.question('⚠️  WARNING: This will permanently delete ALL data from the database. Are you sure? (y/N) ', async (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Cleanup aborted.');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('\n🔄 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourist-safety-db');
      
      console.log('1. Clearing MongoDB Database...');
      await mongoose.connection.db.dropDatabase();
      console.log('   ✅ MongoDB database completely cleared');
      
      console.log('\n🎉 CLEANUP COMPLETE!');
      console.log('==========================================');
      console.log('✅ All user data and digital IDs cleared');
      console.log('✅ All emergency alerts and locations removed');
      console.log('✅ Database completely reset');
      
    } catch (error) {
      console.error('\n❌ Error during cleanup:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed');
      rl.close();
      process.exit(0);
    }
  });
}

performClear();
