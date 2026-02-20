require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nanishgarg18_db_user:nanish@cluster0.igpmk3q.mongodb.net/FreshTrackDB';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= DATABASE =================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB error:', err));

// ================= MODELS =================
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'single' }
}));

const PantryItem = mongoose.model('PantryItem', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: String,
  quantity: { type: Number, default: 1 },
  expiryDate: { type: Date, required: true },
  batchNumber: String,
  notified: { type: Boolean, default: false }
}, { timestamps: true }));

// ================= EMAIL =================
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((err) => {
  if (err) console.log('Email config error:', err);
  else console.log('Email server ready');
});

// ================= EXPIRY CHECK =================
async function checkExpiryAndNotify() {
  try {
    const today = new Date();
    const next3Days = new Date();
    next3Days.setDate(today.getDate() + 3);

    const items = await PantryItem.find({
      expiryDate: { $gte: today, $lte: next3Days },
      notified: false
    });

    for (const item of items) {
      const user = await User.findById(item.userId);
      if (!user || !user.email) continue;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'FreshTrack Expiry Alert',
        text: `Reminder: Your item "${item.name}" expires on ${item.expiryDate.toDateString()}`
      });

      item.notified = true;
      await item.save();
    }
  } catch (error) {
    console.log('Expiry check error:', error);
  }
}

cron.schedule('0 * * * *', checkExpiryAndNotify);

app.get('/check-expiry', async (req, res) => {
  await checkExpiryAndNotify();
  res.json({ message: 'Expiry check completed' });
});

// ================= AUTH ROUTES =================
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role || 'single'
    });

    return res.status(201).json({ message: 'Registration successful.', userId: user._id });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    return res.json({
      message: 'Login successful.',
      userId: user._id,
      role: user.role
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// ================= PANTRY ROUTES =================
app.get('/api/items/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const items = await PantryItem.find({ userId }).sort({ expiryDate: 1, createdAt: 1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load items.' });
  }
});

app.post('/api/item', async (req, res) => {
  try {
    const { userId, name, category, quantity, expiryDate, batchNumber } = req.body;
    if (!userId || !name || !expiryDate) {
      return res.status(400).json({ error: 'userId, name, and expiryDate are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const item = await PantryItem.create({
      userId,
      name: name.trim(),
      category: category || 'Pantry',
      quantity: Number.isFinite(Number(quantity)) ? Number(quantity) : 1,
      expiryDate,
      batchNumber: batchNumber || 'N/A'
    });

    return res.status(201).json({ message: 'Item added.', item });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add item.' });
  }
});

app.put('/api/item/use/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item id.' });
    }

    const item = await PantryItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if ((item.quantity || 0) > 1) {
      item.quantity -= 1;
      await item.save();
      return res.json({ message: 'Item quantity updated.', item });
    }

    await PantryItem.findByIdAndDelete(id);
    return res.json({ message: 'Item removed.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update item.' });
  }
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
