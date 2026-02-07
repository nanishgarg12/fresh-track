let currentUserId = null;
let pantry = [];

console.log("✅ Frontend script loaded");

/* ================= AUTH ================= */
function showRegister() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "block";
}

function showLogin() {
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("loginPage").style.display = "block";
}

async function createUser() {
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("role").value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    document.getElementById("registerMsg").innerText = data.message || data.error;
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.error) {
        document.getElementById("loginError").innerText = data.error;
        return;
    }

    currentUserId = data.userId;

    document.getElementById("loginPage").style.display = "none";
    document.getElementById("registerPage").style.display = "none";
    document.getElementById("app").style.display = "block";

    loadItems();
}

/* ================= PANTRY ================= */
async function addItem() {
    const item = {
        userId: currentUserId,
        name: document.getElementById("itemName").value,
        category: document.getElementById("category").value,
        batchNumber: document.getElementById("batchNumber").value,
        quantity: Number(document.getElementById("quantity").value),
        purchaseDate: document.getElementById("purchaseDate").value,
        expiryDate: document.getElementById("expiryDate").value
    };

    await fetch('/api/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });

    document.getElementById("addMsg").innerText = "Item added!";
    loadItems();
}

async function loadItems() {
    const res = await fetch(`/api/items/${currentUserId}`);
    pantry = await res.json();
    renderDashboard();
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
    // Health Score
    let healthScore = Math.floor(Math.random() * 20) + 80; // placeholder
    document.getElementById("healthScore").innerHTML = `${healthScore}% <span class="increase">▲${Math.floor(Math.random()*10)}%</span>`;

    // Total Items
    document.getElementById("totalItems").innerText = pantry.length;

    // Expiry Alerts
    const now = new Date();
    const alerts = pantry.filter(item => (new Date(item.expiryDate) - now)/86400000 < 5);
    document.getElementById("expiryAlert").innerText = alerts.length;

    // Monthly Savings (placeholder)
    let savings = pantry.length * 50;
    document.getElementById("monthlySavings").innerText = `₹${savings}`;

    // Expiry Table
    const tbody = document.getElementById("expiryTable");
    tbody.innerHTML = "";
    pantry.sort((a,b)=> new Date(a.expiryDate)-new Date(b.expiryDate)).forEach(item=>{
        let daysLeft = Math.ceil((new Date(item.expiryDate)-now)/86400000);
        let status = daysLeft <= 2 ? "Critical" : daysLeft <= 5 ? "Warning" : "Good";
        tbody.innerHTML += `<tr>
            <td>${item.name}</td>
            <td>${daysLeft} Days</td>
            <td>${status}</td>
            <td><button onclick="alert('Find Recipe for ${item.name}')">Find Recipe</button></td>
        </tr>`;
    });

    // Quick Tip
    document.getElementById("quickTip").innerText = "Cook Dal Baati today to use up your oldest Besan & Moong Dal stock!";
}

/* ================= UI ================= */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";
}

function logout() {
    currentUserId = null;
    document.getElementById("app").style.display = "none";
    showLogin();
}

function openBot() {
    window.open("bot.html", "_blank");
}
