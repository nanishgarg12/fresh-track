const API = window.location.origin;
let currentUserId = null;
let pantry = [];
let shopping = [];
let notifyWindowDays = 3;
let browserNotificationsEnabled = false;

function daysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / 86400000);
}

function getExpiringItems(withinDays) {
    return pantry.filter(item => {
        const daysLeft = daysUntilExpiry(item.expiryDate);
        return daysLeft >= 0 && daysLeft <= withinDays;
    });
}

function getNotificationStorageKey(itemId, todayKey) {
    return `freshtrack_notify_${currentUserId}_${itemId}_${todayKey}`;
}

function updatePermissionLabel() {
    const permissionEl = document.getElementById("notifyPermission");
    if (!permissionEl) return;

    if (!("Notification" in window)) {
        permissionEl.innerText = "This browser does not support notifications.";
        return;
    }

    if (Notification.permission === "granted") {
        permissionEl.innerText = "Browser notifications are enabled.";
        return;
    }

    if (Notification.permission === "denied") {
        permissionEl.innerText = "Notifications are blocked in browser settings.";
        return;
    }

    permissionEl.innerText = "Browser notifications are not enabled yet.";
}

function renderExpiryAlerts() {
    const alertsList = document.getElementById("expiryAlertsList");
    if (!alertsList) return;

    const expiringItems = getExpiringItems(notifyWindowDays)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    if (expiringItems.length === 0) {
        alertsList.innerHTML = `<li class="expiry-alert-item ok">No items are expiring in the next ${notifyWindowDays} day(s).</li>`;
        return;
    }

    alertsList.innerHTML = expiringItems.map(item => {
        const daysLeft = daysUntilExpiry(item.expiryDate);
        const urgency = daysLeft === 0 ? "today" : `in ${daysLeft} day(s)`;
        return `<li class="expiry-alert-item warn"><strong>${item.name}</strong> expires ${urgency}.</li>`;
    }).join("");
}

function pushExpiryBrowserNotifications() {
    if (!browserNotificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const expiringItems = getExpiringItems(notifyWindowDays);

    expiringItems.forEach(item => {
        const daysLeft = daysUntilExpiry(item.expiryDate);
        const notificationKey = getNotificationStorageKey(item._id, todayKey);
        const alreadyNotified = localStorage.getItem(notificationKey);
        if (alreadyNotified) return;

        const body = daysLeft === 0
            ? `${item.name} expires today.`
            : `${item.name} will expire in ${daysLeft} day(s).`;

        new Notification("FreshTrack Expiry Alert", { body });
        localStorage.setItem(notificationKey, "1");
    });
}

function setupNotificationControls() {
    const notifyDaysInput = document.getElementById("notifyDays");
    const enableButton = document.getElementById("enableNotifyBtn");

    if (notifyDaysInput) {
        notifyDaysInput.value = String(notifyWindowDays);
        notifyDaysInput.addEventListener("change", () => {
            const nextValue = parseInt(notifyDaysInput.value, 10);
            notifyWindowDays = Number.isFinite(nextValue) && nextValue > 0 ? Math.min(nextValue, 30) : 3;
            notifyDaysInput.value = String(notifyWindowDays);
            renderHome();
            renderExpiryAlerts();
            pushExpiryBrowserNotifications();
        });
    }

    if (enableButton) {
        enableButton.addEventListener("click", async () => {
            if (!("Notification" in window)) {
                alert("This browser does not support notifications.");
                return;
            }

            const permission = await Notification.requestPermission();
            browserNotificationsEnabled = permission === "granted";
            updatePermissionLabel();
            pushExpiryBrowserNotifications();
        });
    }

    if ("Notification" in window) {
        browserNotificationsEnabled = Notification.permission === "granted";
    }
    updatePermissionLabel();
}

// --- Page Navigation ---
function showRegister() { 
    document.getElementById("loginPage").classList.add("hidden"); 
    document.getElementById("registerPage").classList.remove("hidden"); 
}

function showLogin() { 
    document.getElementById("registerPage").classList.add("hidden"); 
    document.getElementById("loginPage").classList.remove("hidden"); 
}

function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    
    const targetPage = document.getElementById(id);
    if (targetPage) targetPage.classList.remove("hidden");

    // UI Feedback: Highlight active sidebar button
    const buttons = document.querySelectorAll('.nav-item');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${id}'`)) {
            btn.classList.add("active");
        }
    });
}

