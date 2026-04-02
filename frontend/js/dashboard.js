// ==================== GLOBAL VARIABLES ====================
let totalXP = localStorage.getItem("xp") 
  ? parseInt(localStorage.getItem("xp")) 
  : 0;

// ==================== HELPER FUNCTIONS ====================
function moveToAchievements(taskText) {
  if (!taskText) return;

  // Hide default achievements
  const defaultAch = document.getElementById("defaultAchievements");
  if (defaultAch) defaultAch.style.display = "none";

  const completedBox = document.getElementById("completedTasksBox");
  if (!completedBox) return;

  const item = document.createElement("div");
  item.className = "achievement-item";

  item.innerHTML = `
    <div class="ach-icon">✅</div>
    <div class="ach-info">
      <div class="ach-name">${taskText}</div>
      <div class="ach-desc">Task completed • +10 XP</div>
    </div>
    <span class="ach-badge">DONE</span>
  `;

  completedBox.prepend(item);   // newest on top
}

// ==================== COMPLETE TASK ====================
window.completeTask = async function (taskId, taskTitle) {
  try {
    const res = await fetch("http://127.0.0.1:5501/api/task/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: taskId })
    });

    if (!res.ok) throw new Error("Failed to complete task");

    const data = await res.json();

    // Move to achievements
    moveToAchievements(taskTitle || "Task");

    // Update XP
    totalXP += data.xpGained || 10;
    document.getElementById("xpValue").innerText = totalXP;
    localStorage.setItem("xp", totalXP);

    // Refresh task list
    loadTasks();

    // Optional: nice notification
    // alert("✅ Task completed! +" + (data.xpGained || 10) + " XP");

  } catch (error) {
    console.error("Complete task error:", error);
    alert("Error completing task. Please try again.");
  }
};

// ==================== ADD TASK ====================
async function addTask() {
  const input = document.getElementById("taskInput");
  const title = input.value.trim();

  if (!title) {
    alert("Please enter a task");
    return;
  }

  try {
    await fetch("http://127.0.0.1:5501/api/task/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: 1,
        title: title,
        xp: 10
      })
    });

    input.value = "";
    loadTasks();        // refresh list

  } catch (error) {
    console.error("Add task error:", error);
    alert("Failed to add task");
  }
}

// ==================== LOAD TASKS ====================
async function loadTasks() {
  try {
    const res = await fetch("http://127.0.0.1:5501/api/task/1");
    if (!res.ok) throw new Error("Failed to load tasks");

    const data = await res.json();

    const taskContainer = document.getElementById("taskCards");
    if (!taskContainer) return;

    taskContainer.innerHTML = "";   // clear previous

    if (!data.tasks || data.tasks.length === 0) {
      taskContainer.innerHTML = `
        <div class="stat-card" style="text-align:center; grid-column: 1 / -1;">
          <span class="card-icon">📋</span>
          <div style="margin:15px 0 8px; color:#6b7fa3;">No tasks yet</div>
          <div style="font-size:0.9rem;color:#6b7fa3;">Add some tasks above ↑</div>
        </div>
      `;
      return;
    }

    data.tasks.forEach(task => {
      const taskCard = document.createElement("div");
      taskCard.className = "stat-card";
      taskCard.style.padding = "20px";

      taskCard.innerHTML = `
        <span class="card-icon">📌</span>
        <div class="card-label">TASK</div>
        <div style="font-size:1.05rem; margin:10px 0; line-height:1.4;">
          ${task.title}
        </div>
        ${task.completed 
          ? `<span style="color:#00e5a0;font-weight:bold;">✅ Completed</span>`
          : `<button onclick="completeTask(${task.id}, '${task.title.replace(/'/g, "\\'")}')" 
                   style="margin-top:12px; padding:8px 18px; border:none; border-radius:8px; 
                          background:#00e5a0; color:black; font-weight:bold; cursor:pointer;">
               Mark Done
             </button>`
        }
      `;

      taskContainer.appendChild(taskCard);
    });

  } catch (error) {
    console.error("Load tasks error:", error);
    const container = document.getElementById("taskCards");
    if (container) {
      container.innerHTML = `<div class="stat-card" style="grid-column:1/-1;text-align:center;color:#ff6b35;">Failed to load tasks</div>`;
    }
  }
}

// ==================== INIT ON PAGE LOAD ====================
document.addEventListener("DOMContentLoaded", () => {
  // Set initial XP
  const xpEl = document.getElementById("xpValue");
  if (xpEl) xpEl.innerText = totalXP;

  // Load tasks from backend
  loadTasks();

  // Optional: Load user data
  // loadUser();
});