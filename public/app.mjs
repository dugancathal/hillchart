import {exportChartAsPNG} from "./png-export.mjs";
import {buildTask, getTasks, removeTaskById, saveTask, saveTasks, toggleTaskAttribute, updateTask} from "./tasks.mjs";
import {buildHillConfig} from "./hill-math.mjs";
import {buildDemoTasks} from "./demoTasks.mjs";

const hillConfig = buildHillConfig(window.screen);

const {height, width, xMin, xMax, xMid, amplitude, verticalShift} = hillConfig;

const taskList = document.getElementById("taskList");

const svg = d3.select("#chart").attr("width", width).attr("height", height);
let completedTasksPoint;

let isDragging = false;

const maxTaskTextLength = 64;

// Initialize the hill chart
function initHillChart() {
	const hillPoints = d3.range(xMin, xMax).map((x) => ({ x, y: hillConfig.yOf(x) }));

	svg.append("path")
		.datum(hillPoints)
		.attr("class", "hill-path")
		.attr(
			"d",
			d3
			.line()
			.curve(d3.curveBasis)
			.x((d) => d.x)
			.y((d) => d.y),
		);

	svg.append("line")
		.attr("x1", xMid)
		.attr("x2", xMid)
		.attr("y1", hillConfig.yOf(xMid) + height / 8)
		.attr("y2", amplitude + verticalShift - height / 8)
		.attr("stroke", "gray")
		.attr("stroke-dasharray", "5,5");

	const labels = [
		{ x: xMid - xMid / 2, text: "RESEARCHING" },
		{ x: xMid + xMid / 2, text: "DEVELOPING" },
	];

	labels.forEach(({ x, text }) => {
		svg.append("text")
			.attr("x", x)
			.attr("y", amplitude + verticalShift + 10)
			.attr("text-anchor", "middle")
			.attr("font-size", screen.width > 640 ? "14" : "10")
			.text(text);
	});
}

// Function to load tasks from localStorage
function resetPage() {
	if (
		confirm("Are you sure you want to delete ALL tasks on this page?\n\nThis action cannot be undone.")
	) {
		localStorage.removeItem("chartTitle");
		localStorage.removeItem("tasks");
		location.reload();
	}
}

// Render all task points on the chart
async function renderTasksOnChart() {
	const tasks = await getTasks();
	const taskPoints = svg.selectAll(".task").data(
		tasks.filter((d) => !d.completed),
		(d) => d.id,
	);

	const taskGroup = taskPoints
	.enter()
	.append("g")
	.attr("class", "task")
	.attr("transform", (d) => `translate(${d.x},${d.y})`)
	.style("cursor", "grab")
	.call(d3.drag().on("start", dragStarted).on("drag", dragged).on("end", dragEnded))
	.on("mouseover", highlightTaskPoint)
	.on("mouseout", unhighlightTaskPoint);

	taskGroup
	.append("circle")
	.attr("r", width / 100)
	.attr("class", "task-point")
	.attr("fill", (d) => d.color);

	taskGroup
	.append("text")
	.attr("class", "task-label")
	.attr("x", (d) => (width / 100 + 5) * (d.x > xMid ? -1 : 1)) // Adjust x position based on the point's position relative to xMid
	.attr("y", 5) // Center the text vertically
	.attr("text-anchor", (d) => (d.x > xMid ? "end" : "start")) // Align text to the end or start based on the point's position
	.text((d) => (d.label.length > 12 ? d.label.slice(0, 12) + "..." : d.label));
	taskPoints.exit().remove();
}

function highlightTaskPoint() {
	if (isDragging) return;

	d3.select(this)
		.select("circle")
		.attr("r", width / 80);
}

function unhighlightTaskPoint() {
	if (isDragging) return;

	d3.select(this)
		.select("circle")
		.attr("r", width / 100);
	d3.select(this).select("text");
}

// Render task list in the DOM
async function renderTaskList() {
	taskList.innerHTML = ""; // Clear existing tasks

	// Sort tasks to place completed tasks at the bottom
	const tasks = await getTasks();
	const sortedTasks = tasks.slice().sort((a, b) => {
		if (a.completed === b.completed) {
			return a.x - b.x;
		}
		return a.completed - b.completed;
	});

	sortedTasks.forEach((task) => {
		const taskItem = createTaskListItem(task);
		taskList.appendChild(taskItem);
	});

	await renderCompletedTasksPoint();
}

// Create a single task list item
function createTaskListItem(task) {
	const taskItem = document.createElement("li");
	taskItem.innerHTML = `
		    <div class="flex items-center justify-between px-2 hover:bg-gray-200 active:bg-gray-200 group">

		      <label class="color-indicator mr-5 bg-transparent text-xl" style="color: ${task.completed ? "#c2c2c2" : task.color};">
			<input class="task-color-input hidden" type="color" value="${task.color}" data-task-id="${task.id}" ${task.completed ? "disabled" : ""}/>
			<i class="fa-solid fa-circle"></i>
		      </label>

			<div class="flex items-center flex-1">
			    <i class="task-status-icon hover:cursor-pointer fa-regular mr-2 ${task.completed ? "fa-check-square text-green-500" : "fa-square text-blue-500"}" data-task-id="${task.id}"></i>
			    <input class="task-label-input flex-1 bg-transparent focus:outline-none p-1 ${task.completed ? "line-through text-gray-300" : ""}" type="text" value="${task.label}" data-task-id="${task.id}" maxlength=${maxTaskTextLength} ${task.completed ? "disabled" : ""}/>
			</div>

			<button class="removeTask px-3 ml-2 text-red-300 hover:text-red-500 print:hidden">
			    <i class="fa-solid fa-trash hidden group-hover:block"></i>
			</button>
		    </div>
		`;

	addTaskItemEventListeners(taskItem, task);
	return taskItem;
}

