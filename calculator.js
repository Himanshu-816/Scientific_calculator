// ==========================================
// NOVA CALC - SCIENTIFIC CALCULATOR LOGIC
// ==========================================

// DOM Elements
const display = document.getElementById("display");
const preview = document.getElementById("preview");
const statusMessage = document.getElementById("statusMessage");
const modeLabel = document.getElementById("modeLabel");
const buttonsContainer = document.querySelector(".buttons");

// Utility & History Elements
const angleToggleBtn = document.getElementById("angleToggle");
const themeToggleBtn = document.getElementById("themeToggle");
const clearHistoryBtn = document.getElementById("clearHistory");
const historyToggleBtn = document.getElementById("historyToggle");
const closeHistoryBtn = document.getElementById("closeHistory");
const historyPanel = document.getElementById("historyPanel");
const historyEmpty = document.getElementById("historyEmpty");
const historyList = document.getElementById("historyList");

// State
let angleMode = "DEG"; // "DEG" or "RAD"
let lastAnswer = 0;
let calculationHistory = [];
let justCalculated = false;
let listenersInitialized = false;

// ------------------------------------------
// Theme Handling
// ------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem("nova-calc-theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        if (themeToggleBtn) themeToggleBtn.textContent = "Dark mode";
    } else {
        document.body.classList.remove("light-theme");
        if (themeToggleBtn) themeToggleBtn.textContent = "Light mode";
    }
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    if (themeToggleBtn) {
        themeToggleBtn.textContent = isLight ? "Dark mode" : "Light mode";
    }
    localStorage.setItem("nova-calc-theme", isLight ? "light" : "dark");
    setStatus(isLight ? "Light mode enabled" : "Dark mode enabled");
}

// ------------------------------------------
// Angle Mode Handling (DEG / RAD)
// ------------------------------------------
function toggleAngleMode() {
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    updateModeDisplay();
    setStatus(`Mode: ${angleMode}`);
    updatePreview();
}

function updateModeDisplay() {
    if (modeLabel) {
        modeLabel.textContent = angleMode;
    }
}

function setStatus(text) {
    if (statusMessage) {
        statusMessage.textContent = text;
    }
}

// ------------------------------------------
// History Management
// ------------------------------------------
function toggleHistoryPanel() {
    if (!historyPanel) return;
    const isHidden = historyPanel.hasAttribute("hidden");
    if (isHidden) {
        historyPanel.removeAttribute("hidden");
        historyToggleBtn?.setAttribute("aria-expanded", "true");
    } else {
        historyPanel.setAttribute("hidden", "");
        historyToggleBtn?.setAttribute("aria-expanded", "false");
    }
}

function closeHistory() {
    if (!historyPanel) return;
    historyPanel.setAttribute("hidden", "");
    historyToggleBtn?.setAttribute("aria-expanded", "false");
}

function addHistoryEntry(expression, result) {
    const entry = { expression, result, id: Date.now() };
    calculationHistory.unshift(entry);
    if (calculationHistory.length > 50) calculationHistory.pop();
    renderHistory();
}

function renderHistory() {
    if (!historyList || !historyEmpty) return;

    if (calculationHistory.length === 0) {
        historyEmpty.style.display = "block";
        historyList.innerHTML = "";
        return;
    }

    historyEmpty.style.display = "none";
    historyList.innerHTML = calculationHistory
        .map(
            (item) => `
        <li>
            <button type="button" class="history-item" data-id="${item.id}" aria-label="Load ${item.expression} equals ${item.result}">
                <span class="history-expression">${escapeHtml(item.expression)} =</span>
                <span class="history-result">${escapeHtml(String(item.result))}</span>
            </button>
        </li>`
        )
        .join("");
}

