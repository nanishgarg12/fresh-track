let currentUserId = null;
let pantry = [];
let shoppingList = [];

console.log("✅ Frontend script loaded");

/* ================= AUTH ================= */
function showRegister() {
    loginPage.style.display = "none";
    registerPage.style.display = "block";
}

function showLogin() {
    registerPage.style.display = "none";
    loginPage.style.display = "block";
}

async function createUser() {
    const username = newUsername.value;
    const password = newPassword.value;
    const role = roleSelect.value || role.value;

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    registerMsg.innerText = data.message || data.error;
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.error) {
        loginError.innerText = data.error;
        return;
    }

    currentUserId = data.userId;

    loginPage.style.display = "none";
    registerPage.style.display = "none";
    app.style.display = "block";

    loadItems();
}

/* ================= PANTRY ================= */
async function addItem() {
    const item = {
        userId: currentUserId,
        name: itemName.value,
        category: category.value,
        batchNumber: batchNumber.value,
        quantity: Number(quantity.value),
        purchaseDate: purchaseDate.value,
        expiryDate: expiryDate.value
    };

    await fetch("/api/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
    });

    addMsg.innerText = "Item added!";
    loadItems();
}

async function loadItems() {
    const res = await fetch(`/api/items/${currentUserId}`);
    pantry = await res.json();
    renderDashboard();
    renderInventory();
}

/* ================= INVENTORY ================= */
function renderInventory() {
    const table = document.getElementById("inventoryTable");
    if (!table) return;

    table.innerHTML = "";

    pantry.forEach(item => {
        table.innerHTML += `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.expiryDate}</td>
            <td>
                <button onclick="useItem('${item._id}')">Use 1</button>
            </td>
        </tr>`;
    });
}

async function useItem(itemId) {
    await fetch(`/api/item/use/${itemId}`, {
        method: "PUT"
    });
    loadItems();
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
    const now = new Date();

    // Health Score (temporary logic)
    const healthScore = Math.min(100, 80 + pantry.length);
    healthScoreEl.innerHTML = `${healthScore}% <span class="increase">▲5%</span>`;

    totalItems.innerText = pantry.length;

    const alerts = pantry.filter(
        i => (new Date(i.expiryDate) - now) / 86400000 < 5
    );
    expiryAlert.innerText = alerts.length;

    monthlySavings.innerText = `₹${pantry.length * 50}`;

    expiryTable.innerHTML = "";
    pantry
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
        .forEach(item => {
            const daysLeft = Math.ceil(
                (new Date(item.expiryDate) - now) / 86400000
            );
            const status =
                daysLeft <= 2 ? "Critical" :
                daysLeft <= 5 ? "Warning" : "Good";

            expiryTable.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${daysLeft} Days</td>
                <td>${status}</td>
                <td>
                    <button onclick="alert('Recipe suggestion for ${item.name}')">
                        Find Recipe
                    </button>
                </td>
            </tr>`;
        });

    quickTip.innerText = "Use the oldest stock first (FIFO) to avoid waste!";
}

/* ================= SHOPPING LIST ================= */
function scanItem() {
    const input = document.getElementById("scanInput").value.toLowerCase();
    if (!input) return;

    document.getElementById("scanInput").value = "";

    const existing = pantry.find(
        item => item.name.toLowerCase() === input
    );

    if (existing) {
        alert(`Item already exists. Quantity: ${existing.quantity}`);
        return;
    }

    if (!shoppingList.includes(input)) {
        shoppingList.push(input);
        renderShoppingList();
    }
}

function renderShoppingList() {
    const list = document.getElementById("shoppingList");
    if (!list) return;

    list.innerHTML = "";
    shoppingList.forEach(item => {
        list.innerHTML += `<li>${item}</li>`;
    });
}

/* ================= UI ================= */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";
}

function logout() {
    currentUserId = null;
    app.style.display = "none";
    showLogin();
}

function openBot() {
    window.open("bot.html", "_blank");
}
