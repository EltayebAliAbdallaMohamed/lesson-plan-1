const lessonList = document.querySelector("#lesson-list");
const statusMessage = document.querySelector("#status");
const languageButtons = document.querySelectorAll(".language-button");
const textSizeToggle = document.querySelector("#text-size-toggle");
const contrastToggle = document.querySelector("#contrast-toggle");

const fields = [
  { key: "lessonTitle", label: "Lesson title" },
  { key: "unitNumber", label: "Unit number" },
  { key: "bookTitle", label: "Book title" },
  { key: "pageNumber", label: "Page number" },
  { key: "audioFile", label: "Audio file" },
  { key: "englishScript", label: "English script", language: "en" },
  { key: "arabicTranslation", label: "Arabic translation", language: "ar", direction: "rtl" },
  { key: "question", label: "Question about the audio" },
  { key: "answer", label: "Answer" }
];

function hasContent(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function makeTextDetail(label, value, options = {}) {
  if (!hasContent(value)) return null;

  const detail = document.createElement("details");
  detail.className = "lesson-detail";
  if (options.language) detail.dataset.language = options.language;

  const summary = document.createElement("summary");
  summary.textContent = label;
  detail.append(summary);

  const content = document.createElement("div");
  content.className = "detail-content selectable-text";
  content.textContent = String(value).trim();
  if (options.language) content.lang = options.language;
  if (options.direction) content.dir = options.direction;
  detail.append(content);

  return detail;
}

function makeAudioDetail(filename) {
  if (!hasContent(filename)) return null;

  const detail = document.createElement("details");
  detail.className = "lesson-detail audio-detail";
  const summary = document.createElement("summary");
  summary.textContent = "Audio file";
  detail.append(summary);

  const content = document.createElement("div");
  content.className = "detail-content audio-content";
  const name = document.createElement("p");
  name.textContent = String(filename).trim();
  content.append(name);

  // Accept local paths or HTTP(S) URLs only; never use arbitrary executable schemes.
  const source = String(filename).trim();
  const isWebUrl = /^https?:\/\//i.test(source);
  const isLocalPath = !/^[a-z][a-z\d+.-]*:/i.test(source) && !source.startsWith("//");
  if (isWebUrl || isLocalPath) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.setAttribute("aria-label", "Lesson audio playback");
    const audioSource = document.createElement("source");
    audioSource.src = source;
    audio.append(audioSource);
    content.append(audio);
  }

  detail.append(content);
  return detail;
}

function renderLesson(lesson, index) {
  const card = document.createElement("article");
  card.className = "lesson-card";
  card.setAttribute("aria-labelledby", `lesson-heading-${index + 1}`);

  const heading = document.createElement("h3");
  heading.className = "lesson-number";
  heading.id = `lesson-heading-${index + 1}`;
  heading.textContent = hasContent(lesson.lessonTitle)
    ? `Lesson ${index + 1}: ${String(lesson.lessonTitle).trim()}`
    : `Lesson ${index + 1}`;
  card.append(heading);

  const details = document.createElement("div");
  details.className = "details-list";

  for (const field of fields) {
    if (field.key === "audioFile") {
      const audioDetail = makeAudioDetail(lesson[field.key]);
      if (audioDetail) details.append(audioDetail);
    } else {
      const detail = makeTextDetail(field.label, lesson[field.key], field);
      if (detail) details.append(detail);
    }
  }

  if (!details.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "empty-lesson";
    empty.textContent = "This lesson plan is ready to be filled in.";
    card.append(empty);
  } else {
    card.append(details);
  }

  const speakControls = document.createElement("div");
  speakControls.className = "speech-controls";
  speakControls.setAttribute("role", "group");
  speakControls.setAttribute("aria-label", `Text-to-speech controls for lesson ${index + 1}`);

  const speakButton = document.createElement("button");
  speakButton.type = "button";
  speakButton.className = "option-button speak-button";
  speakButton.textContent = "Read selected text aloud";
  speakButton.addEventListener("click", () => speakSelectedText(speakButton));
  speakControls.append(speakButton);

  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.className = "option-button stop-speech-button";
  stopButton.textContent = "Stop speaking";
  stopButton.addEventListener("click", stopSpeech);
  speakControls.append(stopButton);
  card.append(speakControls);

  return card;
}

