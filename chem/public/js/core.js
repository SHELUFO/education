function readDocs() {
  try {
    const docs = JSON.parse(localStorage.getItem("chem_docs") || "[]");
    return Array.isArray(docs) ? docs : [];
  } catch (error) {
    return [];
  }
}

function saveDocs(docs) {
  localStorage.setItem("chem_docs", JSON.stringify(docs));
}

const PROFILE_KEY = "chem_learning_profile_v1";
const DAILY_KEY = "chem_daily_practice_v1";

function emptyProfile() {
  return {
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    moduleStats: {},
    wrongIds: [],
    completedModules: [],
    history: [],
    updatedAt: ""
  };
}

function normalizeProfile(profile) {
  const base = emptyProfile();
  if (!profile || typeof profile !== "object") return base;
  const moduleStats = profile.moduleStats && typeof profile.moduleStats === "object" ? profile.moduleStats : {};
  return {
    ...base,
    answered: Math.max(0, Number(profile.answered) || 0),
    correct: Math.max(0, Number(profile.correct) || 0),
    streak: Math.max(0, Number(profile.streak) || 0),
    bestStreak: Math.max(0, Number(profile.bestStreak) || 0),
    moduleStats,
    wrongIds: Array.isArray(profile.wrongIds) ? [...new Set(profile.wrongIds)].filter(Boolean) : [],
    completedModules: Array.isArray(profile.completedModules) ? [...new Set(profile.completedModules)].filter(Boolean) : [],
    history: Array.isArray(profile.history) ? profile.history.slice(-200) : [],
    updatedAt: profile.updatedAt || ""
  };
}

function readProfile() {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"));
  } catch (error) {
    return emptyProfile();
  }
}

function saveProfile(profile) {
  const normalized = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() });
  localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}

function resetProfile() {
  if (!confirm("确定清空本地学习记录吗？题库和资料不会被删除。")) return;
  state.profile = saveProfile(emptyProfile());
  render();
}

