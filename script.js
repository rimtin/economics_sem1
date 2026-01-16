// ======================================================
//  BUILD MASTER QUESTION ARRAYS FROM UNIT FILES
// ======================================================

const mcqQuestions = [
  ...(window.unit1_mcq || []),
  ...(window.unit2_mcq || []),
  ...(window.unit3_mcq || []),
  ...(window.unit4_mcq || []),
  ...(window.unit5_mcq || []),
  ...(window.unit6_mcq || []),
  ...(window.unit7_mcq || []),
  ...(window.unit8_mcq || []),
  ...(window.unit9_mcq || []),
  ...(window.unit10_mcq || []),
  ...(window.unit11_mcq || []),
  ...(window.unit12_mcq || []),
  ...(window.unit13_mcq || []),
  ...(window.unit14_mcq || [])
];

const longQuestions = [
  ...(window.unit1_long || []),
  ...(window.unit2_long || []),
  ...(window.unit3_long || []),
  ...(window.unit4_long || []),
  ...(window.unit5_long || []),
  ...(window.unit6_long || []),
  ...(window.unit7_long || []),
  ...(window.unit8_long || []),
  ...(window.unit9_long || []),
  ...(window.unit10_long || []),
  ...(window.unit11_long || []),
  ...(window.unit12_long || []),
  ...(window.unit13_long || []),
  ...(window.unit14_long || [])
];


// ======================================================
//  STATE
// ======================================================

let currentMcqIndex = 0;
let currentLongIndex = 0;
let mcqScore = 0;
let mcqAttempts = 0;

let currentChapter = "all";
let filteredMcqIndices = [];
let filteredLongIndices = [];

// Quick Test (Test Yourself) mode
let isQuickTest = false;
let quickOrder = [];
let quickTotal = 0;
let quickPosition = 0;
const QUICK_TEST_LENGTH = 10;

// per-question answered flag (avoid double counting)
let mcqAnswered = false;

// display counter for chapter-wise learning
let mcqDisplayNumber = 0;

// ======================================================
//  ELEMENT REFERENCES
// ======================================================

const btnMcqMode = document.getElementById("btn-mcq");
const btnLongMode = document.getElementById("btn-long");

const mcqSection = document.getElementById("mcq-section");
const longSection = document.getElementById("long-section");

const mcqUnitEl = document.getElementById("mcq-unit");
const mcqCounterEl = document.getElementById("mcq-counter");
const mcqQuestionEl = document.getElementById("mcq-question");
const mcqOptionsEl = document.getElementById("mcq-options");
const mcqResultEl = document.getElementById("mcq-result");
const mcqScoreEl = document.getElementById("mcq-score");
const mcqAttemptsEl = document.getElementById("mcq-attempts");

const btnNextMcq = document.getElementById("btn-next-mcq");

const longUnitEl = document.getElementById("long-unit");
const longCounterEl = document.getElementById("long-counter");
const longQuestionEl = document.getElementById("long-question");
const longAnswerEl = document.getElementById("long-answer");
const btnShowModel = document.getElementById("btn-show-model");
const btnNextLong = document.getElementById("btn-next-long");
const modelBoxEl = document.getElementById("model-box");
const modelAnswerEl = document.getElementById("model-answer");

const chapterSelect = document.getElementById("chapter-select");
const btnQuickTest = document.getElementById("btn-quick-test");

const themeToggleBtn = document.getElementById("theme-toggle");

// ======================================================
//  THEME (LIGHT / DARK)
// ======================================================

function applyTheme(theme) {
  const body = document.body;
  if (theme === "dark") {
    body.classList.add("dark");
    themeToggleBtn.textContent = "☀️";
  } else {
    body.classList.remove("dark");
    themeToggleBtn.textContent = "🌙";
  }
  localStorage.setItem("quiz-theme", theme);
}

const savedTheme = localStorage.getItem("quiz-theme") || "light";
applyTheme(savedTheme);

themeToggleBtn.addEventListener("click", () => {
  const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
});

// ======================================================
//  MODE SWITCH (MCQ / LONG)
// ======================================================

btnMcqMode.addEventListener("click", () => {
  btnMcqMode.classList.add("active");
  btnLongMode.classList.remove("active");
  mcqSection.classList.remove("hidden");
  longSection.classList.add("hidden");
});

