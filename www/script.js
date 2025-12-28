let isDrawing = false;
let isErasing = false;
// currentColor will be set after DOM load, but safe default here
let currentColor = "#000000";
let lastStylusTime = 0; // Track when the stylus was last used
let lastTouchedElement = null; // Track the last element touched to prevent rapid firing
let historyStack = [];
let currentStroke = []; // Buffer for the current continuous stroke
const MAX_HISTORY = 50;

// Cached base colors for color mixing (set by applyTheme)
let cachedBaseColors = { r: 255, g: 255, b: 255 };

document.body.addEventListener("mousedown", () => {
  isDrawing = true;
  currentStroke = []; // Start new stroke
});

document.body.addEventListener("mouseup", () => {
  isDrawing = false;
  lastTouchedElement = null; // Reset on mouse up
  if (currentStroke.length > 0) {
    historyStack.push(currentStroke);
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    currentStroke = [];
  }
});

const container = document.createElement("div");
container.classList.add("container");
const tools = document.getElementById("tools");
tools.parentNode.insertBefore(container, tools);

container.addEventListener(
  "touchstart",
  (e) => {
    isDrawing = true;
    lastTouchedElement = null; // Reset on new touch
    currentStroke = []; // Start new stroke
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
  lastTouchedElement = null;
  if (currentStroke.length > 0) {
    historyStack.push(currentStroke);
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    currentStroke = [];
  }
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
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  // FIX: Return NULL on failure, not Black (0,0,0) so we can detect failure
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getBaseColors() {
  // Return the cached colors (set when theme was applied)
  return cachedBaseColors;
}

// Helper to add action to current stroke buffer
function addToCurrentStroke(
  element,
  prevColor,
  prevPercent,
  newColor,
  newPercent
) {
  currentStroke.push({
    element,
    prevColor,
    prevPercent,
    newColor,
    newPercent,
  });
}

function undo() {
  if (historyStack.length === 0) return;

  // Pop the last stroke (array of actions)
  const stroke = historyStack.pop();

  // Revert all actions in the stroke, in reverse order
  for (let i = stroke.length - 1; i >= 0; i--) {
    const action = stroke[i];
    const { element, prevColor, prevPercent } = action;
    element.style.backgroundColor = prevColor;
    element.dataset.percent = prevPercent;
  }
}

function changeColor(e) {
  if (e.type === "mouseover" && !isDrawing) return;

  const target = e.target;
  // Capture state BEFORE modification
  const prevColor = target.style.backgroundColor;
  const prevPercent = target.dataset.percent || 0;

  if (isErasing) {
    target.style.backgroundColor = "var(--bg-cell)";
    target.dataset.percent = 0;

    addToCurrentStroke(target, prevColor, prevPercent, "var(--bg-cell)", 0);
    return;
  }

  let currentPercent = Number(target.dataset.percent || 0);

  if (currentPercent < 100) {
    currentPercent += 10;

    // Calculate new color DYNAMICALLY
    const { r: baseR_val, g: baseG_val, b: baseB_val } = getBaseColors();

    const result = hexToRgb(currentColor);
    // Ensure we have a valid target color, otherwise default to Black (user intent)
    const {
      r: targetR,
      g: targetG,
      b: targetB,
    } = result ? result : { r: 0, g: 0, b: 0 };

    const mixedR = Math.round(
      baseR_val + (targetR - baseR_val) * (currentPercent / 100)
    );
    const mixedG = Math.round(
      baseG_val + (targetG - baseG_val) * (currentPercent / 100)
    );
    const mixedB = Math.round(
      baseB_val + (targetB - baseB_val) * (currentPercent / 100)
    );

    const newColor = `rgb(${mixedR}, ${mixedG}, ${mixedB})`;

    target.dataset.percent = currentPercent;
    target.style.backgroundColor = newColor;

    addToCurrentStroke(
      target,
      prevColor,
      prevPercent,
      newColor,
      currentPercent
    );
  }
}

function createGrid(gridNumber) {
  container.innerHTML = "";
  historyStack = []; // Clear history on new grid
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
      cell.style.backgroundColor = "var(--bg-cell)";
      cell.addEventListener("mouseover", changeColor);
      cell.addEventListener("mousedown", changeColor);
    }
  }
}