// --- Authentication ---
async function login() {
    const userInp = document.getElementById("username").value;
    const passInp = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");

    try {
        const res = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userInp, password: passInp })
        });
        const data = await res.json();

        if (!res.ok) { errorEl.innerText = data.error; return; }

        currentUserId = data.userId;
        document.getElementById("welcomeUser").innerText = userInp;
        document.getElementById("authContainer").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        
        loadItems();
    } catch (err) {
        errorEl.innerText = "Connection failed. Check if server is running.";
    }
}

// --- Updated Registration ---
async function createUser() {
    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const password = document.getElementById("newPassword").value.trim();
    const role = document.getElementById("role").value;

    if (!username || !email || !password) {
        alert("Please fill all fields.");
        return;
    }

    try {
        const res = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                role
            })
        });

        const data = await res.json();
        alert(data.message || data.error);

        if (res.ok) {
            showLogin();
            document.getElementById("newUsername").value = "";
            document.getElementById("newEmail").value = "";
            document.getElementById("newPassword").value = "";
        }

    } catch (err) {
        alert("Registration failed. Server error.");
    }
}
// --- Pantry Management (FIFO Logic) ---
async function loadItems() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API}/api/items/${currentUserId}`);
        pantry = await res.json();
        
        // FIFO Sort: Items expiring soonest appear at the top
        pantry.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        
        renderHome();
        renderInventory();
        renderExpiryAlerts();
        pushExpiryBrowserNotifications();
    } catch (err) {
        console.error("Error loading pantry:", err);
    }
}

async function addItem() {
    const itemData = {
        userId: currentUserId,
        name: document.getElementById("itemName").value,
        category: document.getElementById("category").value,
        quantity: parseInt(document.getElementById("quantity").value) || 1,
        expiryDate: document.getElementById("expiryDate").value,
        batchNumber: document.getElementById("batchNumber").value || "N/A"
    };

    if (!itemData.name || !itemData.expiryDate) {
        alert("Please provide at least a name and expiry date.");
        return;
    }

    const res = await fetch(`${API}/api/item`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
    });

    if (res.ok) {
        alert("Item saved!");
        loadItems();
        showPage('inventory');
        // Clear fields
        document.getElementById("itemName").value = "";
    }
}

function renderHome() {
    document.getElementById("totalItems").innerText = pantry.length;
    const soonCount = getExpiringItems(notifyWindowDays).length;
    document.getElementById("expiryCount").innerText = soonCount;
}

function renderInventory() {
    const table = document.getElementById("inventoryTable");
    if (!table) return;
    table.innerHTML = "";

    pantry.forEach(i => {
        const expiry = new Date(i.expiryDate);
        const diffDays = Math.ceil((expiry - Date.now()) / (86400000));
        
        let statusClass = "status-safe";
        let statusText = "Good";

        if (diffDays <= 0) { 
            statusClass = "status-expired"; 
            statusText = "Expired"; 
        } else if (diffDays <= 3) { 
            statusClass = "status-warning"; 
            statusText = "Urgent"; 
        }

        table.innerHTML += `
            <tr class="${statusClass}">
                <td><span class="badge">${statusText}</span></td>
                <td><strong>${i.name}</strong><br><small>${i.category || 'General'}</small></td>
                <td>${i.quantity}</td>
                <td>${expiry.toLocaleDateString()}</td>
                <td>
                    <button class="btn-use" onclick="useItem('${i._id}')">Use</button>
                </td>
            </tr>`;
    });
}

async function useItem(id) {
    await fetch(`${API}/api/item/use/${id}`, { method: "PUT" });
    loadItems();
}

// --- 🤖 AI Assistant (Medicines & Emergencies) ---

function toggleAI() {
    const drawer = document.getElementById("aiChat");
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) {
        document.getElementById("userInput").focus();
    }
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const chatBox = document.getElementById("chatBox");
    const query = input.value.trim();
    if(!query) return;

    // Add User Message
    chatBox.innerHTML += `<div class="msg user">${query}</div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Bot Response Logic
    const botMsgDiv = document.createElement("div");
    botMsgDiv.className = "msg bot";
    botMsgDiv.innerText = "Checking records...";
    chatBox.appendChild(botMsgDiv);

    // AI Context: Search pantry for relevant items
    setTimeout(() => {
        let response = "I'm not sure about that. Can you rephrase?";
        const lowQuery = query.toLowerCase();

        if (lowQuery.includes("medicine") || lowQuery.includes("health")) {
            const meds = pantry.filter(i => i.category === "Medicine");
            response = meds.length > 0 
                ? `You have ${meds.length} medical items. The nearest expiry is ${meds[0].name}.` 
                : "I don't see any medicines in your inventory yet.";
        } else if (lowQuery.includes("emergency")) {
            response = "For emergencies, ensure your 'Emergency Supply' category is stocked with water and non-perishables.";
        } else if (lowQuery.includes("expir")) {
            const urgent = pantry.filter(i => (new Date(i.expiryDate) - Date.now()) < 3*86400000);
            response = urgent.length > 0 
                ? `Warning: ${urgent[0].name} is expiring very soon!` 
                : "Everything looks fresh! No immediate expiries.";
        }

        botMsgDiv.innerText = response;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 800);
}

