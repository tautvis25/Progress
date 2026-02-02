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

addBtn.addEventListener('click', () => {
  const taskText = newTaskInput.value.trim();
  if (!taskText) return;

  const li = document.createElement('li');
  const textSpan = document.createElement('span');
  textSpan.textContent = taskText;
  li.appendChild(textSpan);

  const completeBtn = document.createElement('button');
  completeBtn.textContent = '✔';
  completeBtn.addEventListener('click', () => li.classList.toggle('completed'));

  const delBtn = document.createElement('button');
  delBtn.textContent = '✖';
  delBtn.addEventListener('click', () => li.remove());

  li.appendChild(completeBtn);
  li.appendChild(delBtn);

  todoList.appendChild(li);
  newTaskInput.value = '';
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
  } else if (progressPercent < 0) {
    progressFill.style.backgroundColor = '#cfca7e'; 
  } else if (progressPercent < 80) {
    progressFill.style.backgroundColor = '#69a347'; 
  } else {
    progressFill.style.backgroundColor = '#3e7a2f'; 
  }
}

todoList.addEventListener('click', () => updateProgressBar());
addBtn.addEventListener('click', () => updateProgressBar());