function clearHistory() {
    calculationHistory = [];
    renderHistory();
    setStatus("History cleared");
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ------------------------------------------
// Core Input and Display Operations
// ------------------------------------------
function appendToDisplay(value) {
    const operators = ["+", "-", "*", "/"];

    // If a calculation was just performed and user types a number, start fresh
    if (justCalculated) {
        if (!operators.includes(value) && value !== "^" && value !== "%") {
            display.value = "";
        }
        justCalculated = false;
    }

    const lastChar = display.value.slice(-1);

    // Prevent multiple operators in a row
    if (operators.includes(value) && operators.includes(lastChar)) {
        display.value = display.value.slice(0, -1) + value;
        updatePreview();
        return;
    }

    // Prevent multiple dots in the current numeric segment
    if (value === ".") {
        const segments = display.value.split(/[\+\-\*\/\(\)\^]/);
        const currentSegment = segments[segments.length - 1];
        if (currentSegment.includes(".")) return;
        if (currentSegment === "") {
            display.value += "0.";
            updatePreview();
            return;
        }
    }

    // Handle Ans value
    if (value === "Ans") {
        display.value += lastAnswer;
        updatePreview();
        return;
    }

    display.value += value;
    updatePreview();
}

function clearDisplay() {
    display.value = "";
    preview.textContent = "0";
    justCalculated = false;
    setStatus("Ready");
}

function deleteLast() {
    if (justCalculated) {
        clearDisplay();
        return;
    }

    // Check if ends with a function token like "sin(", "cos(", "tan(", "log(", "ln(", "√("
    const fnTokens = ["sin(", "cos(", "tan(", "log(", "ln(", "√("];
    for (const token of fnTokens) {
        if (display.value.endsWith(token)) {
            display.value = display.value.slice(0, -token.length);
            updatePreview();
            return;
        }
    }

    display.value = display.value.slice(0, -1);
    updatePreview();
}

function getCurrentNumber() {
    const match = display.value.match(/-?\d*\.?\d+$/);
    return match ? Number(match[0]) : null;
}

function squareNumber() {
    const number = getCurrentNumber();
    if (number === null) {
        if (display.value.length > 0) {
            display.value += "^2";
            updatePreview();
        }
        return;
    }

    display.value =
        display.value.slice(0, display.value.length - String(number).length) +
        (number * number);
    updatePreview();
}

function squareRoot() {
    const number = getCurrentNumber();
    if (number !== null) {
        if (number < 0) {
            setStatus("Error: Negative square root");
            preview.textContent = "Error";
            return;
        }
        const root = Math.sqrt(number);
        const formatted = formatNumber(root);
        display.value =
            display.value.slice(0, display.value.length - String(number).length) +
            formatted;
        updatePreview();
        return;
    }

    // Otherwise insert function prefix
    appendToDisplay("√(");
}

function percentage() {
    const number = getCurrentNumber();
    if (number === null) {
        appendToDisplay("%");
        return;
    }

    const val = number / 100;
    display.value =
        display.value.slice(0, display.value.length - String(number).length) +
        formatNumber(val);
    updatePreview();
}

function reciprocal() {
    const number = getCurrentNumber();
    if (number === null) {
        appendToDisplay("1/(");
        return;
    }

    if (number === 0) {
        setStatus("Error: Division by zero");
        preview.textContent = "Error";
        return;
    }

    const val = 1 / number;
    display.value =
        display.value.slice(0, display.value.length - String(number).length) +
        formatNumber(val);
    updatePreview();
}

function toggleSign() {
    // If the expression ends with a number
    const match = display.value.match(/(-?\d*\.?\d+)$/);
    if (!match) {
        if (display.value === "") {
            display.value = "-";
        }
        return;
    }

    const numStr = match[1];
    const index = match.index;
    const prefix = display.value.slice(0, index);

    if (numStr.startsWith("-")) {
        display.value = prefix + numStr.slice(1);
    } else {
        display.value = prefix + "-" + numStr;
    }
    updatePreview();
}

// ------------------------------------------
// Scientific Functions (Trig, Log, Factorial)
// ------------------------------------------
function appendFunction(fnName) {
    if (justCalculated) {
        justCalculated = false;
    }

    // If display already ends in a number, wrap it: e.g. 30 -> sin(30)
    const match = display.value.match(/(\d*\.?\d+)$/);
    if (match) {
        const numStr = match[1];
        const prefix = display.value.slice(0, match.index);
        display.value = `${prefix}${fnName}(${numStr})`;
        updatePreview();
        return;
    }

    appendToDisplay(`${fnName}(`);
}

function appendFactorial() {
    const number = getCurrentNumber();
    if (number === null && !display.value.endsWith(")")) return;
    display.value += "!";
    updatePreview();
}

function trigSin(x) {
    if (angleMode === "DEG") {
        const norm = ((x % 360) + 360) % 360;
        if (norm === 0 || norm === 180) return 0;
        if (norm === 90) return 1;
        if (norm === 270) return -1;
        x = (x * Math.PI) / 180;
    }
    const res = Math.sin(x);
    return Math.abs(res) < 1e-15 ? 0 : res;
}

function trigCos(x) {
    if (angleMode === "DEG") {
        const norm = ((x % 360) + 360) % 360;
        if (norm === 90 || norm === 270) return 0;
        if (norm === 0) return 1;
        if (norm === 180) return -1;
        x = (x * Math.PI) / 180;
    }
    const res = Math.cos(x);
    return Math.abs(res) < 1e-15 ? 0 : res;
}

function trigTan(x) {
    if (angleMode === "DEG") {
        const norm = ((x % 180) + 180) % 180;
        if (norm === 90) throw new Error("Undefined");
        if (norm === 0) return 0;
        if (norm === 45) return 1;
        if (norm === 135) return -1;
        x = (x * Math.PI) / 180;
    }
    const res = Math.tan(x);
    return Math.abs(res) < 1e-15 ? 0 : res;
}

function mathLog(x) {
    if (x <= 0) throw new Error("Domain Error");
    return Math.log10(x);
}

function mathLn(x) {
    if (x <= 0) throw new Error("Domain Error");
    return Math.log(x);
}

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error("Invalid factorial");
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

// ------------------------------------------
// Expression Parsing & Calculation
// ------------------------------------------
function sanitizeAndPrepare(rawExpr) {
    if (!rawExpr || rawExpr.trim() === "") return null;

    let expr = rawExpr.trim();

    // Standardize unicode characters
    expr = expr.replace(/×/g, "*")
               .replace(/÷/g, "/")
               .replace(/−/g, "-");

    // Replace Ans
    expr = expr.replace(/\bAns\b/g, `(${lastAnswer})`);

    // Implicit multiplication:
    // e.g. 5( -> 5*(, )5 -> )*5, 5π -> 5*π, 5sin -> 5*sin
    expr = expr.replace(/(\d)(\()/g, "$1*$2");
    expr = expr.replace(/(\))(\d)/g, "$1*$2");
    expr = expr.replace(/(\))(\()/g, "$1*$2");
    expr = expr.replace(/(\d)(π|e|sin|cos|tan|log|ln|√)/g, "$1*$2");
    expr = expr.replace(/(\))(π|e|sin|cos|tan|log|ln|√)/g, "$1*$2");

    // Constants
    expr = expr.replace(/π/g, "(Math.PI)");
    expr = expr.replace(/\be\b/g, "(Math.E)");

    // Square root
    expr = expr.replace(/√\(/g, "Math.sqrt(");
    expr = expr.replace(/√(\d+(\.\d+)?)/g, "Math.sqrt($1)");

    // Factorials: e.g. 5! or (2+3)!
    while (expr.includes("!")) {
        const factorialRegex = /(\([^()]+?\)|\d+(\.\d+)?)\s*!/;
        if (!factorialRegex.test(expr)) break;
        expr = expr.replace(factorialRegex, "factorial($1)");
    }

    // Percentages: e.g. 50% -> (50/100)
    expr = expr.replace(/(\([^()]+?\)|\d+(\.\d+)?)\s*%/g, "(($1)/100)");

    // Exponents: ^ -> **
    expr = expr.replace(/\^/g, "**");

    // Scientific function mappings
    expr = expr.replace(/\bsin\b/g, "trigSin")
               .replace(/\bcos\b/g, "trigCos")
               .replace(/\btan\b/g, "trigTan")
               .replace(/\blog\b/g, "mathLog")
               .replace(/\bln\b/g, "mathLn");

    // Auto-balance unclosed parentheses
    const openParens = (expr.match(/\(/g) || []).length;
    const closeParens = (expr.match(/\)/g) || []).length;
    if (openParens > closeParens) {
        expr += ")".repeat(openParens - closeParens);
    }

    return expr;
}

function evaluateExpression(rawExpr) {
    const prepared = sanitizeAndPrepare(rawExpr);
    if (!prepared) return null;

    const fn = new Function(
        "trigSin",
        "trigCos",
        "trigTan",
        "mathLog",
        "mathLn",
        "factorial",
        `"use strict"; return (${prepared});`
    );

    const result = fn(trigSin, trigCos, trigTan, mathLog, mathLn, factorial);

    if (result === undefined || Number.isNaN(result)) {
        throw new Error("Invalid Calculation");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Overflow / Infinity");
    }

    return cleanFloat(result);
}

function cleanFloat(num) {
    if (typeof num !== "number") return num;
    // Format to avoid precision noise (e.g., 0.1 + 0.2 = 0.3)
    return parseFloat(num.toPrecision(12));
}

function formatNumber(num) {
    if (!Number.isFinite(num)) return "Error";
    const cleaned = cleanFloat(num);
    return String(cleaned);
}

function updatePreview() {
    if (!preview) return;
    if (!display.value.trim()) {
        preview.textContent = "0";
        return;
    }

    try {
        const val = evaluateExpression(display.value);
        if (val !== null) {
            preview.textContent = `= ${val}`;
        }
    } catch {
        // Incomplete expression, retain or show 0
        preview.textContent = "...";
    }
}

function calculateResult() {
    const expr = display.value.trim();
    if (!expr) return;

    try {
        const result = evaluateExpression(expr);
        if (result === null) return;

        const formattedResult = formatNumber(result);

        // Update History
        addHistoryEntry(expr, formattedResult);

        // Update display and preview
        preview.textContent = `${expr} =`;
        display.value = formattedResult;
        lastAnswer = result;
        justCalculated = true;
        setStatus("Calculated");
    } catch (err) {
        setStatus("Calculation Error");
        preview.textContent = "Error";
    }
}

// ------------------------------------------
// Event Listeners Setup
// ------------------------------------------
function setupEventListeners() {
    if (listenersInitialized) return;
    listenersInitialized = true;

    // 1. Calculator Button Grid (Event Delegation)
    if (buttonsContainer) {
        buttonsContainer.addEventListener("click", handleButtonClick);
    }

    // 2. Display Input field sync
    if (display) {
        display.addEventListener("input", updatePreview);
        display.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                calculateResult();
            } else if (e.key === "Escape") {
                e.preventDefault();
                clearDisplay();
            }
        });
    }

    // 3. Utility Controls
    angleToggleBtn?.addEventListener("click", toggleAngleMode);
    themeToggleBtn?.addEventListener("click", toggleTheme);
    clearHistoryBtn?.addEventListener("click", clearHistory);

    // 4. History Panel Toggle & Close
    historyToggleBtn?.addEventListener("click", toggleHistoryPanel);
    closeHistoryBtn?.addEventListener("click", closeHistory);

    // 5. History List Selection
    historyList?.addEventListener("click", (e) => {
        const itemBtn = e.target.closest(".history-item");
        if (!itemBtn) return;
        const entryId = Number(itemBtn.dataset.id);
        const entry = calculationHistory.find((item) => item.id === entryId);
        if (entry) {
            display.value = String(entry.result);
            preview.textContent = `${entry.expression} =`;
            setStatus("Loaded from history");
            closeHistory();
            updatePreview();
        }
    });

    // 6. Global Keyboard Shortcuts
    window.addEventListener("keydown", handleGlobalKeyboard);
}

function handleButtonClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const value = button.dataset.value;

    if (value !== undefined) {
        appendToDisplay(value);
        return;
    }

    switch (action) {
        case "clear":
            clearDisplay();
            break;
        case "backspace":
            deleteLast();
            break;
        case "equals":
            calculateResult();
            break;
        case "sin":
        case "cos":
        case "tan":
        case "log":
        case "ln":
            appendFunction(action);
            break;
        case "sqrt":
            squareRoot();
            break;
        case "square":
            squareNumber();
            break;
        case "reciprocal":
            reciprocal();
            break;
        case "sign":
            toggleSign();
            break;
        case "factorial":
            appendFactorial();
            break;
        case "percent":
            percentage();
            break;
    }
}

function handleGlobalKeyboard(event) {
    // If the user is actively typing directly inside the display input, let native input handle text
    if (document.activeElement === display) {
        return;
    }

    const key = event.key;

    if (key >= "0" && key <= "9") {
        appendToDisplay(key);
    } else if (["+", "-", "*", "/", "(", ")", "^", "%", "."].includes(key)) {
        appendToDisplay(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculateResult();
    } else if (key === "Backspace") {
        deleteLast();
    } else if (key === "Escape") {
        clearDisplay();
    } else if (key === "s" || key === "S") {
        appendFunction("sin");
    } else if (key === "c" || key === "C") {
        appendFunction("cos");
    } else if (key === "t" || key === "T") {
        appendFunction("tan");
    } else if (key === "p" || key === "P") {
        appendToDisplay("π");
    } else if (key === "e" || key === "E") {
        appendToDisplay("e");
    } else if (key === "!") {
        appendFactorial();
    }
}

// ------------------------------------------
// Initialization
// ------------------------------------------
function init() {
    initTheme();
    updateModeDisplay();
    setupEventListeners();
    updatePreview();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
