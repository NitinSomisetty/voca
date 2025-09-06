// 1) Create the right-click menu when the extension installs/updates
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "voca_save",
    title: "Save to Voca",
    contexts: ["selection"] // only show when some text is selected
  });
});

// 2) When the menu item is clicked, grab the selected text and fetch its meaning
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "voca_save" || !info.selectionText) return;

  const word = sanitizeToSingleWord(info.selectionText);
  if (!word) {
    console.warn("Voca: please select a single word.");
    return;
  }

  try {
    const { definition, example, phonetic } = await fetchDefinition(word);
    // For MVP we just log; later we’ll store & show in UI
    console.log("Voca →", {
      word,
      phonetic,
      definition,
      example: example || "(no example provided)"
    });
  } catch (err) {
    console.error("Voca: failed to fetch definition for", word, err);
  }
});

// --- Helpers ---

// Keep MVP predictable: reduce any selection to a single dictionary-friendly token
function sanitizeToSingleWord(text) {
  // Trim space, strip punctuation at both ends, collapse spaces, take first token
  const cleaned = text.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  // If user highlighted a phrase, take the first token for now
  const first = cleaned.split(/\s+/)[0] || "";
  // Lowercase for API consistency; you can remove .toLowerCase() if you want case preserved
  return first.toLowerCase();
}

async function fetchDefinition(word) {
  // Free Dictionary API (no key needed)
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // 404 here usually means the word isn't found in this API
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  const data = await res.json();
  const entry = data[0] || {};
  const phonetic =
    entry.phonetic ||
    (Array.isArray(entry.phonetics) && entry.phonetics[0]?.text) ||
    "";

  // meanings: [{ partOfSpeech, definitions: [{definition, example, ...}], ...}]
  const firstMeaning = Array.isArray(entry.meanings) ? entry.meanings[0] : null;
  const firstDef = firstMeaning?.definitions?.[0] || {};
  return {
    definition: firstDef.definition || "No definition found.",
    example: firstDef.example || "",
    phonetic
  };
}
