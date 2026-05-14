const inputText = document.getElementById('inputText');
const verifyButton = document.getElementById('verifyButton');
const clearButton = document.getElementById('clearButton');
const resultCard = document.getElementById('resultCard');
const scoreLabel = document.getElementById('scoreLabel');
const statusLabel = document.getElementById('statusLabel');
const resultBadge = document.getElementById('resultBadge');
const explanationText = document.getElementById('explanationText');
const trustedSources = document.getElementById('trustedSources');
const realCount = document.getElementById('realCount');
const fakeCount = document.getElementById('fakeCount');
const voteButtons = document.querySelectorAll('[data-vote]');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const previewCard = document.getElementById('chatPreview');
const previewText = document.getElementById('previewText');
const forwardRiskLabel = document.getElementById('forwardRiskLabel');
const viralButton = document.getElementById('viralButton');
const viralSpreadText = document.getElementById('viralSpreadText');
const trustScore = document.getElementById('trustScore');

const FAKE_KEYWORDS = [
  'urgent forward',
  'share immediately',
  'must see',
  'breaking',
  'exclusive',
  'viral',
  'shocking',
  'act now',
  'donate now',
  'confirm',
  'verify this',
  'this is true',
  'it is real',
  'forward this',
];

const NEWS_PATTERNS = [
  /all caps/i,
  /!!!+/, 
  /click here/i,
  /only available/i,
  /for the first time/i,
  /you won/i,
  /you are selected/i,
];

const TRUSTED_SOURCES = [
  { name: 'BBC News', url: 'https://www.bbc.com/search?q=' },
  { name: 'Reuters', url: 'https://www.reuters.com/site-search/?query=' },
  { name: 'FactCheck.org', url: 'https://www.factcheck.org/?s=' },
  { name: 'AP News', url: 'https://apnews.com/hub/search?q=' },
];

function normalizeInput(text) {
  return text.trim().toLowerCase();
}

function getMessageKey(text) {
  return `verify-app:${btoa(unescape(encodeURIComponent(text))).slice(0, 32)}`;
}

function fetchVotes(text) {
  const saved = localStorage.getItem(getMessageKey(text));
  return saved ? JSON.parse(saved) : { real: 0, fake: 0 };
}

function saveVote(text, voteType) {
  const key = getMessageKey(text);
  const state = fetchVotes(text);
  state[voteType] += 1;
  localStorage.setItem(key, JSON.stringify(state));
  return state;
}