function handleTouch(e) {
  // Check for stylus input first
  let activeTouch = Array.from(e.touches).find((t) => t.touchType === "stylus");

  if (activeTouch) {
    lastStylusTime = Date.now(); // Update timestamp
  } else {
    // Palm Rejection: If stylus was used recently (e.g., last 2 seconds), ignore finger
    if (Date.now() - lastStylusTime < 1000) {
      return;
    }
    activeTouch = e.touches[0]; // Fallback to finger
  }

  if (!activeTouch) return;

  const targetElement = document.elementFromPoint(
    activeTouch.clientX,
    activeTouch.clientY
  );

  // If we are still on the same element as the last frame, don't re-trigger
  // This mimics mouseover behavior where it only fires once per entry
  if (targetElement === lastTouchedElement) {
    return;
  }

  if (targetElement && targetElement.classList.contains("cell")) {
    lastTouchedElement = targetElement; // Update last touched
    const mockEvent = {
      type: "mouseover",
      target: targetElement,
    };
    changeColor(mockEvent);
  }
}

const colorPicker = document.getElementById("colorPicker");
// Initialize from the actual DOM value so what user sees is what they get
currentColor = colorPicker.value || "#000000";

const eraserBtn = document.getElementById("eraserBtn");
const undoBtn = document.getElementById("undoBtn");

colorPicker.oninput = (e) => {
  currentColor = e.target.value;
  isErasing = false;
  eraserBtn.classList.remove("active");
};
// Add onchange for better mobile compatibility
colorPicker.onchange = (e) => {
  currentColor = e.target.value;
  isErasing = false;
  eraserBtn.classList.remove("active");
};

eraserBtn.onclick = () => {
  isErasing = !isErasing;
  eraserBtn.classList.toggle("active");
};

undoBtn.onclick = () => {
  undo();
};

let btn = document.getElementById("changeGridNumber");
btn.addEventListener("click", () => {
  let gridNumber = prompt("Enter a number between 1 and 100");
  if (gridNumber < 1 || gridNumber > 100) {
    alert("Please enter a number between 1 and 100");
  } else {
    createGrid(gridNumber);
  }
});

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", () => {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    cell.style.backgroundColor = "var(--bg-cell)";
    cell.dataset.percent = 0;
  });
  historyStack = [];
});

