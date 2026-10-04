/* JavaScript for the Web Calculator (calculator.html).
   Loaded at the end of <body>, so all elements already exist when it runs. */

"use strict";

/* =========================================================
   1. GLOBAL VARIABLES
   ========================================================= */

// Binary operations: first number and chosen operator are stored here
// until the user presses "=".
let firstOperand = null;
let currentOperator = null;

// Error log: every error is stored as an object (timestamp, operation, input, message)
const errorLog = [];

// Button that was pressed last (for the "active" highlight)
let lastPressedButton = null;

// true while a CSV operation is "processing" (spinner visible)
let isProcessing = false;

const INFO_DEFAULT = "Information about the number";
const CSV_DELAY_MS = 400;

// Accepted number format: optional sign, digits with optional decimal part,
// optional exponent (needed because JavaScript shows huge results as e.g. 1e+21).
// Examples: 5, -3.75, +2, .5, 1e+21
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

// Readable names for the info field and the error log
const OPERATION_NAMES = {
  square: "Square",
  cube: "Cube",
  modulo: "Modulo",
  factorial: "Factorial",
  sqrt: "Square root",
  power: "Power",
  addition: "Addition",
  subtraction: "Subtraction",
  multiplication: "Multiplication",
  division: "Division",
  equal: "Equal",
  sum: "Sum",
  average: "Average",
  sort: "Sort",
  reverse: "Reverse",
  removelast: "Remove last",
  remove: "Remove element"
};

const OPERATOR_SYMBOLS = {
  addition: "+",
  subtraction: "−",
  multiplication: "×",
  division: "÷"
};


/* =========================================================
   2. HELPER FUNCTIONS
   ========================================================= */

// Short form of document.getElementById
function $(id) {
  return document.getElementById(id);
}

// Removes floating-point artifacts, e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3.
// 15 significant digits keep integers exact up to about 10^15.
function roundResult(x) {
  return parseFloat(x.toPrecision(15));
}

// Turns an array of numbers back into a CSV string for the display
function formatList(values) {
  return values.join(", ");
}

// Shows a neutral (non-error) message in the info field
function showMessage(text) {
  const info = $("info");
  info.classList.remove("error");
  info.textContent = text;
}

// Reads the display as a single number.
// Returns { input, value } or null if validation failed (error already shown).
function readNumber(operation) {
  const input = $("display").value;
  const check = validate(input, "number");
  if (!check.ok) {
    reportError(check.message, operation, input);
    return null;
  }
  return { input: input.trim(), value: check.value };
}

// Writes a numeric result to the display and updates the info field.
// Infinity (e.g. 10^400) is treated as "out of range".
function showResult(value, operation, input, detail) {
  if (!Number.isFinite(value)) {
    reportError("Error: The number is out of range.", operation, input);
    return;
  }
  const result = roundResult(value);
  $("display").value = String(result);
  fill_info(result, operation, detail);
}

// Writes a list result (sort, reverse, remove ...) to the display
function showList(values, operation, detail) {
  $("display").value = formatList(values);
  fill_info(values, operation, detail);
}


/* =========================================================
   3. VALIDATION (Task 5)
   ========================================================= */

// Central validation used by ALL operations.
// mode "number": exactly one number is expected.
// mode "list":   a CSV list (a single number also counts as a list of one).
// Returns { ok: true, value } or { ok: false, message }.
function validate(raw, mode) {
  const text = String(raw).trim();

  if (text === "") {
    return fail("Error: The field is empty.");
  }

  if (mode === "number") {
    if (text.includes(",")) {
      return fail("Error: This operation needs a single number, not a CSV list.");
    }
    return parseSingle(text);
  }

  // mode "list": check every entry separately
  const parts = text.split(",");
  const values = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part === "") {
      // catches "1,,3", "1,2," and ",5"
      return fail(`Error: The CSV list contains an empty value (position ${i + 1}).`);
    }
    const check = parseSingle(part);
    if (!check.ok) {
      return check;
    }
    values.push(check.value);
  }
  return { ok: true, value: values };
}

