import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // 2. Define Admin Credentials
    const adminEmail = 'admin@eventbook.com';
    const adminPassword = 'admin123';

    // 3. Check if Admin already exists
    const userExists = await User.findOne({ email: adminEmail });
    
    if (userExists) {
      // If user exists but is not admin, update them
      userExists.role = 'admin';
      // We explicitly set password again to ensure you know it
      userExists.password = adminPassword; 
      await userExists.save();
      console.log('🔄 Existing user updated to Admin Role.');
    } else {
      // 4. Create New Admin
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log('🎉 New Admin Account Created!');
    }

    console.log('-----------------------------------');
    console.log('📧 Email: ' + adminEmail);
    console.log('🔑 Pass:  ' + adminPassword);
    console.log('-----------------------------------');
    
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

createAdmin();
