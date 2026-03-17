import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { connectDB, sequelize } from './config/db.js';

dotenv.config();

const setupAdmin = async () => {
  try {
    await connectDB();
    await sequelize.sync();

    const adminEmail = "vishal123@gmail.com";
    const adminPassword = "vishal@123";
    
    // Check if the admin already exists
    let adminUser = await User.findOne({ where: { email: adminEmail } });

    if (adminUser) {
      console.log(`Admin user ${adminEmail} already exists. Ensuring they have the admin role...`);
      adminUser.role = "admin";
      // We manually hash the password because Sequelize hooks can be finicky on updates
      const salt = await bcrypt.genSalt(10);
      adminUser.password = await bcrypt.hash(adminPassword, salt);
      // Disable hooks on save so we don't accidentally double hash
      await adminUser.save({ hooks: false });
      console.log("Admin account updated successfully!");
    } else {
      console.log(`Creating new admin user: ${adminEmail}`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      adminUser = await User.create({
        name: "Super Admin",
        firstName: "Super",
        lastName: "Admin",
        email: adminEmail,
        password: hashedPassword, 
        role: "admin",
      }, { hooks: false }); // Disable hooks to prevent double hashing
      console.log("Admin account created successfully!");
    }

    console.log("\n=========================");
    console.log("Admin Credentials:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("=========================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error setting up admin account:", error);
    process.exit(1);
  }
};

setupAdmin();