// Checks and converts ONE number
function parseSingle(text) {
  if (!NUMBER_PATTERN.test(text)) {
    return fail(`Error: '${text}' is not a valid number.`);
  }
  const number = Number(text);
  if (!Number.isFinite(number)) {
    return fail("Error: The number is out of range.");
  }
  return { ok: true, value: number };
}

function fail(message) {
  return { ok: false, message: message };
}


/* =========================================================
   4. INFORMATION FIELD (Task 1)
   ========================================================= */

// Called after EVERY successful calculation.
// result:    number or array (list operations)
// operation: key of OPERATION_NAMES (optional)
// detail:    extra text, e.g. "The number is positive." (optional)
function fill_info(result, operation, detail) {
  const info = $("info");
  info.classList.remove("error");

  // Main text: exactly the wording required by the assignment
  let mainText;
  if (Array.isArray(result)) {
    mainText = "Info: List of values processed.";
  } else if (result < 100) {
    mainText = "Info: The result is less than 100";
  } else if (result <= 200) {
    mainText = "Info: The result is between 100 and 200";
  } else {
    mainText = "Info: The result is greater than 200";
  }
  info.textContent = mainText;

  // Personalized second line (extension 1)
  const extra = [];
  if (operation) extra.push(`Operation: ${OPERATION_NAMES[operation]}.`);
  if (detail) extra.push(detail);

  if (extra.length > 0) {
    const span = document.createElement("span");
    span.className = "info-detail";
    span.textContent = " " + extra.join(" ");
    info.appendChild(span);
  }
}


/* =========================================================
   5. UNARY OPERATIONS (Task 2)
   ========================================================= */

function square() {
  const n = readNumber("square");
  if (!n) return;
  showResult(n.value * n.value, "square", n.input);
}

function cube() {
  const n = readNumber("cube");
  if (!n) return;
  showResult(n.value ** 3, "cube", n.input);
}

// Modulus: -X for negative numbers, X otherwise
function mod() {
  const n = readNumber("modulo");
  if (!n) return;
  const result = n.value < 0 ? -n.value : n.value;
  showResult(result, "modulo", n.input);
}

// Factorial: X * (X-1) * ... * 2 * 1, with 0! = 1
function fact() {
  const n = readNumber("factorial");
  if (!n) return;
  const x = n.value;

  if (!Number.isInteger(x) || x < 0) {
    reportError("Error: Factorial is only defined for non-negative integers.", "factorial", n.input);
    return;
  }
  // 171! is larger than the biggest number JavaScript can store (Infinity)
  if (x > 170) {
    reportError("Error: The number is out of range. Factorial works up to 170.", "factorial", n.input);
    return;
  }

  let result = 1;
  for (let i = x; i > 1; i--) {
    result *= i;
  }
  showResult(result, "factorial", n.input, `${x}! was calculated.`);
}

// Square root: info field says whether the number was positive or negative
function sqrt() {
  const n = readNumber("sqrt");
  if (!n) return;

  if (n.value < 0) {
    reportError("Error: Square root of a negative number is not allowed. The number is negative.", "sqrt", n.input);
    return;
  }
  const sign = n.value === 0 ? "The number is zero." : "The number is positive.";
  showResult(Math.sqrt(n.value), "sqrt", n.input, sign);
}

// Power: display value raised to the exponent from the second field
function power() {
  const base = readNumber("power");
  if (!base) return;

  const rawExponent = $("exponent").value;
  const exponent = validate(rawExponent, "number");
  if (!exponent.ok) {
    reportError(exponent.message.replace("Error:", "Error (exponent):"), "power", rawExponent);
    return;
  }

  const result = Math.pow(base.value, exponent.value);
  const input = `${base.input} ^ ${rawExponent.trim()}`;

  // e.g. (-8) ^ 0.5 has no real result -> NaN
  if (Number.isNaN(result)) {
    reportError("Error: A negative base with a decimal exponent has no real result.", "power", input);
    return;
  }
  showResult(result, "power", input, `${base.value} raised to the power of ${exponent.value}.`);
}