function exportProfile() {
  const payload = {
    app: "Chem Web",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: normalizeProfile(state.profile)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chem-learning-profile-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importProfile() {
  const input = document.getElementById("profileImportContent");
  const raw = input ? input.value.trim() : "";
  if (!raw) return alert("请先粘贴学习记录 JSON。");
  try {
    const parsed = JSON.parse(raw);
    state.profile = saveProfile(parsed.profile || parsed);
    render();
  } catch (error) {
    alert("学习记录 JSON 无法解析。");
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDailyPractice() {
  try {
    const value = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
    if (!value || value.date !== todayKey() || !Array.isArray(value.questionIds)) return null;
    return {
      date: value.date,
      questionIds: value.questionIds.filter(Boolean),
      answers: value.answers && typeof value.answers === "object" ? value.answers : {}
    };
  } catch (error) {
    return null;
  }
}

function saveDailyPractice(daily) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
  return daily;
}

function getDailyPractice() {
  const existing = readDailyPractice();
  if (existing && existing.questionIds.length) return existing;
  return saveDailyPractice(buildDailyPractice());
}

function resetDailyPractice() {
  state.dailyPractice = saveDailyPractice(buildDailyPractice(true));
  state.dailyIndex = 0;
  state.selected = null;
  state.view = "daily";
  render();
}

function startDailyPractice() {
  state.dailyPractice = getDailyPractice();
  state.dailyIndex = 0;
  state.selected = null;
  state.view = "daily";
  state.viewTransition = true;
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChemText(value) {
  let text = escapeHtml(value);
  const tokenPattern = /(^|[^A-Za-z])((?:[A-Z][a-z]?\d*|\([A-Za-z0-9+\-]+\)\d*)+(?:\^\d*[+\-]|\d*[+\-])?)(?![a-z])/g;
  text = text.replace(tokenPattern, (match, prefix, token) => `${prefix}${formatChemToken(token)}`);
  text = text
    .replace(/-&gt;/g, '<span class="rxn-arrow">→</span>')
    .replace(/=&gt;/g, '<span class="rxn-arrow">→</span>');
  return text;
}

function formatChemToken(token) {
  const chargeMatch = token.match(/(?:\^(\d*)([+\-])|(\d*)([+\-]))$/);
  let body = token;
  let charge = "";
  if (chargeMatch && /[A-Za-z0-9)]/.test(token[token.length - chargeMatch[0].length - 1] || "")) {
    body = token.slice(0, -chargeMatch[0].length);
    const amount = chargeMatch[1] || chargeMatch[3] || "";
    const sign = chargeMatch[2] || chargeMatch[4];
    charge = `<sup>${amount}${sign}</sup>`;
  }

  const formattedBody = body
    .replace(/\)(\d+)/g, ")<sub>$1</sub>")
    .replace(/([A-Z][a-z]?)(\d+)/g, "$1<sub>$2</sub>");
  return `<span class="chem">${formattedBody}${charge}</span>`;
}

function normalizeDoc(doc) {
  return {
    title: doc && doc.title ? doc.title : "Untitled",
    type: doc && doc.type ? doc.type : "",
    content: doc && doc.content ? doc.content : ""
  };
}

const allNodes = [...new Set(DATA.edges.flatMap((edge) => [edge.from, edge.to]))].sort((a, b) => a.localeCompare(b, "zh-CN"));

const state = {
  view: "home",
  moduleId: DATA.courseModules[0].id,
  classroomId: DATA.classroomUnits[0].id,
  activeNode: "",
  networkMode: "focus",
  networkScale: 1,
  networkSearch: "",
  networkModuleId: "all",
  networkPathTarget: "",
  viewTransition: true,
  courseMenuOpen: false,
  questionIndex: 0,
  selected: null,
  difficulty: "all",
  questionType: "all",
  practiceModuleId: "all",
  stageId: "none",
  blueprintId: (DATA.paperBlueprints && DATA.paperBlueprints[0] && DATA.paperBlueprints[0].id) || "",
  paperMode: "preset",
  customDifficultyId: "balanced",
  customTypeProfileId: "balanced",
  customTotalCount: 12,
  customTotalScore: 100,
  customWeights: {},
  generatedPaper: null,
  docs: readDocs().map(normalizeDoc),
  profile: readProfile(),
  dailyPractice: readDailyPractice(),
  dailyIndex: 0,
  wrongOnly: false
};

const difficultyProfiles = [
  { id: "foundation", title: "基础优先", weights: [["base", 72], ["boost", 24], ["full", 4]] },
  { id: "balanced", title: "均衡提升", weights: [["base", 42], ["boost", 42], ["full", 16]] },
  { id: "sprint", title: "冲刺拔高", weights: [["base", 20], ["boost", 42], ["full", 38]] }
];
const questionTypeProfiles = [
  { id: "balanced", title: "题型均衡", weights: [["single_choice", 40], ["true_false", 10], ["fill_blank", 15], ["short_answer", 15], ["calculation", 10], ["experiment", 10]] },
  { id: "objective", title: "客观题多", weights: [["single_choice", 60], ["true_false", 20], ["fill_blank", 20]] },
  { id: "big", title: "大题强化", weights: [["single_choice", 20], ["fill_blank", 10], ["short_answer", 15], ["calculation", 15], ["experiment", 15], ["process", 15], ["inference", 10]] }
];
const questionTypeTitles = {
  single_choice: "选择题",
  true_false: "判断题",
  fill_blank: "填空题",
  short_answer: "简答题",
  calculation: "计算题",
  experiment: "实验题",
  process: "流程大题",
  inference: "推断题"
};

function initCustomWeights() {
  const blueprint = (DATA.paperBlueprints || [])[0] || { moduleWeights: [] };
  state.customWeights = blueprint.moduleWeights.reduce((map, [id, weight]) => {
    map[id] = weight;
    return map;
  }, {});
}

initCustomWeights();

const views = [
  ["home", "首页"],
  ["network", "网络"],
  ["learn", "学习"],
  ["practice", "练习"],
  ["daily", "每日练"],
  ["library", "资料"]
];

function setView(view) {
  state.viewTransition = state.view !== view;
  state.view = view;
  state.courseMenuOpen = false;
  state.selected = null;
  render();
}

function toggleCourseMenu() {
  state.courseMenuOpen = !state.courseMenuOpen;
  render();
}

function closeCourseMenu() {
  state.courseMenuOpen = false;
  render();
}

function selectModule(id) {
  state.moduleId = id;
  const module = getActiveModule();
  const relatedNodes = getModuleNodes(module);
  state.activeNode = relatedNodes.includes(state.activeNode) ? state.activeNode : relatedNodes[0] || state.activeNode;
  state.courseMenuOpen = false;
  render();
}

function selectClassroom(id) {
  state.classroomId = id;
  render();
}

function selectNode(encodedNode) {
  state.activeNode = decodeURIComponent(encodedNode);
  render();
}

function setNetworkNode(encodedNode) {
  state.activeNode = decodeURIComponent(encodedNode);
  state.networkMode = "focus";
  render();
}

function selectOverviewNode(encodedNode) {
  state.activeNode = decodeURIComponent(encodedNode);
  state.networkMode = "focus";
  state.viewTransition = false;
  render();
}

function setNetworkMode(mode) {
  state.networkMode = mode;
  state.viewTransition = false;
  render();
}

function applyNetworkScale(nextScale, event) {
  const previousScale = state.networkScale || 1;
  const next = Math.max(0.5, Math.min(5, Number(nextScale) || 1));
  const frame = document.getElementById("networkOverviewFrame");
  const image = document.getElementById("networkOverviewImage");
  const label = document.getElementById("networkScaleLabel");

  let pointerX = 0;
  let pointerY = 0;
  let contentX = 0;
  let contentY = 0;
  if (frame && event && previousScale > 0) {
    const rect = frame.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
    contentX = frame.scrollLeft + pointerX;
    contentY = frame.scrollTop + pointerY;
  }

  state.networkScale = next;
  if (image) image.style.transform = `scale(${next})`;
  if (label) label.textContent = `${Math.round(next * 100)}%`;

  if (frame && event && previousScale > 0) {
    const ratio = next / previousScale;
    frame.scrollLeft = contentX * ratio - pointerX;
    frame.scrollTop = contentY * ratio - pointerY;
  }
}

function zoomNetwork(delta) {
  applyNetworkScale(state.networkScale + delta);
}

function resetNetworkZoom() {
  applyNetworkScale(1);
}

function handleNetworkWheel(event) {
  if (state.networkMode !== "overview") return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.12 : 0.12;
  applyNetworkScale(state.networkScale + delta, event);
}

function setNetworkSearch(value) {
  state.networkSearch = value || "";
  state.viewTransition = false;
  render();
}

function setNetworkFilter(id) {
  state.networkModuleId = id || "all";
  state.viewTransition = false;
  render();
}

function setNetworkPathTarget(encodedNode) {
  state.networkPathTarget = decodeURIComponent(encodedNode || "");
  state.viewTransition = false;
  render();
}

function learnNode(encodedNode) {
  state.activeNode = decodeURIComponent(encodedNode);
  const module = getNodeModules(state.activeNode)[0];
  if (module) state.moduleId = module.id;
  state.view = "learn";
  render();
}

function getActiveModule() {
  return DATA.courseModules.find((item) => item.id === state.moduleId) || DATA.courseModules[0];
}

function getActiveClassroom() {
  return DATA.classroomUnits.find((item) => item.id === state.classroomId) || DATA.classroomUnits[0];
}

function moduleText(module) {
  return [
    module.title,
    module.level,
    module.target,
    module.chain,
    ...(module.essentials || []),
    ...(module.traps || []),
    module.example && module.example.stem,
    module.example && module.example.answer
  ].filter(Boolean).join(" ");
}

function moduleTerms(module) {
  return [
    module.title,
    ...(module.chain || "").split("->"),
    ...(module.title || "").split(/[与和及、]/)
  ].map((term) => term.trim()).filter((term) => term.length >= 2);
}

function edgeMatchesModule(edge, module) {
  const text = moduleText(module);
  if ([edge.from, edge.to, edge.topic].some((value) => value && text.includes(value))) return true;
  return moduleTerms(module).some((term) => (
    edge.from.includes(term) ||
    edge.to.includes(term) ||
    edge.use.includes(term) ||
    term.includes(edge.from) ||
    term.includes(edge.to)
  ));
}

function getModuleEdges(module) {
  return DATA.edges.filter((edge) => edgeMatchesModule(edge, module)).slice(0, 10);
}

function getModuleNodes(module) {
  return [...new Set(getModuleEdges(module).flatMap((edge) => [edge.from, edge.to]))];
}

function getNodeEdges(node) {
  return DATA.edges.filter((edge) => edge.from === node || edge.to === node);
}

function getConnectedNodes(node) {
  return [...new Set(getNodeEdges(node).flatMap((edge) => [edge.from, edge.to]).filter((item) => item !== node))];
}

function getNodeModules(node) {
  return DATA.courseModules.filter((module) => moduleText(module).includes(node) || getModuleNodes(module).includes(node));
}

function percent(part, total) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function moduleTitle(id) {
  return (DATA.courseModules.find((module) => module.id === id) || { title: id || "未分类" }).title;
}

function questionById(id) {
  return DATA.questions.find((question) => question.id === id);
}

function getModuleQuestionCounts() {
  return DATA.questions.reduce((map, question) => {
    const id = question.moduleId || "unknown";
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});
}

function getTypeQuestionCounts() {
  return DATA.questions.reduce((map, question) => {
    const type = questionTypeOf(question);
    map[type] = (map[type] || 0) + 1;
    return map;
  }, {});
}

function readinessSnapshot() {
  const moduleCounts = getModuleQuestionCounts();
  const typeCounts = getTypeQuestionCounts();
  const modulesBelowTarget = DATA.courseModules
    .map((module) => ({ id: module.id, title: module.title, count: moduleCounts[module.id] || 0 }))
    .filter((item) => item.count < 30);
  const typeGaps = Object.keys(questionTypeTitles)
    .map((type) => ({ type, title: questionTypeTitles[type], count: typeCounts[type] || 0 }))
    .filter((item) => item.count < 20);
  const reviewed = DATA.questions.filter((question) => question.reviewStatus === "reviewed").length;
  return {
    totalQuestions: DATA.questions.length,
    commercialTarget: 1600,
    moduleCounts,
    typeCounts,
    reviewed,
    modulesBelowTarget,
    typeGaps,
    readinessScore: Math.min(100, Math.round((DATA.questions.length / 1600) * 45 + (reviewed / Math.max(1, DATA.questions.length)) * 35 + Math.max(0, 20 - modulesBelowTarget.length)))
  };
}

function weakModules() {
  const stats = state.profile.moduleStats || {};
  return Object.keys(stats)
    .map((id) => ({ id, title: moduleTitle(id), ...stats[id] }))
    .filter((item) => item.answered > 0)
    .sort((a, b) => (a.correct / a.answered) - (b.correct / b.answered) || b.answered - a.answered)
    .slice(0, 3);
}

function recordAnswer(question, selectedIndex) {
  const isCorrect = selectedIndex === question.answer;
  const profile = normalizeProfile(state.profile);
  const moduleId = question.moduleId || "unknown";
  const moduleStats = profile.moduleStats[moduleId] || { answered: 0, correct: 0 };
  moduleStats.answered += 1;
  if (isCorrect) moduleStats.correct += 1;
  profile.moduleStats[moduleId] = moduleStats;
  profile.answered += 1;
  if (isCorrect) {
    profile.correct += 1;
    profile.streak += 1;
    profile.wrongIds = profile.wrongIds.filter((id) => id !== question.id);
  } else {
    profile.streak = 0;
    profile.wrongIds = [...new Set([question.id, ...profile.wrongIds])].slice(0, 200);
  }
  profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
  profile.history = [
    {
      id: question.id,
      moduleId,
      correct: isCorrect,
      at: new Date().toISOString()
    },
    ...profile.history
  ].slice(0, 200);
  state.profile = saveProfile(profile);
}

function recordDailyAnswer(question, selectedIndex) {
  recordAnswer(question, selectedIndex);
  const daily = state.dailyPractice || getDailyPractice();
  daily.answers[question.id] = {
    selected: selectedIndex,
    correct: selectedIndex === question.answer,
    moduleId: question.moduleId || "unknown",
    at: new Date().toISOString()
  };
  state.dailyPractice = saveDailyPractice(daily);
}

function toggleModuleComplete(id) {
  const profile = normalizeProfile(state.profile);
  const completed = new Set(profile.completedModules);
  if (completed.has(id)) completed.delete(id);
  else completed.add(id);
  profile.completedModules = [...completed];
  state.profile = saveProfile(profile);
  render();
}

function practiceModule(id) {
  state.view = "practice";
  state.stageId = "none";
  state.difficulty = "all";
  state.questionType = "all";
  state.practiceModuleId = id;
  state.wrongOnly = false;
  state.questionIndex = 0;
  state.selected = null;
  render();
}

function toggleWrongOnly() {
  state.wrongOnly = !state.wrongOnly;
  state.stageId = "none";
  state.questionIndex = 0;
  state.selected = null;
  render();
}
