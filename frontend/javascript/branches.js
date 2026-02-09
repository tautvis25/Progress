const API_URL = "/feature/branches";

const editor = document.getElementById("editor");
const canvas = document.getElementById("canvas");
const svg = document.getElementById("connections");

const addBtn = document.getElementById("add");
const removeBtn = document.getElementById("remove");
const gotoBtn = document.getElementById("goto");
const nameInput = document.getElementById("nameInput");
const logoutLink = document.getElementById("logout-link");

let branches = [];
let currentBranchId = null;
let nodes = [];
let connections = [];
let selected = null;
let dragging = null;
let offsetX = 0;
let offsetY = 0;

// ------------------- Auth Fetch -------------------
async function fetchWithToken(url, options = {}) {
    let token = localStorage.getItem("accessToken");
    options.headers = options.headers || {};
    if (token) options.headers["Authorization"] = `Bearer ${token}`;
    options.credentials = "include";

    let res = await fetch(url, options);

    // if token expired or missing, try refresh
    if ((res.status === 401 || res.status === 403) && token) {
        const refreshRes = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("accessToken", data.accessToken);
            options.headers["Authorization"] = `Bearer ${data.accessToken}`;
            res = await fetch(url, options);
        } else {
            window.location.href = "/login.html";
            return;
        }
    }

    return res;
}


// ------------------- Logout -------------------
logoutLink.addEventListener("click", async e => {
    e.preventDefault();
    try {
        const res = await fetch("/auth/logout", { method: "POST", credentials: "include" });
        if (res.ok) {
            localStorage.removeItem("accessToken");
            window.location.href = "/main.html";
        } else alert("Logout failed.");
    } catch (err) {
        console.error(err);
        alert("Logout failed.");
    }
});

// ------------------- Branches -------------------
async function fetchBranches() {
    const res = await fetchWithToken(`${API_URL}/`);
    if (!res.ok) return alert("Failed to load branches.");
    branches = await res.json();
    if (branches.length > 0) selectBranch(branches[0].id);
}

async function selectBranch(branchId) {
    currentBranchId = branchId;

    const nodesRes = await fetchWithToken(`${API_URL}/${branchId}/nodes`);
    const connectionsRes = await fetchWithToken(`${API_URL}/${branchId}/connections`);

    if (!nodesRes.ok || !connectionsRes.ok) return alert("Failed to load branch data.");

    nodes = await nodesRes.json();
    connections = await connectionsRes.json().then(list => list.map(c => ({ from: c.from_node_id, to: c.to_node_id })));


    selected = null;
    updateUI();
    render();
}

// ------------------- UI -------------------
function updateUI() {
    const active = selected !== null;
    addBtn.disabled = !active;
    removeBtn.disabled = !active || nodes.find(n => n.id === selected)?.id === 0;
    gotoBtn.disabled = !active;
    nameInput.disabled = !active;

    if (active) {
        const n = nodes.find(n => n.id === selected);
        nameInput.value = n.name;
    } else nameInput.value = "";
}

function render() {
    canvas.querySelectorAll(".node").forEach(n => n.remove());
    svg.innerHTML = "";

    connections.forEach(c => {
        const a = nodes.find(n => n.id === c.from);
        const b = nodes.find(n => n.id === c.to);
        if (!a || !b) return;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${a.x + 140} ${a.y + 25} C ${a.x + 220} ${a.y + 25}, ${b.x - 80} ${b.y + 25}, ${b.x} ${b.y + 25}`);
        path.setAttribute("stroke", "#695847");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        svg.appendChild(path);
    });

    nodes.forEach(n => {
        const el = document.createElement("div");
        el.className = "node" + (selected === n.id ? " selected" : "");
        el.textContent = n.name;
        el.style.transform = `translate(${n.x}px, ${n.y}px)`;
        el.dataset.id = n.id;
        canvas.appendChild(el);

        el.addEventListener("mousedown", e => {
            dragging = n;
            const rect = canvas.getBoundingClientRect();
            offsetX = e.clientX - rect.left - n.x + editor.scrollLeft;
            offsetY = e.clientY - rect.top - n.y + editor.scrollTop;
        });

        el.addEventListener("click", e => {
            e.stopPropagation();
            selected = n.id;
            updateUI();
            render();
        });
    });
}

// ------------------- Node CRUD -------------------
canvas.addEventListener("mousemove", e => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    dragging.x = e.clientX - rect.left + editor.scrollLeft - offsetX;
    dragging.y = e.clientY - rect.top + editor.scrollTop - offsetY;
    render();
});

document.addEventListener("mouseup", () => {
    if (dragging) saveNodePosition(dragging);
    dragging = null;
});

canvas.addEventListener("click", () => {
    selected = null;
    updateUI();
    render();
});

addBtn.onclick = async () => {
    const parent = nodes.find(n => n.id === selected);
    if (!parent) return;

    const node = { name: "Node", x: parent.x + 220, y: parent.y + connections.filter(c => c.from === parent.id).length * 80 };

    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node)
    });

    if (!res.ok) return alert("Failed to add node.");
    const newNode = await res.json();
    nodes.push(newNode);

    const connRes = await fetchWithToken(`${API_URL}/${currentBranchId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: parent.id, to: newNode.id })
    });
    if (!connRes.ok) return alert("Failed to add connection.");
    connections.push({ from: parent.id, to: newNode.id });

    render();
};

removeBtn.onclick = async () => {
    const node = nodes.find(n => n.id === selected);
    if (!node) return;

    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to remove node.");

    // remove node and its connections
    nodes = nodes.filter(n => n.id !== selected);
    connections = connections.filter(c => c.from !== selected && c.to !== selected);

    selected = null;
    updateUI();
    render();
};

nameInput.oninput = async () => {
    const node = nodes.find(n => n.id === selected);
    if (!node) return;

    node.name = nameInput.value;
    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: node.name })
    });

    if (!res.ok) console.error("Failed to update node name.");
    render();
};

async function saveNodePosition(node) {
    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: node.x, y: node.y })
    });
    if (!res.ok) console.error("Failed to save node position.");
}

fetchBranches();
updateUI();
render();