/* =========================================================
   6. BINARY OPERATIONS (Task 3)
   ========================================================= */

function calculate(a, operator, b) {
  if (operator === "addition") return a + b;
  if (operator === "subtraction") return a - b;
  if (operator === "multiplication") return a * b;
  if (operator === "division") return a / b;
  return NaN;
}

// Division by zero is checked before calculating (JavaScript would return Infinity)
function isDivisionByZero(operator, b) {
  return operator === "division" && b === 0;
}

// Stores the first number and the operator in the global variables
// and empties the display for the second number.
function setOperator(operator) {
  const raw = $("display").value.trim();

  // Operator pressed twice in a row: simply replace the operator
  if (currentOperator !== null && raw === "") {
    currentOperator = operator;
    $("pending").textContent = `${firstOperand} ${OPERATOR_SYMBOLS[operator]}`;
    showMessage(`Info: Operator changed to ${OPERATION_NAMES[operator]}.`);
    return;
  }

  const n = readNumber(operator);
  if (!n) return;

  if (currentOperator !== null) {
    // Chaining (e.g. 5 + 3 × 2): calculate the intermediate result first.
    // Calculated from left to right, like a simple pocket calculator.
    if (isDivisionByZero(currentOperator, n.value)) {
      reportError("Error: Division by zero is not allowed.", "division", raw);
      return;
    }
    const intermediate = calculate(firstOperand, currentOperator, n.value);
    if (!Number.isFinite(intermediate)) {
      reportError("Error: The number is out of range.", operator, raw);
      return;
    }
    firstOperand = roundResult(intermediate);
  } else {
    firstOperand = n.value;
  }

  currentOperator = operator;
  $("display").value = "";
  $("pending").textContent = `${firstOperand} ${OPERATOR_SYMBOLS[operator]}`;
  showMessage(`Info: ${firstOperand} stored. Enter the second number.`);
  $("display").focus();
}

// Calculates the result when "=" is pressed
function eq() {
  if (currentOperator === null) {
    reportError("Error: Choose an operator (+, −, × or ÷) before pressing =.", "equal", $("display").value);
    return;
  }
  if ($("display").value.trim() === "") {
    reportError("Error: Enter the second number before pressing =.", "equal", "");
    return;
  }

  const second = readNumber("equal");
  if (!second) return;

  const symbol = OPERATOR_SYMBOLS[currentOperator];
  const input = `${firstOperand} ${symbol} ${second.input}`;

  if (isDivisionByZero(currentOperator, second.value)) {
    reportError("Error: Division by zero is not allowed.", "division", input);
    return; // operator stays stored, so the user can enter another number
  }

  const result = calculate(firstOperand, currentOperator, second.value);
  const operation = currentOperator;

  // Reset the global variables for the next calculation
  firstOperand = null;
  currentOperator = null;
  $("pending").textContent = "";

  showResult(result, operation, input, `${input} was calculated.`);
}


/* =========================================================
   7. CSV OPERATIONS (Task 4)
   ========================================================= */

// Validates the list, shows the spinner for a moment and then
// runs the actual operation (action) with the list of numbers.
function runCsvOperation(operation, action) {
  const input = $("display").value;
  const list = validate(input, "list");
  if (!list.ok) {
    reportError(list.message, operation, input);
    return;
  }

  setProcessing(true);
  showMessage("Info: Processing list…");

  setTimeout(function () {
    setProcessing(false);
    action(list.value, input.trim());
  }, CSV_DELAY_MS);
}

// Shows or hides the loading spinner
function setProcessing(state) {
  isProcessing = state;
  $("spinner").hidden = !state;
  $("calculator").classList.toggle("busy", state);
  $("calculator").setAttribute("aria-busy", String(state));
}