btnLongMode.addEventListener("click", () => {
  btnLongMode.classList.add("active");
  btnMcqMode.classList.remove("active");
  longSection.classList.remove("hidden");
  mcqSection.classList.add("hidden");
});

// ======================================================
//  CHAPTER HANDLING
// ======================================================

function getAllChapters() {
  const set = new Set();
  mcqQuestions.forEach((q) => set.add(q.unit));
  longQuestions.forEach((q) => set.add(q.unit));
  return Array.from(set);
}

function populateChapterSelect() {
  const chapters = getAllChapters().sort();
  chapters.forEach((ch) => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    chapterSelect.appendChild(opt);
  });
}

function exitQuickTest() {
  isQuickTest = false;
  btnQuickTest.classList.remove("active-test");
}

chapterSelect.addEventListener("change", () => {
  currentChapter = chapterSelect.value;

  // When chapter changes, switch back to learning mode
  exitQuickTest();
  mcqDisplayNumber = 0;

  updateFilteredIndices();
  resetScore();
  loadMcqQuestionFromFilter(true);
  if (longQuestions.length > 0) {
    loadLongQuestionFromFilter();
  }
});

function updateFilteredIndices() {
  if (currentChapter === "all") {
    filteredMcqIndices = mcqQuestions.map((_, i) => i);
    filteredLongIndices = longQuestions.map((_, i) => i);
  } else {
    filteredMcqIndices = mcqQuestions
      .map((q, i) => (q.unit === currentChapter ? i : -1))
      .filter((i) => i !== -1);

    filteredLongIndices = longQuestions
      .map((q, i) => (q.unit === currentChapter ? i : -1))
      .filter((i) => i !== -1);
  }

  if (filteredMcqIndices.length === 0) {
    filteredMcqIndices = mcqQuestions.map((_, i) => i);
  }
  if (filteredLongIndices.length === 0) {
    filteredLongIndices = longQuestions.map((_, i) => i);
  }
}

// ======================================================
//  MCQ LOGIC (AUTO-CHECK ON CLICK)
// ======================================================

function loadMcqQuestion(index) {
  const q = mcqQuestions[index];

  // Header label
  mcqUnitEl.textContent = isQuickTest ? "Quick Test – Mixed" : q.unit;

  // Question counter
  if (isQuickTest) {
    mcqCounterEl.textContent = `Q ${quickPosition + 1} of ${quickTotal}`;
  } else {
    mcqCounterEl.textContent = `Q ${mcqDisplayNumber} of ${filteredMcqIndices.length}`;
  }

  mcqQuestionEl.textContent = q.question;

  // reset UI
  mcqOptionsEl.innerHTML = "";
  mcqResultEl.textContent = "";
  mcqResultEl.className = "result-text";
  mcqAnswered = false; // new question, not answered yet

  q.options.forEach((opt, i) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "mcqOption";
    input.value = i;

    const span = document.createElement("span");
    span.textContent = opt;

    label.appendChild(input);
    label.appendChild(span);
    mcqOptionsEl.appendChild(label);

    // auto-check when option clicked
    label.addEventListener("click", () => handleMcqSelection(i));
  });
}

function handleMcqSelection(selectedIndex) {
  // prevent double counting
  if (mcqAnswered) return;
  mcqAnswered = true;

  const q = mcqQuestions[currentMcqIndex];
  mcqAttempts++;

  const optionLabels = mcqOptionsEl.querySelectorAll(".option");

  // lock and color options
  optionLabels.forEach((label, i) => {
    label.style.pointerEvents = "none";

    if (i === q.correctIndex) {
      label.style.background = "#d1fae5"; // green-ish
      label.style.borderColor = "#16a34a";
    } else if (i === selectedIndex) {
      label.style.background = "#fee2e2"; // red-ish
      label.style.borderColor = "#b91c1c";
    }
  });

  if (selectedIndex === q.correctIndex) {
    mcqScore++;
    mcqResultEl.textContent = "Correct ✅  " + q.explanation;
    mcqResultEl.className = "result-text correct";
  } else {
    mcqResultEl.textContent =
      "Wrong ❌  Correct answer: " +
      q.options[q.correctIndex] +
      ". " +
      q.explanation;
    mcqResultEl.className = "result-text wrong";
  }

  mcqScoreEl.textContent = mcqScore;
  mcqAttemptsEl.textContent = mcqAttempts;
}