function getSelectedLessonText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const node = selection.anchorNode;
  const element = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  const selectedContent = element && element.closest(".selectable-text");
  if (!selectedContent || !lessonList.contains(selectedContent)) return null;

  return { text, language: selectedContent.lang || "en" };
}

function speakSelectedText(button) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    statusMessage.textContent = "Text-to-speech is not supported in this browser.";
    return;
  }

  const selected = getSelectedLessonText();
  if (!selected) {
    statusMessage.textContent = "Select text inside a lesson script, question, or answer first.";
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(selected.text);
  utterance.lang = selected.language === "ar" ? "ar-SA" : "en-US";

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((candidate) => candidate.lang.toLowerCase().startsWith(selected.language));
  if (voice) utterance.voice = voice;

  utterance.onstart = () => { statusMessage.textContent = `Speaking selected ${selected.language === "ar" ? "Arabic" : "English"} text.`; };
  utterance.onend = () => { statusMessage.textContent = "Speech finished."; };
  utterance.onerror = (event) => {
    statusMessage.textContent = event.error === "canceled" ? "Speech stopped." : "Could not speak the selected text. Try another browser or device voice.";
  };
  button.setAttribute("aria-label", "Reading selected text aloud");
  window.speechSynthesis.speak(utterance);
  selectionCleanup();
}

function selectionCleanup() {
  const selection = window.getSelection();
  if (selection) selection.removeAllRanges();
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    statusMessage.textContent = "Speech stopped.";
  }
}

function setLanguage(language) {
  document.querySelectorAll("[data-language]").forEach((detail) => {
    detail.hidden = detail.dataset.language !== language;
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  try { localStorage.setItem("lesson-language", language); } catch { /* Storage may be disabled. */ }
}

function setPreference(key, enabled, className, button) {
  document.body.classList.toggle(className, enabled);
  button.setAttribute("aria-pressed", String(enabled));
  try { localStorage.setItem(key, String(enabled)); } catch { /* Storage may be disabled. */ }
}

function readPreference(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

textSizeToggle.addEventListener("click", () => {
  setPreference("lesson-large-text", !document.body.classList.contains("large-text"), "large-text", textSizeToggle);
});

contrastToggle.addEventListener("click", () => {
  setPreference("lesson-high-contrast", !document.body.classList.contains("high-contrast"), "high-contrast", contrastToggle);
});

async function loadLessons() {
  try {
    const response = await fetch("data.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Could not load lesson plans (${response.status}).`);

    const lessons = await response.json();
    if (!Array.isArray(lessons)) throw new Error("Lesson data must be a JSON array.");

    const validLessons = lessons.filter((lesson) => lesson && typeof lesson === "object" && !Array.isArray(lesson));
    if (!validLessons.length) {
      statusMessage.textContent = "No lesson plans yet. Add a lesson to data.json to get started.";
      return;
    }

    const fragment = document.createDocumentFragment();
    validLessons.forEach((lesson, index) => fragment.append(renderLesson(lesson, index)));
    lessonList.replaceChildren(fragment);

    const populatedCount = validLessons.filter((lesson) =>
      fields.some((field) => hasContent(lesson[field.key]))
    ).length;
    statusMessage.textContent = populatedCount
      ? `${validLessons.length} lesson plan${validLessons.length === 1 ? "" : "s"} available.`
      : "Your lesson plan template is ready. Add information in data.json; blank sections stay hidden.";

    let language = "en";
    try {
      const savedLanguage = localStorage.getItem("lesson-language");
      if (savedLanguage === "en" || savedLanguage === "ar") language = savedLanguage;
    } catch { /* Use English if storage is unavailable. */ }
    setLanguage(language);
  } catch (error) {
    statusMessage.textContent = "Lesson plans could not be loaded. Please check that data.json is valid JSON and try again.";
    console.error(error);
  } finally {
    lessonList.setAttribute("aria-busy", "false");
  }
}

setPreference("lesson-large-text", readPreference("lesson-large-text", false), "large-text", textSizeToggle);
setPreference("lesson-high-contrast", readPreference("lesson-high-contrast", false), "high-contrast", contrastToggle);
loadLessons();
