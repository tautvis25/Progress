const API_URL = "/feature/todo"; 

const daysList = document.getElementById('cal-days');
const monthHeader = document.getElementById('month-name');
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
let centerDate = new Date();

function renderDays(center) {
    monthHeader.textContent = monthNames[center.getMonth()];
    daysList.innerHTML = '';

    let li = document.createElement('li');
    const leftBtn = document.createElement('button');
    leftBtn.textContent = "🡸";
    leftBtn.addEventListener('click', () => { centerDate.setDate(centerDate.getDate() - 1); renderDays(centerDate); });
    li.appendChild(leftBtn);
    daysList.appendChild(li);

    for (let i = -3; i <= 3; i++) {
        const tempDate = new Date(center);
        tempDate.setDate(center.getDate() + i);

        li = document.createElement('li');
        const dayBtn = document.createElement('button');
        dayBtn.textContent = tempDate.getDate();
        if (i === 0) dayBtn.classList.add('selected');
        dayBtn.addEventListener('click', () => { centerDate = tempDate; renderDays(centerDate); });

        li.appendChild(dayBtn);
        daysList.appendChild(li);
    }

    li = document.createElement('li');
    const rightBtn = document.createElement('button');
    rightBtn.textContent = "🡺";
    rightBtn.addEventListener('click', () => { centerDate.setDate(centerDate.getDate() + 1); renderDays(centerDate); });
    li.appendChild(rightBtn);
    daysList.appendChild(li);
}

renderDays(centerDate);

const addBtn = document.getElementById('addTaskBtn');
const newTaskInput = document.getElementById('newTask');
const todoList = document.querySelector('.todo-list');

async function fetchWithToken(url, options = {}) {
    let token = localStorage.getItem("accessToken");
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${token}`;

    options.credentials = "include";  

    let res = await fetch(url, options);

    if (res.status === 403 || res.status === 401) { 
        const refreshRes = await fetch("/auth/refresh", {
            method: "POST",
            credentials: "include"  
        });

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

async function fetchTodos() {
    try {
        const res = await fetchWithToken(API_URL + "/");
        if (!res.ok) {
            const err = await res.json();
            console.error("Failed to fetch todos:", err);
            return;
        }
        const todos = await res.json();
        todoList.innerHTML = '';
        todos.forEach(todo => addTodoToDOM(todo));
        updateProgressBar();
    } catch (err) {
        console.error("Error fetching todos:", err);
    }
}

function addTodoToDOM(todo) {
    const li = document.createElement('li');
    const textSpan = document.createElement('span');
    textSpan.textContent = todo.content;
    if (todo.completed) li.classList.add('completed');
    li.appendChild(textSpan);

    const completeBtn = document.createElement('button');
    completeBtn.textContent = '✔';
    completeBtn.addEventListener('click', async () => {
        li.classList.toggle('completed');
        await fetchWithToken(`${API_URL}/${todo.id}`, {
            method: 'PUT',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: li.classList.contains('completed') })
        });
        updateProgressBar();
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = '✖';
    delBtn.addEventListener('click', async () => {
        await fetchWithToken(`${API_URL}/${todo.id}`, { method: 'DELETE' });
        li.remove();
        updateProgressBar();
    });

    li.appendChild(completeBtn);
    li.appendChild(delBtn);
    todoList.appendChild(li);
}

addBtn.addEventListener('click', async () => {
    const taskText = newTaskInput.value.trim();
    if (!taskText) return;

    const res = await fetchWithToken(API_URL + "/", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: taskText })
    });
    if (!res.ok) return;
    const newTodo = await res.json();
    addTodoToDOM(newTodo);
    newTaskInput.value = '';
    updateProgressBar();
});

newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBtn.click();
});

function updateProgressBar() {
    const totalTasks = todoList.children.length;
    const completedTasks = todoList.querySelectorAll('li.completed').length;
    const progressPercent = totalTasks ? (completedTasks / totalTasks) * 100 : 0;

    const progressFill = document.querySelector('.progress-bar-fill');
    if (!progressFill) return;

    progressFill.style.width = progressPercent + '%';

    if (progressPercent < 30) {
        progressFill.style.backgroundColor = '#d68966'; 
    } else if (progressPercent < 60) {
        progressFill.style.backgroundColor = '#cfca7e'; 
    } else if (progressPercent < 80) {
        progressFill.style.backgroundColor = '#69a347'; 
    } else {
        progressFill.style.backgroundColor = '#3e7a2f'; 
    }
}

const logoutLink = document.getElementById("logout-link");

logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
        const res = await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        if (res.ok) {
            localStorage.removeItem("accessToken");

            window.location.href = "/main.html";
        } else {
            alert("Logout failed. Please try again.");
        }
    } catch (err) {
        console.error("Logout error:", err);
        alert("Logout failed. Please try again.");
    }
});


fetchTodos();