function computeTruthScore(text) {
  const normalized = normalizeInput(text);
  let score = 100;
  const reasons = [];

  const cleaned = normalized.replace(/\s+/g, ' ');
  const foundFakeKeywords = FAKE_KEYWORDS.filter((keyword) => cleaned.includes(keyword));
  if (foundFakeKeywords.length) {
    score -= Math.min(40, foundFakeKeywords.length * 10);
    reasons.push(`Detected suspicious phrases: ${foundFakeKeywords.join(', ')}`);
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 2) {
    score -= 15;
    reasons.push('Multiple exclamation marks signal urgency');
  }

  if (/\b(breaking|shocking|viral|must read|urgent)\b/i.test(text)) {
    score -= 10;
    reasons.push('Language resembles clickbait or viral rumor format');
  }

  const hasLink = /https?:\/\//i.test(text) || /www\./i.test(text);
  if (hasLink && /\.exe|\.zip|\.apk|\.scr/i.test(text)) {
    score -= 35;
    reasons.push('Link appears potentially unsafe or malicious');
  }

  const imageSignal = /\b(image|photo|screenshot|video)\b/i.test(text) || /\.(jpg|jpeg|png|gif|webp)$/i.test(text);
  if (imageSignal) {
    score -= 10;
    reasons.push('Input refers to an image or screenshot, which may be manipulated');
  }

  if (/\b(need to share|share now|send this)\b/i.test(text)) {
    score -= 10;
    reasons.push('Direct sharing instructions increase suspicion');
  }

  if (/\b(official|verified|authentic|confirmed)\b/i.test(text) && !/\b(false|scam|hoax)\b/i.test(text)) {
    score += 5;
    reasons.push('Contains verification-style words that may indicate factual tone');
  }

  if (/\b(gujarati|hindi|marathi|english|tamil)\b/i.test(text)) {
    reasons.push('Multi-language input detected');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

function getStatus(score) {
  if (score >= 80) return { label: 'Likely Real', className: 'status-real' };
  if (score >= 45) return { label: 'Suspicious', className: 'status-suspicious' };
  return { label: 'Likely Fake', className: 'status-fake' };
}

function buildExplanation(feedback) {
  if (!feedback.length) {
    return '<li>No strong fake signals were detected. Use community voting to refine the result.</li>';
  }
  return feedback.map((item) => `<li>${item}</li>`).join('');
}

function getForwardRisk(score) {
  if (score < 45) return 'HIGH';
  if (score < 70) return 'MEDIUM';
  return 'LOW';
}

function getViralSpreadText(score) {
  if (score < 45) return 'This message can reach 10,000 people in 2 hours ⚠️';
  if (score < 70) return 'This message can reach 4,500 people in 6 hours ⚠️';
  return 'This message could still spread, but it is less likely to go viral quickly.';
}

function updatePreview(text) {
  const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;
  if (!text.trim()) {
    previewCard.classList.add('hidden');
    return;
  }
  previewText.textContent = preview;
  previewCard.classList.remove('hidden');
}

function buildSourceLinks(text) {
  trustedSources.innerHTML = '';
  const query = encodeURIComponent(text.slice(0, 80));
  TRUSTED_SOURCES.forEach((source) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = source.name;
    link.href = `${source.url}${query}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.appendChild(link);
    trustedSources.appendChild(item);
  });
}

function renderResult(text) {
  const { score, reasons } = computeTruthScore(text);
  const votes = fetchVotes(text);
  const voteScore = Math.max(0, Math.min(100, score + (votes.real - votes.fake) * 4));
  const status = getStatus(voteScore);
  const explanation = buildExplanation(reasons);
  const risk = getForwardRisk(voteScore);
  const trust = Math.max(0, Math.min(100, 50 + (votes.real - votes.fake) * 8));

  resultCard.classList.remove('hidden');
  scoreLabel.textContent = `Truth Score: ${voteScore}%`;
  statusLabel.textContent = `Result: ${status.label}`;
  resultBadge.textContent = voteScore >= 60 ? 'GOOD' : voteScore >= 35 ? 'CAUTION' : 'WARNING';
  resultBadge.className = `result-badge ${status.className}`;
  forwardRiskLabel.textContent = `Forward Risk: ${risk}`;
  forwardRiskLabel.classList.remove('hidden');
  viralSpreadText.classList.add('hidden');
  explanationText.innerHTML = explanation;
  realCount.textContent = votes.real;
  fakeCount.textContent = votes.fake;
  trustScore.textContent = `Community trust: ${trust}%`;
  buildSourceLinks(text);

  if (voteScore < 45) {
    statusLabel.textContent += ' · Warning: This might be fake';
  }
}

function renderViralSpread(text) {
  const { score } = computeTruthScore(text);
  const votes = fetchVotes(text);
  const voteScore = Math.max(0, Math.min(100, score + (votes.real - votes.fake) * 4));
  viralSpreadText.textContent = getViralSpreadText(voteScore);
  viralSpreadText.classList.remove('hidden');
}

verifyButton.addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text) {
    inputText.focus();
    return;
  }
  updatePreview(text);
  renderResult(text);
});

clearButton.addEventListener('click', () => {
  inputText.value = '';
  imageUpload.value = '';
  imagePreviewContainer.classList.add('hidden');
  previewCard.classList.add('hidden');
  forwardRiskLabel.classList.add('hidden');
  viralSpreadText.classList.add('hidden');
  resultCard.classList.add('hidden');
});

imageUpload.addEventListener('change', () => {
  const file = imageUpload.files[0];
  if (!file) {
    imagePreviewContainer.classList.add('hidden');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreviewContainer.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

viralButton.addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text) return;
  renderViralSpread(text);
});

voteButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;
    const newState = saveVote(text, button.dataset.vote);
    renderResult(text);
    const summary = `${newState.real} real / ${newState.fake} fake votes`;
    button.textContent = `${button.dataset.vote === 'real' ? 'Real' : 'Fake'} ✓`;
    setTimeout(() => {
      button.textContent = button.dataset.vote === 'real' ? 'Real' : 'Fake';
    }, 900);
  });
});
