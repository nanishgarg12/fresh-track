require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= DATABASE =================
mongoose.connect('mongodb+srv://nanishgarg18_db_user:nanish@cluster0.igpmk3q.mongodb.net/FreshTrackDB')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// ================= MODELS =================
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'single' }
}));

const PantryItem = mongoose.model('PantryItem', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  category: String,
  quantity: Number,
  expiryDate: Date,
  notified: { type: Boolean, default: false }  // prevents duplicate emails
}));

// ================= EMAIL =================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'freshtrack725@gmail.com',   // your gmail
    pass: 'wtls skkc zxdt dvnu' // replace this
  }
});

transporter.verify((err) => {
  if (err) console.log("❌ Email config error:", err);
  else console.log("✅ Email server ready");
});

// ================= EXPIRY CHECK =================
// Runs every minute (testing)
cron.schedule('* * * * *', async () => {
  console.log("🔔 Checking expiry...");

  try {
    const today = new Date();
    const next3Days = new Date();
    next3Days.setDate(today.getDate() + 3);

    const items = await PantryItem.find({
      expiryDate: { $gte: today, $lte: next3Days },
      notified: false
    });

    console.log("Items to notify:", items.length);

    for (let item of items) {
      const user = await User.findById(item.userId);
      if (!user) continue;

      await transporter.sendMail({
        from: 'freshtrack725@gmail.com',
        to: user.email,
        subject: '⚠️ FreshTrack Expiry Alert',
        text: `Reminder: Your item "${item.name}" will expire on ${item.expiryDate.toDateString()}`
      });

      item.notified = true;
      await item.save();

      console.log("✅ Email sent to:", user.email);
    }

  } catch (error) {
    console.log("❌ Cron error:", error);
  }
});

// ================= SERVER =================
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});