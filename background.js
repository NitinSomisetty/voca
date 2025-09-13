// 1) Create the right-click menu when the extension installs/updates
chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "voca_save",
		title: "Save to Voca",
		contexts: ["selection"], // only show when some text is selected
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
		const { definition, example } = await fetchWordInfo(word);
		// Prevent duplicate logging in console
		chrome.storage.local.get({ words: [] }, (result) => {
			const words = result.words;
			const normalized = word.toLowerCase();
			const already = words.find((w) => w.word.toLowerCase() === normalized);
			if (!already) {
				console.log("Voca →", {
					word,
					definition,
					example: example || "(no example provided)",
				});
			} else {
				console.log(`Voca: "${normalized}" already exists, skipping log.`);
			}
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

async function fetchWordInfo(word) {
	// 1. Try dictionaryapi.dev first
	const primaryURL = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
	let res = await fetch(primaryURL);
	let data = await res.json();

	let definition = data[0]?.meanings[0]?.definitions[0]?.definition || "";
	let example = data[0]?.meanings[0]?.definitions[0]?.example || null;

	// 2. If no example, fallback to Wordnik
	if (!example) {
		const fallbackURL = `https://api.wordnik.com/v4/word.json/${word}/examples?api_key=YOUR_API_KEY&limit=1`;
		let res2 = await fetch(fallbackURL);
		let data2 = await res2.json();

		example = data2.examples?.[0]?.text || null;
	}

	return { word, definition, example };

	// Save to Chrome storage
	chrome.storage.local.get({ words: [] }, (result) => {
		const words = result.words;

		// Normalize before checking
		const normalized = word.toLowerCase();
		const already = words.find((w) => w.word.toLowerCase() === normalized);

		if (!already) {
			words.push({ word: normalized, definition, example });
			chrome.storage.local.set({ words }, () => {
				console.log(`Voca: saved "${normalized}"`);
			});
		} else {
			console.log(`Voca: "${normalized}" already exists, skipping.`);
		}
	});
}