/* Theme Logic */
const defaultThemes = {
  poolsuite: {
    name: "Retro OS (Default)",
    id: "poolsuite",
    colors: {
      "--bg-main": "#ffdad5",
      "--bg-container": "#fff8f0",
      "--bg-cell": "#ffffff",
      "--border-cell": "rgba(0, 0, 0, 0.1)",
      "--text-main": "#000000",
      "--btn-bg": "#ececec",
      "--btn-text": "#000000",
      "--btn-border": "#000000",
      "--btn-hover": "#ffffff",
      "--btn-active-bg": "#000000",
      "--btn-active-text": "#ffffff",
    },
  },
  dark: {
    name: "Dark (Classic)",
    id: "dark",
    colors: {
      "--bg-main": "rgb(48, 48, 48)",
      "--bg-container": "#222",
      "--bg-cell": "#333333",
      "--border-cell": "rgba(255, 255, 255, 0.1)",
      "--text-main": "white",
      "--btn-bg": "rgb(81, 81, 81)",
      "--btn-text": "white",
      "--btn-border": "rgb(120, 120, 120)",
      "--btn-hover": "rgb(90, 90, 90)",
      "--btn-active-bg": "white",
      "--btn-active-text": "black",
    },
  },
  retroLight: {
    name: "Light (Retro)",
    id: "retroLight",
    colors: {
      "--bg-main": "#f0f0f0",
      "--bg-container": "#ffffff",
      "--bg-cell": "#e0e0e0",
      "--border-cell": "rgba(0, 0, 0, 0.1)",
      "--text-main": "#333333",
      "--btn-bg": "#ffffff",
      "--btn-text": "#333333",
      "--btn-border": "#cccccc",
      "--btn-hover": "#e6e6e6",
      "--btn-active-bg": "#333333",
      "--btn-active-text": "white",
    },
  },
  mac: {
    name: "Mac Classic",
    id: "mac",
    colors: {
      "--bg-main": "#ffffff",
      "--bg-container": "#e0e0e0",
      "--bg-cell": "#aaaaaa",
      "--border-cell": "rgba(0, 0, 0, 0.2)",
      "--text-main": "#000000",
      "--btn-bg": "#ffffff",
      "--btn-text": "#000000",
      "--btn-border": "#000000",
      "--btn-hover": "#cccccc",
      "--btn-active-bg": "#000000",
      "--btn-active-text": "#ffffff",
    },
  },
  gameboy: {
    name: "GameBoy",
    id: "gameboy",
    colors: {
      "--bg-main": "#8bac0f",
      "--bg-container": "#9bbc0f",
      "--bg-cell": "#306230",
      "--border-cell": "rgba(15, 56, 15, 0.3)",
      "--text-main": "#0f380f",
      "--btn-bg": "#9bbc0f",
      "--btn-text": "#0f380f",
      "--btn-border": "#306230",
      "--btn-hover": "#8bac0f",
      "--btn-active-bg": "#0f380f",
      "--btn-active-text": "#9bbc0f",
    },
  },
  cga: {
    name: "CGA",
    id: "cga",
    colors: {
      "--bg-main": "#000000",
      "--bg-container": "#555555",
      "--bg-cell": "#AA00AA",
      "--border-cell": "rgba(255, 85, 255, 0.2)",
      "--text-main": "#55FFFF",
      "--btn-bg": "#FF55FF",
      "--btn-text": "#FFFFFF",
      "--btn-border": "#FFFFFF",
      "--btn-hover": "#AA00AA",
      "--btn-active-bg": "#55FFFF",
      "--btn-active-text": "#000000",
    },
  },
  vaporwave: {
    name: "Vaporwave",
    id: "vaporwave",
    colors: {
      "--bg-main": "#ff71ce",
      "--bg-container": "#01cdfe",
      "--bg-cell": "#05ffa1",
      "--border-cell": "rgba(255, 113, 206, 0.2)",
      "--text-main": "#b967ff",
      "--btn-bg": "#fffb96",
      "--btn-text": "#01cdfe",
      "--btn-border": "#b967ff",
      "--btn-hover": "#ff71ce",
      "--btn-active-bg": "#05ffa1",
      "--btn-active-text": "#000000",
    },
  },
  blueprint: {
    name: "Blueprint",
    id: "blueprint",
    colors: {
      "--bg-main": "#2a4b8d",
      "--bg-container": "#3659a2",
      "--bg-cell": "#1e3768",
      "--border-cell": "rgba(255, 255, 255, 0.1)",
      "--text-main": "#ffffff",
      "--btn-bg": "#3659a2",
      "--btn-text": "#ffffff",
      "--btn-border": "#6ba4ff",
      "--btn-hover": "#4a75c7",
      "--btn-active-bg": "#ffffff",
      "--btn-active-text": "#2a4b8d",
    },
  },
  sepia: {
    name: "Sepia",
    id: "sepia",
    colors: {
      "--bg-main": "#704214",
      "--bg-container": "#d2b48c",
      "--bg-cell": "#654321",
      "--border-cell": "rgba(0, 0, 0, 0.3)",
      "--text-main": "#3e2723",
      "--btn-bg": "#d2b48c",
      "--btn-text": "#3e2723",
      "--btn-border": "#3e2723",
      "--btn-hover": "#c19a6b",
      "--btn-active-bg": "#3e2723",
      "--btn-active-text": "#d2b48c",
    },
  },
  terminator: {
    name: "Terminator",
    id: "terminator",
    colors: {
      "--bg-main": "#000000",
      "--bg-container": "#1a0505",
      "--bg-cell": "#1a1a1a",
      "--border-cell": "rgba(255, 0, 0, 0.3)",
      "--text-main": "#ff0000",
      "--btn-bg": "#330000",
      "--btn-text": "#ff0000",
      "--btn-border": "#ff0000",
      "--btn-hover": "#660000",
      "--btn-active-bg": "#ff0000",
      "--btn-active-text": "#000000",
    },
  },
  ocean: {
    name: "Ocean",
    id: "ocean",
    colors: {
      "--bg-main": "#1a4b6e",
      "--bg-container": "#133854",
      "--bg-cell": "#0f2d44",
      "--border-cell": "rgba(186, 230, 253, 0.1)",
      "--text-main": "#bae6fd",
      "--btn-bg": "#0ea5e9",
      "--btn-text": "white",
      "--btn-border": "#0284c7",
      "--btn-hover": "#0284c7",
      "--btn-active-bg": "#bae6fd",
      "--btn-active-text": "#0f2d44",
    },
  },
  forest: {
    name: "Forest",
    id: "forest",
    colors: {
      "--bg-main": "#2c3e38",
      "--bg-container": "#1b2925",
      "--bg-cell": "#121f1b",
      "--border-cell": "rgba(216, 245, 229, 0.1)",
      "--text-main": "#d8f5e5",
      "--btn-bg": "#4a7c68",
      "--btn-text": "#e0f2eb",
      "--btn-border": "#365c4d",
      "--btn-hover": "#59917a",
      "--btn-active-bg": "#d8f5e5",
      "--btn-active-text": "#1b2925",
    },
  },
  sunset: {
    name: "Sunset",
    id: "sunset",
    colors: {
      "--bg-main": "#4a2c3a",
      "--bg-container": "#2e1a23",
      "--bg-cell": "#1f1118",
      "--border-cell": "rgba(255, 214, 186, 0.1)",
      "--text-main": "#ffd6ba",
      "--btn-bg": "#c45b5b",
      "--btn-text": "#fff0e6",
      "--btn-border": "#a64545",
      "--btn-hover": "#d97070",
      "--btn-active-bg": "#ffd6ba",
      "--btn-active-text": "#4a2c3a",
    },
  },
  lavender: {
    name: "Lavender",
    id: "lavender",
    colors: {
      "--bg-main": "#e6e6fa",
      "--bg-container": "#f8f8ff",
      "--bg-cell": "#dcdcdc",
      "--border-cell": "rgba(72, 61, 139, 0.1)",
      "--text-main": "#483d8b",
      "--btn-bg": "#9370db",
      "--btn-text": "white",
      "--btn-border": "#7b68ee",
      "--btn-hover": "#8a2be2",
      "--btn-active-bg": "#483d8b",
      "--btn-active-text": "white",
    },
  },
  dracula: {
    name: "Dracula",
    id: "dracula",
    colors: {
      "--bg-main": "#282a36",
      "--bg-container": "#44475a",
      "--bg-cell": "#6272a4",
      "--border-cell": "rgba(189, 147, 249, 0.3)",
      "--text-main": "#f8f8f2",
      "--btn-bg": "#bd93f9",
      "--btn-text": "#282a36",
      "--btn-border": "#6272a4",
      "--btn-hover": "#ff79c6",
      "--btn-active-bg": "#f8f8f2",
      "--btn-active-text": "#282a36",
    },
  },
  solarizedLight: {
    name: "Solarized Light",
    id: "solarizedLight",
    colors: {
      "--bg-main": "#fdf6e3",
      "--bg-container": "#eee8d5",
      "--bg-cell": "#93a1a1",
      "--border-cell": "rgba(0, 0, 0, 0.1)",
      "--text-main": "#657b83",
      "--btn-bg": "#b58900",
      "--btn-text": "#fdf6e3",
      "--btn-border": "#93a1a1",
      "--btn-hover": "#cb4b16",
      "--btn-active-bg": "#073642",
      "--btn-active-text": "#839496",
    },
  },
  nord: {
    name: "Nord",
    id: "nord",
    colors: {
      "--bg-main": "#2e3440",
      "--bg-container": "#3b4252",
      "--bg-cell": "#434c5e",
      "--border-cell": "rgba(143, 188, 187, 0.2)",
      "--text-main": "#d8dee9",
      "--btn-bg": "#88c0d0",
      "--btn-text": "#2e3440",
      "--btn-border": "#81a1c1",
      "--btn-hover": "#5e81ac",
      "--btn-active-bg": "#eceff4",
      "--btn-active-text": "#2e3440",
    },
  },
  monokai: {
    name: "Monokai",
    id: "monokai",
    colors: {
      "--bg-main": "#272822",
      "--bg-container": "#3e3d32",
      "--bg-cell": "#75715e",
      "--border-cell": "rgba(255, 255, 255, 0.1)",
      "--text-main": "#f8f8f2",
      "--btn-bg": "#a6e22e",
      "--btn-text": "#272822",
      "--btn-border": "#f92672",
      "--btn-hover": "#66d9ef",
      "--btn-active-bg": "#ae81ff",
      "--btn-active-text": "#f8f8f2",
    },
  },
  synthwave: {
    name: "Synthwave '84",
    id: "synthwave",
    colors: {
      "--bg-main": "#2b213a",
      "--bg-container": "#241b2f",
      "--bg-cell": "#090b20",
      "--border-cell": "rgba(255, 0, 212, 0.2)",
      "--text-main": "#fffb96",
      "--btn-bg": "#ff71ce",
      "--btn-text": "#2b213a",
      "--btn-border": "#05ffa1",
      "--btn-hover": "#b967ff",
      "--btn-active-bg": "#01cdfe",
      "--btn-active-text": "#000000",
    },
  },
  matrix: {
    name: "The Matrix",
    id: "matrix",
    colors: {
      "--bg-main": "#000000",
      "--bg-container": "#0d110d",
      "--bg-cell": "#002200",
      "--border-cell": "rgba(0, 255, 0, 0.1)",
      "--text-main": "#00ff00",
      "--btn-bg": "#003b00",
      "--btn-text": "#00ff00",
      "--btn-border": "#00ff00",
      "--btn-hover": "#008f11",
      "--btn-active-bg": "#00ff00",
      "--btn-active-text": "#000000",
    },
  },
  dos: {
    name: "MS-DOS",
    id: "dos",
    colors: {
      "--bg-main": "#000084",
      "--bg-container": "#0000a8",
      "--bg-cell": "#000084",
      "--border-cell": "rgba(255, 255, 255, 0.2)",
      "--text-main": "#ffffff",
      "--btn-bg": "#aaaaaa",
      "--btn-text": "#000000",
      "--btn-border": "#ffffff",
      "--btn-hover": "#ffffff",
      "--btn-active-bg": "#000084",
      "--btn-active-text": "#ffffff",
    },
  },
  gruvbox: {
    name: "Gruvbox",
    id: "gruvbox",
    colors: {
      "--bg-main": "#282828",
      "--bg-container": "#3c3836",
      "--bg-cell": "#504945",
      "--border-cell": "rgba(235, 219, 178, 0.1)",
      "--text-main": "#ebdbb2",
      "--btn-bg": "#d65d0e",
      "--btn-text": "#282828",
      "--btn-border": "#fabd2f",
      "--btn-hover": "#fe8019",
      "--btn-active-bg": "#ebdbb2",
      "--btn-active-text": "#282828",
    },
  },
  ubuntu: {
    name: "Ubuntu",
    id: "ubuntu",
    colors: {
      "--bg-main": "#300a24",
      "--bg-container": "#4a1c38",
      "--bg-cell": "#5e2750",
      "--border-cell": "rgba(221, 72, 20, 0.2)",
      "--text-main": "#ffffff",
      "--btn-bg": "#e95420",
      "--btn-text": "#ffffff",
      "--btn-border": "#77216f",
      "--btn-hover": "#c74312",
      "--btn-active-bg": "#ffffff",
      "--btn-active-text": "#e95420",
    },
  },
  highContrast: {
    name: "High Contrast",
    id: "highContrast",
    colors: {
      "--bg-main": "#000000",
      "--bg-container": "#ffffff",
      "--bg-cell": "#000000",
      "--border-cell": "rgba(255, 255, 255, 0.4)",
      "--text-main": "#ffff00",
      "--btn-bg": "#0000ff",
      "--btn-text": "#ffffff",
      "--btn-border": "#ffff00",
      "--btn-hover": "#ffff00",
      "--btn-active-bg": "#ffffff",
      "--btn-active-text": "#000000",
    },
  },
  hotdogStand: {
    name: "Hotdog Stand",
    id: "hotdogStand",
    colors: {
      "--bg-main": "#ff0000",
      "--bg-container": "#ffff00",
      "--bg-cell": "#ffcccc",
      "--border-cell": "rgba(0, 0, 0, 0.1)",
      "--text-main": "#000000",
      "--btn-bg": "#ffffff",
      "--btn-text": "#000000",
      "--btn-border": "#000000",
      "--btn-hover": "#ffff00",
      "--btn-active-bg": "#ff0000",
      "--btn-active-text": "#ffff00",
    },
  },
  paper: {
    name: "Paper",
    id: "paper",
    colors: {
      "--bg-main": "#fdfbf7",
      "--bg-container": "#ffffff",
      "--bg-cell": "#ffffff",
      "--border-cell": "rgba(74, 144, 226, 0.2)",
      "--text-main": "#333333",
      "--btn-bg": "#ffffff",
      "--btn-text": "#333333",
      "--btn-border": "#333333",
      "--btn-hover": "#f0f0f0",
      "--btn-active-bg": "#333333",
      "--btn-active-text": "#ffffff",
    },
  },
  draculaDark: {
    name: "Dracula (Deep)",
    id: "draculaDark",
    colors: {
      "--bg-main": "#1e1e24",
      "--bg-container": "#21222c",
      "--bg-cell": "#282a36",
      "--border-cell": "rgba(98, 114, 164, 0.3)",
      "--text-main": "#f8f8f2",
      "--btn-bg": "#6272a4",
      "--btn-text": "#f8f8f2",
      "--btn-border": "#bd93f9",
      "--btn-hover": "#50fa7b",
      "--btn-active-bg": "#ff5555",
      "--btn-active-text": "#f8f8f2",
    },
  },
  cyberpunk: {
    name: "Cyberpunk",
    id: "cyberpunk",
    colors: {
      "--bg-main": "#fceeb5",
      "--bg-container": "#000b1e",
      "--bg-cell": "#ee0000",
      "--border-cell": "rgba(0, 240, 255, 0.4)",
      "--text-main": "#00f0ff",
      "--btn-bg": "#fcdf03",
      "--btn-text": "#000000",
      "--btn-border": "#00f0ff",
      "--btn-hover": "#ee0000",
      "--btn-active-bg": "#00f0ff",
      "--btn-active-text": "#000000",
    },
  },
  coffee: {
    name: "Coffee",
    id: "coffee",
    colors: {
      "--bg-main": "#dcc6b8",
      "--bg-container": "#6f4e37",
      "--bg-cell": "#4b3621",
      "--border-cell": "rgba(255, 255, 255, 0.2)",
      "--text-main": "#2c1b0e",
      "--btn-bg": "#8b5a2b",
      "--btn-text": "#f3e5ab",
      "--btn-border": "#4b3621",
      "--btn-hover": "#a0522d",
      "--btn-active-bg": "#dcc6b8",
      "--btn-active-text": "#4b3621",
    },
  },
  winter: {
    name: "Winter",
    id: "winter",
    colors: {
      "--bg-main": "#f0fcff",
      "--bg-container": "#dff9fb",
      "--bg-cell": "#c7ecee",
      "--border-cell": "rgba(0, 168, 255, 0.1)",
      "--text-main": "#2f3640",
      "--btn-bg": "#7ed6df",
      "--btn-text": "#2f3640",
      "--btn-border": "#22a6b3",
      "--btn-hover": "#e056fd",
      "--btn-active-bg": "#2f3640",
      "--btn-active-text": "#ffffff",
    },
  },
  mint: {
    name: "Mint",
    id: "mint",
    colors: {
      "--bg-main": "#f5fffa",
      "--bg-container": "#e0ffff",
      "--bg-cell": "#98fb98",
      "--border-cell": "rgba(0, 128, 128, 0.2)",
      "--text-main": "#2f4f4f",
      "--btn-bg": "#66cdaa",
      "--btn-text": "#f5fffa",
      "--btn-border": "#20b2aa",
      "--btn-hover": "#48d1cc",
      "--btn-active-bg": "#20b2aa",
      "--btn-active-text": "#ffffff",
    },
  },
};

