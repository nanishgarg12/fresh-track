const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== MONGODB ==================
// IMPORTANT: use environment variable for deployment
mongoose.connect(process.env.MONGO_URI || 
  'mongodb+srv://nanishgarg18_db_user:nanish@cluster0.igpmk3q.mongodb.net/FreshTrackDB'
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ================== SCHEMAS ==================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'single' }
});
const User = mongoose.model('User', userSchema);

const pantrySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  category: String,
  batchNumber: String,
  quantity: Number,
  purchaseDate: Date,
  expiryDate: Date
});
const PantryItem = mongoose.model('PantryItem', pantrySchema);

// ================== ROUTES ==================

// ROOT
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== AUTH ==================

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (await User.findOne({ username })) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    await new User({ username, password: hash, role }).save();

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    res.json({ userId: user._id, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================== PANTRY ==================

// ADD ITEM
app.post('/api/item', async (req, res) => {
  try {
    await new PantryItem(req.body).save();
    res.json({ message: "Item added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// GET ITEMS (FIFO)
app.get('/api/items/:userId', async (req, res) => {
  try {
    const items = await PantryItem.find({ userId: req.params.userId })
      .sort({ expiryDate: 1, purchaseDate: 1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// ✅ USE ITEM (REDUCE QUANTITY)
app.put('/api/item/use/:id', async (req, res) => {
  try {
    const item = await PantryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.quantity -= 1;

    if (item.quantity <= 0) {
      await item.deleteOne();
      return res.json({ message: "Item fully used and removed" });
    }

    await item.save();
    res.json({ message: "Quantity updated", quantity: item.quantity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});

// UPDATE ITEM (MANUAL EDIT)
app.put('/api/item/:id', async (req, res) => {
  try {
    await PantryItem.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: "Item updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE ITEM
app.delete('/api/item/:id', async (req, res) => {
  try {
    await PantryItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================== START ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
