const API = window.location.origin;
let currentUserId = null;
let pantry = [];
let shopping = [];

function showRegister(){ loginPage.classList.add("hidden"); registerPage.classList.remove("hidden"); }
function showLogin(){ registerPage.classList.add("hidden"); loginPage.classList.remove("hidden"); }

async function login(){
  const res = await fetch(`${API}/api/login`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:username.value,password:password.value})
  });
  const data = await res.json();
  if(!res.ok){ loginError.innerText=data.error; return; }
  currentUserId=data.userId;
  welcomeUser.innerText=username.value;
  loginPage.classList.add("hidden");
  app.classList.remove("hidden");
  loadItems();
}

async function createUser(){
  const res = await fetch(`${API}/api/register`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:newUsername.value,password:newPassword.value,role:role.value})
  });
  const data=await res.json();
  registerMsg.innerText=data.message||data.error;
}

function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function addItem(){
  await fetch(`${API}/api/item`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      userId:currentUserId,
      name:itemName.value,
      category:category.value,
      batchNumber:batchNumber.value,
      quantity:+quantity.value,
      purchaseDate:purchaseDate.value,
      expiryDate:expiryDate.value
    })
  });
  addMsg.innerText="Item added!";
  loadItems();
}

async function loadItems(){
  const res=await fetch(`${API}/api/items/${currentUserId}`);
  pantry=await res.json();
  renderHome();
  renderInventory();
}

function renderHome(){
  totalItems.innerText=pantry.length;
  expiryCount.innerText=pantry.filter(i=>new Date(i.expiryDate)-Date.now()<5*86400000).length;
}

function renderInventory(){
  inventoryTable.innerHTML="";
  pantry.forEach(i=>{
    inventoryTable.innerHTML+=`
    <tr>
      <td>${i.name}</td>
      <td>${i.quantity}</td>
      <td>${new Date(i.expiryDate).toLocaleDateString()}</td>
      <td><button onclick="useItem('${i._id}')">Use</button></td>
    </tr>`;
  });
}

async function useItem(id){
  await fetch(`${API}/api/item/use/${id}`,{method:"PUT"});
  loadItems();
}

/* ===== Scanner ===== */
function startScanner(){
  scanner.classList.remove("hidden");
  Quagga.init({
    inputStream:{name:"Live",type:"LiveStream",target:scanner},
    decoder:{readers:["code_128_reader","ean_reader"]}
  },()=>Quagga.start());

  Quagga.onDetected(d=>{
    scanInput.value=d.codeResult.code;
    Quagga.stop();
    scanner.classList.add("hidden");
  });
}

function addToShopping(){
  const name=scanInput.value.trim();
  if(!name) return;
  const exists=pantry.find(p=>p.name.toLowerCase()===name.toLowerCase());
  if(exists){ alert(`Already in pantry (Qty: ${exists.quantity})`); return; }
  if(!shopping.includes(name)){
    shopping.push(name);
    shoppingList.innerHTML+=`<li>${name}</li>`;
  }
  scanInput.value="";
}

function logout(){ location.reload(); }