function valuesText(count) {
  return count === 1 ? "1 value" : `${count} values`;
}

function sum() {
  runCsvOperation("sum", function (values, input) {
    const total = values.reduce((acc, v) => acc + v, 0);
    showResult(total, "sum", input, `List of values processed (${valuesText(values.length)}).`);
  });
}

function average() {
  runCsvOperation("average", function (values, input) {
    const total = values.reduce((acc, v) => acc + v, 0);
    showResult(total / values.length, "average", input, `List of values processed (${valuesText(values.length)}).`);
  });
}

// Numeric sort (the default sort() would sort alphabetically: 10 before 9)
function sort() {
  runCsvOperation("sort", function (values) {
    const sorted = values.slice().sort((a, b) => a - b);
    showList(sorted, "sort", `${valuesText(sorted.length)} sorted ascending.`);
  });
}

function reverse() {
  runCsvOperation("reverse", function (values) {
    const reversed = values.slice().reverse();
    showList(reversed, "reverse", `${valuesText(reversed.length)} reversed.`);
  });
}

function removelast() {
  runCsvOperation("removelast", function (values) {
    const removed = values[values.length - 1];
    const remaining = values.slice(0, -1);
    const rest = remaining.length === 0 ? "The list is now empty." : `${valuesText(remaining.length)} left.`;
    showList(remaining, "removelast", `Removed ${removed}. ${rest}`);
  });
}

// Removes one specific element, by value (first match) or by position (1 = first)
function removeElement() {
  runCsvOperation("remove", function (values) {
    const mode = document.querySelector('input[name="removeMode"]:checked').value;
    const rawTarget = $("removeValue").value;
    const target = validate(rawTarget, "number");

    if (!target.ok) {
      reportError(target.message.replace("Error:", "Error (remove field):"), "remove", rawTarget);
      return;
    }

    let index;
    if (mode === "value") {
      index = values.indexOf(target.value);
      if (index === -1) {
        reportError(`Error: The value ${target.value} is not in the list.`, "remove", rawTarget);
        return;
      }
    } else {
      const position = target.value;
      if (!Number.isInteger(position) || position < 1 || position > values.length) {
        reportError(`Error: The position must be a whole number between 1 and ${values.length}.`, "remove", rawTarget);
        return;
      }
      index = position - 1;
    }

    const removed = values[index];
    const remaining = values.filter((_, i) => i !== index);
    const rest = remaining.length === 0 ? "The list is now empty." : `${valuesText(remaining.length)} left.`;
    showList(remaining, "remove", `Removed ${removed} at position ${index + 1}. ${rest}`);
  });
}


/* =========================================================
   8. ERROR HANDLING AND LOGGING (Task 5)
   ========================================================= */

// Shows a specific error message (red) and writes it to the log
function reportError(message, operation, input) {
  const info = $("info");
  info.textContent = message;
  info.classList.add("error");
  logError(input, operation, message);
}

function logError(input, operation, message) {
  errorLog.push({
    timestamp: new Date().toISOString(),
    operation: OPERATION_NAMES[operation] || operation,
    input: String(input),
    message: message
  });
  updateErrorCount();
}

function updateErrorCount() {
  const n = errorLog.length;
  $("errorCount").textContent = n === 1 ? "1 error logged" : `${n} errors logged`;
}

