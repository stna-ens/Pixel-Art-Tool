let isDrawing = false;

document.body.addEventListener("mousedown", () => {
  isDrawing = true;
});

document.body.addEventListener("mouseup", () => {
  isDrawing = false;
});

const container = document.createElement("div");
container.classList.add("container");
document.body.appendChild(container);

container.addEventListener(
  "touchstart",
  (e) => {
    isDrawing = true;
    e.preventDefault();
    handleTouch(e);
  },
  { passive: false }
);

container.addEventListener(
  "touchmove",
  (e) => {
    if (isDrawing) {
      e.preventDefault();
      handleTouch(e);
    }
  },
  { passive: false }
);

document.body.addEventListener("touchend", () => {
  isDrawing = false;
});

function createDefaultGrid() {
  for (let i = 0; i < 256; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    container.appendChild(cell);
  }
}

createGrid(16);

function darkenCell(cell) {
  let currentLight = Number(cell.dataset.light);
  if (currentLight < 100) {
    currentLight += 10;
    cell.dataset.light = currentLight;
    cell.style.backgroundColor = `hsl(0, 0%, ${currentLight}%)`;
  }
}

function whitenCell(e) {
  const targetCell = e.target;
  if (e.type === "mouseover" && !isDrawing) return;
  darkenCell(targetCell);
}

function createGrid(gridNumber) {
  container.innerHTML = "";
  gridNumber = parseInt(gridNumber);
  if (gridNumber > 0 && gridNumber < 101) {
    for (let i = 0; i < gridNumber * gridNumber; i++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      const cellSize = 100 / gridNumber;
      cell.style.width = `${cellSize}%`;
      cell.style.height = `${cellSize}%`;
      container.appendChild(cell);
      cell.dataset.light = "20";
      cell.style.backgroundColor = "hsl(0, 0%, 20%)";
      cell.addEventListener("mouseover", whitenCell);
      cell.addEventListener("mousedown", whitenCell);
    }
  }
}

function handleTouch(e) {
  const touch = e.touches[0];
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
  if (targetElement && targetElement.classList.contains("cell")) {
    darkenCell(targetElement);
  }
}

let btn = document.getElementById("changeGridNumber");
btn.addEventListener("click", () => {
  let gridNumber = prompt("Enter a number between 1 and 100");
  if (gridNumber < 1 || gridNumber > 100) {
    alert("Please enter a number between 1 and 100");
  } else {
    createGrid(gridNumber);
  }
});