let customThemes = {};
let activeThemeId = "poolsuite";

const themeModal = document.getElementById("themeModal");
const themeBtn = document.getElementById("themeBtn");
const closeModal = document.querySelector(".close");
const saveCustomBtn = document.getElementById("saveCustomThemeBtn");
const themePresetsContainer = document.querySelector(".theme-presets");

// Inputs for Custom Theme
const customInputs = {
  name: document.getElementById("customThemeName"),
  "--bg-main": document.getElementById("customBgMain"),
  "--bg-container": document.getElementById("customBgContainer"),
  "--bg-cell": document.getElementById("customBgCell"),
  "--btn-bg": document.getElementById("customBtnBg"),
  "--text-main": document.getElementById("customText"),
};

// Load Custom Themes
function loadCustomThemes() {
  const custom = localStorage.getItem("customThemes");
  if (custom) {
    try {
      customThemes = JSON.parse(custom);
    } catch (e) {
      console.error("Error loading custom themes", e);
      customThemes = {};
    }
  }
}

function saveCustomThemesToStorage() {
  localStorage.setItem("customThemes", JSON.stringify(customThemes));
}

function deleteTheme(e, id) {
  e.stopPropagation(); // Prevent applying the theme
  if (confirm("Are you sure you want to delete this theme?")) {
    delete customThemes[id];
    saveCustomThemesToStorage();
    // If deleted theme was active, revert to default
    if (activeThemeId === id) {
      applyTheme(defaultThemes.poolsuite.colors);
      activeThemeId = "poolsuite";
      localStorage.setItem("pixelArtThemeId", activeThemeId);
    }
    renderThemeOptions();
  }
}

