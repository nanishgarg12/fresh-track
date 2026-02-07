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
mongoose.connect(
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
  quantityUsed: { type: Number, default: 0 },
  purchaseDate: Date,
  expiryDate: Date
});
const PantryItem = mongoose.model('PantryItem', pantrySchema);

// ================== ROUTES ==================

// ROOT FIX
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// REGISTER
app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (await User.findOne({ username }))
    return res.status(400).json({ error: "User already exists" });

  const hash = await bcrypt.hash(password, 10);
  await new User({ username, password: hash, role }).save();
  res.json({ message: "Registration successful" });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Wrong password" });

  res.json({ userId: user._id, role: user.role });
});

// ADD ITEM
app.post('/api/item', async (req, res) => {
  await new PantryItem(req.body).save();
  res.json({ message: "Item added" });
});

// GET ITEMS (FIFO)
app.get('/api/items/:userId', async (req, res) => {
  const items = await PantryItem.find({ userId: req.params.userId })
    .sort({ purchaseDate: 1, expiryDate: 1 });
  res.json(items);
});

// UPDATE ITEM ✅ REQUIRED
app.put('/api/item/:id', async (req, res) => {
  await PantryItem.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: "Item updated" });
});

// DELETE ITEM
app.delete('/api/item/:id', async (req, res) => {
  await PantryItem.findByIdAndDelete(req.params.id);
  res.json({ message: "Item deleted" });
});

// ================== START ==================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

