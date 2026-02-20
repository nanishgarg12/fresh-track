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
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ================== MODELS ==================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
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
    user: 'freshtrack725@gmail.com',        // 🔴 PUT YOUR REAL GMAIL
    pass: 'thalapathy'  // 🔴 PUT GMAIL APP PASSWORD
  }
});

// Verify email connection at startup
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Email configuration error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

// ================== ROUTES ==================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username or Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({ message: "Account created successfully!" });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    res.json({
      userId: user._id,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

// ADD ITEM
app.post('/api/item', async (req, res) => {
  try {
    await PantryItem.create(req.body);
    res.status(201).json({ message: "Item added." });
  } catch (err) {
    res.status(500).json({ error: "Item save failed." });
  }
});

// GET ITEMS
app.get('/api/items/:userId', async (req, res) => {
  try {
    const items = await PantryItem.find({ userId: req.params.userId })
      .sort({ expiryDate: 1 });
    res.json(items);
  } catch {
    res.status(500).json({ error: "Fetch failed." });
  }
});

// DELETE ITEM
app.delete('/api/item/:id', async (req, res) => {
  try {
    await PantryItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted." });
  } catch {
    res.status(500).json({ error: "Delete failed." });
  }
});

// ================== EXPIRY CHECK (TEST MODE) ==================
// Runs EVERY 1 MINUTE for testing
cron.schedule('* * * * *', async () => {
  console.log("🔔 Checking expiry items...");

  try {
    const today = new Date();
    const next3Days = new Date();
    next3Days.setDate(today.getDate() + 3);

    const expiringItems = await PantryItem.find({
      expiryDate: { $gte: today, $lte: next3Days }
    });

    console.log("Items found:", expiringItems.length);

    for (let item of expiringItems) {
      const user = await User.findById(item.userId);
      if (!user) continue;

      await transporter.sendMail({
        from: 'yourgmail@gmail.com',
        to: user.email,
        subject: '⚠️ FreshTrack Expiry Alert',
        text: `Reminder: ${item.name} expires on ${item.expiryDate.toDateString()}`
      });

      console.log("✅ Email sent to:", user.email);
    }

  } catch (error) {
    console.log("❌ Cron error:", error);
  }
});

// ================== SERVER ==================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 FreshTrack Running at http://localhost:${PORT}
🔔 Expiry Check: Every 1 Minute (Test Mode)
  `);
});