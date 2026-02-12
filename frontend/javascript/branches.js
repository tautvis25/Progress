const API_URL = "/feature/branches";

const editor = document.getElementById("editor");
const canvas = document.getElementById("canvas");
const svg = document.getElementById("connections");

const addBtn = document.getElementById("add");
const removeBtn = document.getElementById("remove");
const roleBtn = document.getElementById("role");
const nameInput = document.getElementById("nameInput");
const logoutLink = document.getElementById("logout-link");

let branches = [];
let currentBranchId = null;
let nodes = [];
let connections = [];
let nodeMap = new Map();
let selected = null;
let dragging = null;
let offsetX = 0;
let offsetY = 0;

async function fetchWithToken(url, options = {}) {
    let token = localStorage.getItem("accessToken");
    options.headers = options.headers || {};
    if (token) options.headers["Authorization"] = `Bearer ${token}`;
    options.credentials = "include";

    let res = await fetch(url, options);

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
    nodeMap = new Map(nodes.map(n => [n.id, n]));

    connections = await connectionsRes.json();

    selected = null;
    updateUI();
    render();
}

function updateUI() {
    const node = selected !== null ? nodeMap.get(selected) : null;

    addBtn.disabled = !node;
    removeBtn.disabled = !node;
    roleBtn.disabled = !node;
    nameInput.disabled = !node;

    if (node) {
        nameInput.value = node.name;
        roleBtn.textContent = node.role === "link" ? "Set Root" : "Set Link";
    } else {
        nameInput.value = "";
        roleBtn.textContent = "Set Role";
    }
}

function render() {
    canvas.querySelectorAll(".node").forEach(n => n.remove());
    renderConnections();

    nodes.forEach(n => {
        const el = document.createElement("div");
        el.className = `node ${n.role || "root"}` + (selected === n.id ? " selected" : "");
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

function renderConnections() {
    svg.innerHTML = "";
    connections.forEach(c => {
        const a = nodeMap.get(c.from_node_id);
        const b = nodeMap.get(c.to_node_id);
        if (!a || !b) return;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
            "d",
            `M ${a.x + 70} ${a.y + 25} C ${a.x + 140} ${a.y + 25}, ${b.x - 70} ${b.y + 25}, ${b.x} ${b.y + 25}`
        );
        path.setAttribute("stroke", "#695847");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        svg.appendChild(path);
    });
}

canvas.addEventListener("mousemove", e => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    dragging.x = e.clientX - rect.left + editor.scrollLeft - offsetX;
    dragging.y = e.clientY - rect.top + editor.scrollTop - offsetY;

    const el = canvas.querySelector(`[data-id='${dragging.id}']`);
    if (el) el.style.transform = `translate(${dragging.x}px, ${dragging.y}px)`;

    renderConnections();
});

document.addEventListener("mouseup", async () => {
    if (dragging) {
        const node = nodeMap.get(dragging.id);
        if (node) {
            node.x = Number(dragging.x);
            node.y = Number(dragging.y);

            try {
                await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ x: node.x, y: node.y })
                });
            } catch (err) {
                console.error("Failed to save node position:", err);
            }
        }
    }
    dragging = null;
});

canvas.addEventListener("click", () => {
    selected = null;
    updateUI();
    render();
});

addBtn.onclick = async () => {
    const parent = nodeMap.get(selected);
    if (!parent) return;

    const offset = 100 + connections.filter(c => c.from_node_id === parent.id).length * 80;
    const node = { name: "Node", x: parent.x + 220, y: parent.y + offset, role: "root" };

    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node)
    });

    if (!res.ok) return alert("Failed to add node.");
    const newNode = await res.json();
    nodes.push(newNode);
    nodeMap.set(newNode.id, newNode);

    const connRes = await fetchWithToken(`${API_URL}/${currentBranchId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: parent.id, to: newNode.id })
    });
    if (!connRes.ok) return alert("Failed to add connection.");
    connections.push({ from_node_id: parent.id, to_node_id: newNode.id });

    render();
};

removeBtn.onclick = async () => {
    const node = nodeMap.get(selected);
    if (!node) return;

    const res = await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to remove node.");

    nodes = nodes.filter(n => n.id !== selected);
    nodeMap.delete(selected);
    connections = connections.filter(c => c.from_node_id !== selected && c.to_node_id !== selected);

    selected = null;
    updateUI();
    render();
};

roleBtn.onclick = async () => {
    const node = nodeMap.get(selected);
    if (!node) return;

    node.role = node.role === "link" ? "root" : "link";

    try {
        await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: node.role })
        });
    } catch (err) {
        console.error("Failed to save node role:", err);
    }

    updateUI();
    render();
};

nameInput.onchange = async () => {
    const node = nodeMap.get(selected);
    if (!node) return;

    node.name = String(nameInput.value);

    try {
        await fetchWithToken(`${API_URL}/${currentBranchId}/nodes/${node.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: node.name })
        });
    } catch (err) {
        console.error("Failed to save node name:", err);
    }

    render();
};

fetchBranches();
updateUI();
render();