// reset display counter if needed, and load random question from current chapter
function loadMcqQuestionFromFilter(resetDisplay = false) {
  if (filteredMcqIndices.length === 0) return;

  if (resetDisplay) {
    mcqDisplayNumber = 1;
  } else {
    mcqDisplayNumber += 1;
  }

  const randomIndex =
    filteredMcqIndices[Math.floor(Math.random() * filteredMcqIndices.length)];
  currentMcqIndex = randomIndex;
  loadMcqQuestion(currentMcqIndex);
}

btnNextMcq.addEventListener("click", () => {
  if (isQuickTest) {
    quickPosition++;
    if (quickPosition >= quickTotal) {
      mcqResultEl.textContent =
        "🎉 Quick Test finished! You scored " +
        mcqScore +
        " out of " +
        quickTotal +
        ".";
      mcqResultEl.className = "result-text correct";
      // stop quick test, stay on last question + result
      exitQuickTest();
      return;
    }
    currentMcqIndex = quickOrder[quickPosition];
    loadMcqQuestion(currentMcqIndex);
  } else {
    // normal learning mode
    loadMcqQuestionFromFilter(false);
  }
});

// ======================================================
//  QUICK TEST (Test Yourself)
// ======================================================

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

btnQuickTest.addEventListener("click", () => {
  if (mcqQuestions.length === 0) return;

  // toggle behaviour
  if (isQuickTest) {
    // turn OFF quick test and go back to chapter-wise learning
    exitQuickTest();
    mcqResultEl.textContent = "";
    mcqDisplayNumber = 0;
    loadMcqQuestionFromFilter(true);
    return;
  }

  // start Quick Test mode
  isQuickTest = true;
  btnQuickTest.classList.add("active-test");
  resetScore();

  quickOrder = shuffleArray(mcqQuestions.map((_, i) => i));
  quickTotal = Math.min(QUICK_TEST_LENGTH, quickOrder.length);
  quickPosition = 0;

  currentMcqIndex = quickOrder[0];
  loadMcqQuestion(currentMcqIndex);

  mcqResultEl.textContent =
    "Quick Test started! Answer each question and then tap Next Question.";
  mcqResultEl.className = "result-text";
});

// ======================================================
//  LONG ANSWER LOGIC
// ======================================================

function loadLongQuestion(index) {
  const q = longQuestions[index];
  longUnitEl.textContent = q.unit;

  const pos = filteredLongIndices.indexOf(index) + 1;
  longCounterEl.textContent = `Q ${pos} of ${filteredLongIndices.length}`;

  longQuestionEl.textContent = q.question;
  longAnswerEl.value = "";
  modelBoxEl.classList.add("hidden");
  modelAnswerEl.textContent = "";
}

function loadLongQuestionFromFilter() {
  if (filteredLongIndices.length === 0) return;
  const randomIndex =
    filteredLongIndices[Math.floor(Math.random() * filteredLongIndices.length)];
  currentLongIndex = randomIndex;
  loadLongQuestion(currentLongIndex);
}

btnShowModel.addEventListener("click", () => {
  const q = longQuestions[currentLongIndex];
  modelBoxEl.classList.remove("hidden");
  modelAnswerEl.textContent = q.keyPoints;
});

btnNextLong.addEventListener("click", () => {
  loadLongQuestionFromFilter();
});

// ======================================================
//  HELPERS & INIT
// ======================================================

function resetScore() {
  mcqScore = 0;
  mcqAttempts = 0;
  mcqScoreEl.textContent = mcqScore;
  mcqAttemptsEl.textContent = mcqAttempts;
  mcqResultEl.textContent = "";
  mcqResultEl.className = "result-text";
}

function init() {
  if (mcqQuestions.length === 0) {
    console.warn("No MCQ questions loaded – check unit JS includes.");
  }

  populateChapterSelect();
  currentChapter = "all";
  updateFilteredIndices();
  resetScore();

  if (mcqQuestions.length > 0) {
    loadMcqQuestionFromFilter(true); // start at Q1 of N
  }
  if (longQuestions.length > 0) {
    loadLongQuestionFromFilter();
  }
}

init();