// Puts a value in quotes so commas inside it (CSV input!) don't break the file
function csvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Creates a CSV file from the log and downloads it using a Blob
function downloadLog() {
  if (errorLog.length === 0) {
    showMessage("Info: No errors logged yet, so there is nothing to download.");
    return;
  }

  const header = "timestamp,operation,input,message";
  const rows = errorLog.map(e =>
    [e.timestamp, e.operation, e.input, e.message].map(csvField).join(",")
  );
  const content = [header, ...rows].join("\r\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `error-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showMessage(`Info: Error log downloaded (${errorLog.length} entries).`);
}


/* =========================================================
   9. CLEAR, BUTTON WIRING AND HIGHLIGHT
   ========================================================= */

function clearAll() {
  $("display").value = "";
  $("pending").textContent = "";
  firstOperand = null;
  currentOperator = null;
  showMessage(INFO_DEFAULT);
  $("display").focus();
}

// Button id -> function. Events are attached with addEventListener
const ACTIONS = {
  square: square,
  cube: cube,
  modulo: mod,
  factorial: fact,
  sqrt: sqrt,
  power: power,
  addition: () => setOperator("addition"),
  subtraction: () => setOperator("subtraction"),
  multiplication: () => setOperator("multiplication"),
  division: () => setOperator("division"),
  equal: eq,
  sum: sum,
  average: average,
  sort: sort,
  reverse: reverse,
  removelast: removelast,
  remove: removeElement,
  clear: clearAll,
  downloadLog: downloadLog
};

// Highlights the most recently pressed button
function setActive(button) {
  if (lastPressedButton) {
    lastPressedButton.classList.remove("active");
  }
  button.classList.add("active");
  lastPressedButton = button;
}

// Used by mouse clicks AND keyboard shortcuts
function triggerAction(id) {
  if (isProcessing) return; // ignore input while a CSV operation runs
  setActive($(id));
  ACTIONS[id]();
}

Object.keys(ACTIONS).forEach(function (id) {
  $(id).addEventListener("click", () => triggerAction(id));
});


/* =========================================================
   10. KEYBOARD SHORTCUTS (Accessibility)
   ========================================================= */

const LETTER_SHORTCUTS = {
  q: "square", c: "cube", m: "modulo", f: "factorial",
  r: "sqrt", p: "power", s: "sum", a: "average",
  o: "sort", v: "reverse", x: "removelast", d: "remove",
  l: "downloadLog"
};

document.addEventListener("keydown", function (event) {
  // Leave browser shortcuts like Ctrl+C untouched
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const target = event.target;
  const key = event.key;
  const inTextField = target.tagName === "INPUT" && target.type === "text";
  const inDisplay = target.id === "display";

  // Escape clears everywhere
  if (key === "Escape") {
    event.preventDefault();
    triggerAction("clear");
    return;
  }

  // Enter: buttons, radios and <summary> keep their normal behavior
  if (key === "Enter") {
    if (target.tagName === "BUTTON" || target.type === "radio" || target.tagName === "SUMMARY") return;
    event.preventDefault();
    if (target.id === "exponent") triggerAction("power");
    else if (target.id === "removeValue") triggerAction("remove");
    else triggerAction("equal");
    return;
  }

  // In the exponent / remove fields the user types freely
  if (inTextField && !inDisplay) return;

  // Operators work in the display and outside of text fields
  if (key === "+") { event.preventDefault(); triggerAction("addition"); return; }
  if (key === "*") { event.preventDefault(); triggerAction("multiplication"); return; }
  if (key === "/") { event.preventDefault(); triggerAction("division"); return; }

  // "-" is both the subtraction operator and the sign of a negative number.
  // It only counts as subtraction when the display already holds one valid number
  // (e.g. "5"). On an empty display or inside a list ("5, ") it types a minus sign.
  if (key === "-" && validate($("display").value, "number").ok) {
    event.preventDefault();
    triggerAction("subtraction");
    return;
  }
  if (key === "=") { event.preventDefault(); triggerAction("equal"); return; }

  // Inside the display: normal typing, no letter shortcuts
  if (inTextField) return;

  const action = LETTER_SHORTCUTS[key.toLowerCase()];
  if (action) {
    event.preventDefault();
    triggerAction(action);
    return;
  }

  // Typing a digit anywhere else jumps into the display
  if (/^[0-9.,-]$/.test(key)) {
    event.preventDefault();
    const display = $("display");
    display.focus();
    display.value += key;
  }
});


/* =========================================================
   11. START
   ========================================================= */
updateErrorCount();
$("display").focus();