// Add event listeners to a task list item
function addTaskItemEventListeners(taskItem, task) {
	taskItem.querySelector(".task-label-input").addEventListener("change", async (event) => {
		await updateTask(task.id, { label: event.target.value });
		renderTaskList();

		updateTaskDisplay(task);
	});

	taskItem.querySelector(".task-color-input").addEventListener("input", async (event) => {
		await updateTask(task.id, { color: event.target.value });
		await renderTaskList();
		updateTaskDisplay(task);
	});

	taskItem.querySelector(".task-status-icon").addEventListener("click", async () => {
		await toggleTaskCompletion(task.id);
		await renderTaskList();
	});

	taskItem.querySelector(".removeTask").addEventListener("click", async () => {
		await removeTask(task.id);
		await renderTaskList();
	});
}

// Update the task display on the chart
function updateTaskDisplay(task) {
	const taskElement = svg.selectAll(".task").filter((d) => d.id === task.id);
	taskElement.select("text").text((d) => (d.label.length > 12 ? d.label.slice(0, 12) + "..." : d.label));
	taskElement.select("circle").attr("fill", (d) => d.color);
}

// Handle task dragging
function dragStarted(event, d) {
	isDragging = true;

	d3.select(this).select("circle").attr("cursor", "grabbing");
}

async function dragged(event, d) {
	const pos = {
		x: Math.max(xMin, Math.min(xMax, event.x)),
		y: hillConfig.yOf(d.x),
	}
	await updateTask(d.id, pos);
	d3.select(this).attr("transform", `translate(${pos.x},${pos.y})`);
	d3.select(this)
		.select("text")
		.attr("text-anchor", (d) => (d.x > xMid ? "end" : "start")) // Align text to the end or start based on the point's position
		.attr("x", (d) => (width / 100 + 5) * (d.x > xMid ? -1 : 1)); // Adjust x position based on the point's position relative to xMid
}

async function dragEnded(event, d) {
	isDragging = false;

	d3.select(this)
		.select("circle")
		.attr("r", width / 100);

	// If task is dragged to the end (+/- 5), mark it as completed
	if (d.x >= xMax - 5) {
		d.x = xMax - 20;
		d.y = hillConfig.yOf(d.x);
		await toggleTaskCompletion(d.id);
	}
	await renderTaskList();
}

async function toggleTaskCompletion(taskId) {
	const isCompleted = await toggleTaskAttribute(taskId, "completed");
	if (isCompleted) {
		svg.selectAll(".task")
			.filter((d) => d.id === taskId)
			.remove();
	} else {
		await renderTasksOnChart();
	}
}

// Remove a task
async function removeTask(taskId) {
	await removeTaskById(taskId);
	svg.selectAll(".task")
		.filter((d) => d.id === taskId)
		.remove();
}

// Render completed tasks point
async function renderCompletedTasksPoint() {
	const tasks = await getTasks();
	const completedCount = tasks.filter((task) => task.completed).length;
	if (completedTasksPoint) {
		completedTasksPoint.remove();
	}

	if (completedCount === 0) {
		return;
	}

	completedTasksPoint = svg.append("g").attr("transform", `translate(${xMax}, ${(hillConfig.yOf(xMax))})`);

	completedTasksPoint.append("circle").attr("r", 15).attr("fill", "#c2c2c2");

	completedTasksPoint
		.append("text")
		.attr("class", "task-label")
		.attr("x", 0)
		.attr("y", 5)
		.attr("text-anchor", "middle")
		.attr("font-weight", "bold")
		.text(completedCount);
}

// Add a new task
async function addNewTask() {
	const task = buildTask({x: xMin, y: hillConfig.yOf(xMin)})

	await saveTask(task);
	await renderTaskList();
	await renderTasksOnChart();
}

// Event Listeners
document.getElementById("addTask").addEventListener("click", addNewTask);
document.getElementById("exportPNG").addEventListener("click", exportChartAsPNG);
document.getElementById("deleteAll").addEventListener("click", resetPage);
document.getElementById("print").addEventListener("click", async () => {
	await renderTasksOnChart();
	await renderTaskList();
	window.print();
});

const chartTitleElement = document.getElementById("chartTitle");
function loadChartTitle() {
	chartTitleElement.value = localStorage.getItem("chartTitle");
}

function updateChartTitle() {
	const chartTitle = chartTitleElement.value;
	localStorage.setItem("chartTitle", chartTitle);
}

chartTitleElement.addEventListener("input", () => {
	updateChartTitle();
	loadChartTitle();
});

document.addEventListener('DOMContentLoaded', () => {
	loadChartTitle();
})

// Initial rendering
initHillChart();

// Load tasks when the page loads
document.addEventListener("DOMContentLoaded", async () => {
	const initialTasks = await getTasks();
	if(!initialTasks.length) {
		await saveTasks(buildDemoTasks(hillConfig))
	}
	await renderTasksOnChart();
	await renderTaskList();
});