// --- 📷 OCR & Barcode Features ---

async function startOCR() {
    const video = document.getElementById('video');
    const view = document.getElementById('cameraView');
    const status = document.getElementById('scanStatus');
    
    view.classList.remove('hidden');
    status.innerText = "Starting Lens...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;

        const ocrInterval = setInterval(async () => {
            if (view.classList.contains('hidden')) {
                clearInterval(ocrInterval);
                return;
            }

            const canvas = document.getElementById('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            status.innerText = "Reading Text... 🔍";
            
            const result = await Tesseract.recognize(canvas, 'eng');
            const text = result.data.text.trim();

            if (text.length > 3) {
                const cleaned = text.split('\n')[0].replace(/[^a-zA-Z ]/g, "");
                document.getElementById('itemName').value = cleaned;
                status.innerText = "Item Detected!";
                setTimeout(stopCamera, 1000);
                clearInterval(ocrInterval);
            }
        }, 2800);
    } catch (err) {
        status.innerText = "Camera error: " + err.message;
    }
}

function startScanner() {
    const video = document.getElementById('video');
    const view = document.getElementById('cameraView');
    view.classList.remove("hidden");
    
    Quagga.init({
        inputStream: { name: "Live", type: "LiveStream", target: video },
        decoder: { readers: ["code_128_reader", "ean_reader", "upc_reader"] }
    }, (err) => {
        if (err) { alert("Barcode Error: " + err); return; }
        Quagga.start();
    });

    Quagga.onDetected(d => {
        document.getElementById("itemName").value = "SKU: " + d.codeResult.code;
        Quagga.stop();
        stopCamera();
    });
}

function stopCamera() {
    const video = document.getElementById('video');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cameraView').classList.add('hidden');
}

// --- Shopping List ---
function addToShopping() {
    const input = document.getElementById("scanInput");
    const val = input.value.trim();
    if (!val) return;

    shopping.push(val);
    const list = document.getElementById("shoppingList");
    list.innerHTML += `<li><i class="fas fa-shopping-basket"></i> ${val}</li>`;
    input.value = "";
}

function logout() { location.reload(); }

// Listen for Enter Key in Chat
document.addEventListener('DOMContentLoaded', () => {
    setupNotificationControls();
    const userInp = document.getElementById("userInput");
    if(userInp) {
        userInp.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }
});