function renameTheme(e, id) {
  e.stopPropagation();
  const newName = prompt("Enter new name for theme:", customThemes[id].name);
  if (newName && newName.trim() !== "") {
    customThemes[id].name = newName.trim();
    saveCustomThemesToStorage();
    renderThemeOptions();
  }
}

function createThemeCard(theme, isCustom) {
  const themeCard = document.createElement("div");
  themeCard.classList.add("theme-card");

  if (activeThemeId === theme.id) {
    themeCard.classList.add("active");
  }

  // Preview circles
  const preview = document.createElement("div");
  preview.classList.add("theme-preview");

  const c1 = document.createElement("div");
  c1.style.backgroundColor = theme.colors["--bg-main"];
  const c2 = document.createElement("div");
  c2.style.backgroundColor = theme.colors["--btn-bg"];
  const c3 = document.createElement("div");
  c3.style.backgroundColor = theme.colors["--bg-cell"];

  preview.appendChild(c1);
  preview.appendChild(c2);
  preview.appendChild(c3);

  const name = document.createElement("span");
  name.innerText = theme.name;

  themeCard.appendChild(preview);
  themeCard.appendChild(name);

  if (isCustom) {
    const actions = document.createElement("div");
    actions.classList.add("card-actions");

    const renameBtn = document.createElement("button");
    renameBtn.innerHTML = "✎";
    renameBtn.title = "Rename";
    renameBtn.onclick = (e) => renameTheme(e, theme.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.onclick = (e) => deleteTheme(e, theme.id);

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    themeCard.appendChild(actions);
  }

  themeCard.onclick = () => {
    applyTheme(theme.colors);
    activeThemeId = theme.id;
    localStorage.setItem("pixelArtThemeId", activeThemeId);

    document
      .querySelectorAll(".theme-card")
      .forEach((c) => c.classList.remove("active"));
    themeCard.classList.add("active");
  };

  return themeCard;
}

function renderSectionHeader(text) {
  const h = document.createElement("h4");
  h.innerText = text;
  h.classList.add("theme-section-header");
  return h;
}

// Render Themes
function renderThemeOptions() {
  themePresetsContainer.innerHTML = ""; // Clear existing
  loadCustomThemes(); // Refresh list memory

  // Defaults
  themePresetsContainer.appendChild(renderSectionHeader("Presets"));
  const presetsGrid = document.createElement("div");
  presetsGrid.classList.add("theme-grid-container");

  Object.values(defaultThemes).forEach((theme) => {
    presetsGrid.appendChild(createThemeCard(theme, false));
  });
  themePresetsContainer.appendChild(presetsGrid);

  // Custom
  if (Object.keys(customThemes).length > 0) {
    themePresetsContainer.appendChild(document.createElement("hr"));
    themePresetsContainer.appendChild(renderSectionHeader("My Themes"));

    const customGrid = document.createElement("div");
    customGrid.classList.add("theme-grid-container");

    Object.values(customThemes).forEach((theme) => {
      customGrid.appendChild(createThemeCard(theme, true));
    });
    themePresetsContainer.appendChild(customGrid);
  }
}

// Initial Load
loadCustomThemes();
const savedThemeId = localStorage.getItem("pixelArtThemeId");
activeThemeId = savedThemeId || "poolsuite";

// Check where it exists
let initialColors = defaultThemes.poolsuite.colors;
if (defaultThemes[activeThemeId]) {
  initialColors = defaultThemes[activeThemeId].colors;
} else if (customThemes[activeThemeId]) {
  initialColors = customThemes[activeThemeId].colors;
}

applyTheme(initialColors);

// Open Modal
themeBtn.onclick = () => {
  renderThemeOptions(); // Re-render to show active state and new themes
  themeModal.classList.add("show");
};

// Close Modal
closeModal.onclick = () => {
  themeModal.classList.remove("show");
};

window.onclick = (event) => {
  if (event.target === themeModal) {
    themeModal.classList.remove("show");
  }
};

const applyPreviewBtn = document.getElementById("applyPreviewBtn");

// Helper to get current input values as a theme object
function getValuesFromInputs() {
  return {
    "--bg-main": customInputs["--bg-main"].value,
    "--bg-container": customInputs["--bg-container"].value,
    "--bg-cell": customInputs["--bg-cell"].value,
    "--border-cell": "rgba(0,0,0,0.1)", // Default for custom themes for now
    "--text-main": customInputs["--text-main"].value,
    "--btn-bg": customInputs["--btn-bg"].value,
    "--btn-text": customInputs["--text-main"].value,
    "--btn-border": customInputs["--text-main"].value,
    "--btn-hover": customInputs["--bg-container"].value,
    "--btn-active-bg": customInputs["--text-main"].value,
    "--btn-active-text": customInputs["--bg-main"].value,
  };
}

// Handle Preview Only
applyPreviewBtn.onclick = () => {
  const previewColors = getValuesFromInputs();
  applyTheme(previewColors);
  // Do NOT set activeThemeId or save to localStorage yet
  // This allows user to "try" without committing
  themeModal.classList.remove("show");
};

// Handle Custom Theme Save & Apply
saveCustomBtn.onclick = () => {
  const name = customInputs.name.value.trim() || `Custom Theme ${Date.now()}`;
  const id = `custom_${Date.now()}`;

  const customTheme = {
    name: name,
    id: id,
    colors: getValuesFromInputs(),
  };

  customThemes[id] = customTheme;
  saveCustomThemesToStorage();

  // Apply immediately
  applyTheme(customTheme.colors);
  activeThemeId = id;
  localStorage.setItem("pixelArtThemeId", id);

  themeModal.classList.remove("show");

  // Clear Name input (optional)
  customInputs.name.value = "";
};

function parseColorString(colorStr) {
  // Try Hex
  if (colorStr.startsWith("#")) {
    const rgb = hexToRgb(colorStr);
    if (rgb) return rgb;
  }
  // Try RGB
  if (colorStr.startsWith("rgb")) {
    const parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return {
        r: parseInt(parts[0]),
        g: parseInt(parts[1]),
        b: parseInt(parts[2]),
      };
    }
  }
  // Named colors
  if (colorStr.toLowerCase() === "white") return { r: 255, g: 255, b: 255 };
  if (colorStr.toLowerCase() === "black") return { r: 0, g: 0, b: 0 };
  // Default white
  return { r: 255, g: 255, b: 255 };
}

function applyTheme(themeObj) {
  for (const [key, value] of Object.entries(themeObj)) {
    document.documentElement.style.setProperty(key, value);
  }

  // CACHE the base color for mixing
  if (themeObj["--bg-cell"]) {
    cachedBaseColors = parseColorString(themeObj["--bg-cell"]);
  }

  // Also update existing cells to the new grid color if they are "empty"
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    // If cell is "blank" (percent 0), reset it to use the new var or update it.
    if (!cell.dataset.percent || cell.dataset.percent === "0") {
      cell.style.backgroundColor = "var(--bg-cell)";
    }
  });
}
