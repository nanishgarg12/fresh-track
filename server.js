const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== MONGODB CONNECTION ==================
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://nanishgarg18_db_user:nanish@cluster0.igpmk3q.mongodb.net/FreshTrackDB';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected: FreshTrack Engine Active'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ================== DATA MODELS ==================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },   // ✅ ADDED
  password: { type: String, required: true },
  role: { type: String, default: 'single' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const pantrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Pantry' },
  batchNumber: { type: String, default: 'N/A' },
  quantity: { type: Number, default: 1 },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true }
});

const PantryItem = mongoose.model('PantryItem', pantrySchema);

// ================== EMAIL SETUP ==================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'YOUR_GMAIL@gmail.com',      // 🔹 Put your Gmail here
    pass: 'YOUR_APP_PASSWORD'          // 🔹 Put Gmail App Password here
  }
});

// ================== ROUTES ==================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== REGISTER ==================
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role
    });

    await newUser.save();

    res.status(201).json({ message: "Account created successfully!" });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ================== LOGIN ==================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    res.json({
      userId: user._id,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// ================== ADD ITEM ==================
app.post('/api/item', async (req, res) => {
  try {
    const newItem = new PantryItem(req.body);
    await newItem.save();
    res.status(201).json({ message: "Item added to inventory." });
  } catch (err) {
    console.error("Add Item Error:", err);
    res.status(500).json({ error: "Could not save item." });
  }
});

// ================== GET ITEMS ==================
app.get('/api/items/:userId', async (req, res) => {
  try {
    const items = await PantryItem.find({ userId: req.params.userId })
      .sort({ expiryDate: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch inventory." });
  }
});

// ================== USE ITEM ==================
app.put('/api/item/use/:id', async (req, res) => {
  try {
    const item = await PantryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });

    item.quantity -= 1;

    if (item.quantity <= 0) {
      await item.deleteOne();
      return res.json({ message: "Item used up and removed." });
    }

    await item.save();
    res.json({ message: "Quantity updated.", newQuantity: item.quantity });

  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
});

// ================== DELETE ITEM ==================
app.delete('/api/item/:id', async (req, res) => {
  try {
    await PantryItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item discarded." });
  } catch (err) {
    res.status(500).json({ error: "Delete failed." });
  }
});

// ================== DAILY EXPIRY CHECK ==================
cron.schedule('0 9 * * *', async () => {
  console.log("🔔 Running daily expiry check...");

  const today = new Date();
  const next3Days = new Date();
  next3Days.setDate(today.getDate() + 3);

  const expiringItems = await PantryItem.find({
    expiryDate: { $lte: next3Days }
  });

  for (let item of expiringItems) {
    const user = await User.findById(item.userId);
    if (!user) continue;

    const mailOptions = {
      from: 'YOUR_GMAIL@gmail.com',
      to: user.email,
      subject: '⚠️ FreshTrack Expiry Alert',
      text: `Reminder: ${item.name} is expiring on ${item.expiryDate.toDateString()}`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) console.log("Email error:", err);
      else console.log("Expiry email sent to", user.email);
    });
  }
});

// ================== SERVER START ==================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 FreshTrack Pro Server Running
----------------------------------
📡 URL: http://localhost:${PORT}
📦 Mode: Development
🔔 Email Alerts: Active
----------------------------------
  `);
});