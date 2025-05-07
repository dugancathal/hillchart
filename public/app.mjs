import {exportChartAsPNG} from "./png-export.mjs";

const width = screen.width * 0.9 > 800 ? 1200 : screen.width * 0.9;
const height = width / 3;

const xMin = 20;
const xMax = width - 20;
const xMid = (xMin + xMax) / 2;

// const amplitude = 150; // Amplitude: the peak deviation of the function from its central value
// const period = 1200; // Period: the length of one complete cycle of the sine wave
// const phaseShift = 300; // Phase Shift: horizontal shift of the sine wave
// const verticalShift = 200; // Vertical Shift: vertical displacement of the sine wave
const amplitude = height / 2.5;
const period = width;
const phaseShift = width / 4;
const verticalShift = height / 2;
// Calculate the coefficient for the period
const B = (2 * Math.PI) / period; // Coefficient for period: determines the frequency of the sine wave

// Define the function using the parameters
const hillFn = (x) => amplitude * Math.sin(B * (x + phaseShift)) + verticalShift;

const colorPalette = ["#3498db", "#e74c3c", "#2ecc71", "#9b59b6", "#f1c40f"];

const chartTitleElement = document.getElementById("chartTitle");
const taskList = document.getElementById("taskList");

const svg = d3.select("#chart").attr("width", width).attr("height", height);
let demoTasks = [
	{ id: 1, label: "Feature A", x: xMin + 50, color: "#1f77b4", completed: false },
	{ id: 2, label: "Feature B", x: xMid - xMid / 2, color: "#ff7f0e", completed: false },
	{ id: 3, label: "Feature C", x: xMid - xMid / 3, color: "#2ca02c", completed: false },
].map((d) => ({ ...d, y: hillFn(d.x) }));
let tasks = [...demoTasks];

let completedTasksPoint;

let isDragging = false;

const maxTaskTextLength = 64;

// Initialize the hill chart
function initHillChart() {
	const hillPoints = d3.range(xMin, xMax).map((x) => ({ x, y: hillFn(x) }));

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
		.attr("y1", hillFn(xMid) + height / 8)
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
function loadTasks() {
	const tasksJson = localStorage.getItem("tasks");
	if (tasksJson) {
		tasks = JSON.parse(tasksJson);
	}
}

// Function to save tasks to localStorage
function saveTasks() {
	localStorage.setItem("tasks", JSON.stringify(tasks));
	renderTaskList();
}

function resetPage() {
	if (
		confirm("Are you sure you want to delete ALL tasks on this page?\n\nThis action cannot be undone.")
	) {
		localStorage.removeItem("chartTitle");
		localStorage.removeItem("tasks");
		location.reload();
	}
}

function loadChartTitle() {
    chartTitleElement.value = localStorage.getItem("chartTitle");
}

function updateChartTitle() {
	const chartTitle = chartTitleElement.value;
	localStorage.setItem("chartTitle", chartTitle);
}

// Render all task points on the chart
function renderTasksOnChart() {
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
function renderTaskList() {
	taskList.innerHTML = ""; // Clear existing tasks

	// Sort tasks to place completed tasks at the bottom
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

	renderCompletedTasksPoint();
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
	taskItem.querySelector(".task-label-input").addEventListener("change", (event) => {
		task.label = event.target.value;
		saveTasks();
		updateTaskDisplay(task);
	});

	taskItem.querySelector(".task-color-input").addEventListener("input", (event) => {
		task.color = event.target.value;
		saveTasks();
		updateTaskDisplay(task);
	});

	taskItem.querySelector(".task-status-icon").addEventListener("click", () => {
		toggleTaskCompletion(task.id);
		saveTasks();
		renderTaskList();
	});

	taskItem.querySelector(".removeTask").addEventListener("click", () => {
		removeTask(task.id);
		saveTasks();
		renderTaskList();
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

function dragged(event, d) {
	d.x = Math.max(xMin, Math.min(xMax, event.x));
	d.y = hillFn(d.x);
	d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
	d3.select(this)
		.select("text")
		.attr("text-anchor", (d) => (d.x > xMid ? "end" : "start")) // Align text to the end or start based on the point's position
		.attr("x", (d) => (width / 100 + 5) * (d.x > xMid ? -1 : 1)); // Adjust x position based on the point's position relative to xMid
}

function dragEnded(event, d) {
	isDragging = false;

	d3.select(this)
		.select("circle")
		.attr("r", width / 100);

	// If task is dragged to the end (+/- 5), mark it as completed
	if (d.x >= xMax - 5) {
		d.x = xMax - 20;
		d.y = hillFn(d.x);
		toggleTaskCompletion(d.id);
	}
	saveTasks();
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
	const task = tasks.find((t) => t.id === taskId);
	task.completed = !task.completed;
	saveTasks();
	if (task.completed) {
		svg.selectAll(".task")
			.filter((d) => d.id === taskId)
			.remove();
	} else {
		renderTasksOnChart();
	}
}

// Remove a task
function removeTask(taskId) {
	tasks = tasks.filter((t) => t.id !== taskId);
	saveTasks();
	svg.selectAll(".task")
		.filter((d) => d.id === taskId)
		.remove();
}

// Render completed tasks point
function renderCompletedTasksPoint() {
	const completedCount = tasks.filter((task) => task.completed).length;
	if (completedTasksPoint) {
		completedTasksPoint.remove();
	}

	if (completedCount === 0) {
		return;
	}

	completedTasksPoint = svg.append("g").attr("transform", `translate(${xMax}, ${hillFn(xMax)})`);

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
function addNewTask() {
	const newId = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
	const newTask = {
		id: newId,
		label: `Task ${newId}`,
		x: xMin,
		color: colorPalette[(newId - 1) % colorPalette.length],
		y: hillFn(xMin),
		completed: false,
	};
	tasks.push(newTask);
	saveTasks();
	renderTasksOnChart();
	renderTaskList();
}

// Event Listeners
document.getElementById("addTask").addEventListener("click", addNewTask);
document.getElementById("exportPNG").addEventListener("click", exportChartAsPNG);
document.getElementById("deleteAll").addEventListener("click", resetPage);
document.getElementById("print").addEventListener("click", () => {
	renderTasksOnChart();
	renderTaskList();
	window.print();
});

chartTitleElement.addEventListener("input", () => {
	updateChartTitle();
	loadChartTitle();
});

// Initial rendering
initHillChart();

// Load tasks when the page loads
document.addEventListener("DOMContentLoaded", () => {
	loadTasks();
	renderTasksOnChart();
	loadChartTitle();
	renderTaskList();
});

