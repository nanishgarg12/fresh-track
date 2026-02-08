const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors()); // Allows your frontend to talk to this backend
app.use(express.json());
// Serves your HTML/CSS/JS files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ================== MONGODB CONNECTION ==================
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://nanishgarg18_db_user:nanish@cluster0.igpmk3q.mongodb.net/FreshTrackDB';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected: FreshTrack Engine Active'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ================== DATA MODELS ==================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'single' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const pantrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Pantry' }, // e.g., Medicine, Dairy, Emergency
  batchNumber: { type: String, default: 'N/A' },
  quantity: { type: Number, default: 1 },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true }
});
const PantryItem = mongoose.model('PantryItem', pantrySchema);

// ================== API ROUTES ==================

/**
 * ROOT ROUTE: Serves the Main UI
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * AUTH: User Registration
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Reg Error:", err);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

/**
 * AUTH: User Login
 */
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

/**
 * PANTRY: Add New Item (Food/Medicine/Emergency)
 */
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

/**
 * PANTRY: Get All Items for User (Sorted by FIFO - Expiry Date)
 */
app.get('/api/items/:userId', async (req, res) => {
  try {
    const items = await PantryItem.find({ userId: req.params.userId })
      .sort({ expiryDate: 1 }); // FIFO: Soonest expiry first
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch inventory." });
  }
});

/**
 * PANTRY: Use/Decrement Item Quantity
 */
app.put('/api/item/use/:id', async (req, res) => {
  try {
    const item = await PantryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });

    item.quantity -= 1;

    if (item.quantity <= 0) {
      await item.deleteOne();
      return res.json({ message: "Item used up and removed from stock." });
    }

    await item.save();
    res.json({ message: "Quantity updated.", newQuantity: item.quantity });
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
});

/**
 * PANTRY: Manual Delete
 */
app.delete('/api/item/:id', async (req, res) => {
  try {
    await PantryItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item discarded." });
  } catch (err) {
    res.status(500).json({ error: "Delete operation failed." });
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
  🔋 FIFO Engine: Active
  ----------------------------------
  `);
});