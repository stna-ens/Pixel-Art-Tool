let isDrawing = false;
let currentColor = "#ffffff";

document.body.addEventListener("mousedown", () => {
  isDrawing = true;
});

document.body.addEventListener("mouseup", () => {
  isDrawing = false;
});

const container = document.createElement("div");
container.classList.add("container");
document.body.insertBefore(container, document.getElementById("colorPicker"));

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

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function changeColor(e) {
  if (e.type === "mouseover" && !isDrawing) return;

  const target = e.target;
  let currentPercent = Number(target.dataset.percent || 0);

  if (currentPercent < 100) {
    currentPercent += 10;
    target.dataset.percent = currentPercent;

    const baseR = 51;
    const baseB = 51;

    const { r: targetR, g: targetG, b: targetB } = hexToRgb(currentColor);

    const mixedR = Math.round(
      baseR + (targetR - baseR) * (currentPercent / 100)
    );
    const mixedG = Math.round(
      baseG + (targetG - baseG) * (currentPercent / 100)
    );
    const mixedB = Math.round(
      baseB + (targetB - baseB) * (currentPercent / 100)
    );

    target.style.backgroundColor = `rgb(${mixedR}, ${mixedG}, ${mixedB})`;
  }
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
      cell.dataset.percent = "0"; // Initialize percent state
      cell.style.backgroundColor = "hsl(0, 0%, 20%)";
      cell.addEventListener("mouseover", changeColor);
      cell.addEventListener("mousedown", changeColor);
    }
  }
}

function handleTouch(e) {
  const touch = e.touches[0];
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
  if (targetElement && targetElement.classList.contains("cell")) {
    const mockEvent = {
      type: "mouseover",
      target: targetElement,
    };
    changeColor(mockEvent);
  }
}

const colorPicker = document.getElementById("colorPicker");
colorPicker.oninput = (e) => (currentColor = e.target.value);

let btn = document.getElementById("changeGridNumber");
btn.addEventListener("click", () => {
  let gridNumber = prompt("Enter a number between 1 and 100");
  if (gridNumber < 1 || gridNumber > 100) {
    alert("Please enter a number between 1 and 100");
  } else {
    createGrid(gridNumber);
  }
});
