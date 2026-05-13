function stableScore(id) {
  return String(id || "").split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function normalizeWeights(weights) {
  return (weights || []).map(([id, weight]) => ({ id, weight: Number(weight) || 0 })).filter(item => item.id && item.weight > 0);
}

function pickWeightedIds(weights, count) {
  const normalized = normalizeWeights(weights);
  if (!normalized.length || count <= 0) return [];
  const total = normalized.reduce((sum, item) => sum + item.weight, 0);
  const quotas = normalized.map(item => {
    const exact = (item.weight / total) * count;
    return { ...item, exact, count: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let assigned = quotas.reduce((sum, item) => sum + item.count, 0);
  quotas.slice().sort((a, b) => b.rest - a.rest || b.weight - a.weight || a.id.localeCompare(b.id)).forEach(item => {
    if (assigned >= count) return;
    quotas.find(quota => quota.id === item.id).count += 1;
    assigned += 1;
  });
  return quotas.flatMap(item => Array.from({ length: item.count }, () => item.id));
}

function nextPaperQuestion(pool, usedIds, cursor) {
  const sorted = pool.slice().sort((a, b) => stableScore(a.id) - stableScore(b.id));
  for (let offset = 0; offset < sorted.length; offset += 1) {
    const item = sorted[(cursor + offset) % sorted.length];
    if (!usedIds.has(item.id)) return item;
  }
  return null;
}

function questionTypeOf(question) {
  return question.questionType || "single_choice";
}

function answerTextOf(question) {
  if (question.answerText) return question.answerText;
  if (Array.isArray(question.options) && Number.isInteger(question.answer)) return question.options[question.answer] || "";
  return "";
}

function assetUrl(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/assets/")) return `.${src}`;
  if (src.startsWith("assets/")) return `./${src}`;
  return `./${src.replace(/^\/+/, "")}`;
}

function renderQuestionAssets(question) {
  const assets = Array.isArray(question.assets) ? question.assets : [];
  if (!assets.length) return "";
  return `<div class="question-assets">${assets.map(asset => `
    <figure class="question-figure">
      ${asset.type === "image" ? `<img src="${escapeHtml(assetUrl(asset.src))}" alt="${escapeHtml(asset.alt || "题图")}" />` : ""}
      <figcaption>${formatChemText(asset.alt || "")}</figcaption>
    </figure>
  `).join("")}</div>`;
}

function buildWeightedPaper(blueprint) {
  const moduleIds = pickWeightedIds(blueprint.moduleWeights, blueprint.totalCount);
  const difficultyIds = pickWeightedIds(blueprint.difficultyWeights, blueprint.totalCount);
  const typeIds = pickWeightedIds(blueprint.typeWeights || [["single_choice", 100]], blueprint.totalCount);
  const usedIds = new Set();
  const questions = [];
  for (let index = 0; index < blueprint.totalCount; index += 1) {
    const moduleId = moduleIds[index % moduleIds.length];
    const difficulty = difficultyIds[index % difficultyIds.length];
    const questionType = typeIds[index % typeIds.length];
    const question = nextPaperQuestion(DATA.questions.filter(item => item.moduleId === moduleId && item.difficulty === difficulty && questionTypeOf(item) === questionType), usedIds, index)
      || nextPaperQuestion(DATA.questions.filter(item => item.moduleId === moduleId), usedIds, index)
      || nextPaperQuestion(DATA.questions.filter(item => questionTypeOf(item) === questionType), usedIds, index)
      || nextPaperQuestion(DATA.questions.filter(item => item.difficulty === difficulty), usedIds, index)
      || nextPaperQuestion(DATA.questions, usedIds, index);
    if (question) {
      usedIds.add(question.id);
      questions.push({ ...question, score: Math.max(1, Math.round(blueprint.totalScore / blueprint.totalCount)) });
    }
  }
  const moduleSummary = questions.reduce((summary, question) => {
    summary[question.moduleId] = (summary[question.moduleId] || 0) + 1;
    return summary;
  }, {});
  const typeSummary = questions.reduce((summary, question) => {
    const type = questionTypeOf(question);
    summary[type] = (summary[type] || 0) + 1;
    return summary;
  }, {});
  const sections = Object.keys(questionTypeTitles).map(questionType => {
    const sectionQuestions = questions.filter(question => questionTypeOf(question) === questionType);
    return {
      questionType,
      title: questionTypeTitles[questionType],
      count: sectionQuestions.length,
      score: sectionQuestions.reduce((sum, question) => sum + question.score, 0),
      questions: sectionQuestions
    };
  }).filter(section => section.count > 0);
  return {
    title: blueprint.title,
    description: blueprint.description,
    totalCount: questions.length,
    totalScore: questions.reduce((sum, item) => sum + item.score, 0),
    questions,
    sections,
    moduleSummary: Object.keys(moduleSummary).map(moduleId => ({
      moduleId,
      title: (DATA.courseModules.find(module => module.id === moduleId) || { title: "连接基础" }).title,
      count: moduleSummary[moduleId]
    })),
    typeSummary: Object.keys(typeSummary).map(questionType => ({
      questionType,
      title: questionTypeTitles[questionType] || "综合题",
      count: typeSummary[questionType]
    }))
  };
}

function selectBlueprint(id) {
  state.blueprintId = id;
  const blueprint = DATA.paperBlueprints.find(item => item.id === id);
  if (blueprint) {
    state.customWeights = blueprint.moduleWeights.reduce((map, [moduleId, weight]) => {
      map[moduleId] = weight;
      return map;
    }, {});
  }
  render();
}

function selectPaperMode(mode) {
  state.paperMode = mode;
  render();
}

function selectCustomDifficulty(id) {
  state.customDifficultyId = id;
  render();
}

function selectCustomTypeProfile(id) {
  state.customTypeProfileId = id;
  render();
}

function setCustomNumber(field, value) {
  const parsed = Number(value);
  const fallback = field === "customTotalCount" ? 12 : 100;
  const max = field === "customTotalCount" ? 50 : 300;
  state[field] = Math.max(1, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
  render();
}

function toggleCustomWeight(id) {
  state.customWeights[id] = state.customWeights[id] > 0 ? 0 : 10;
  render();
}

function adjustCustomWeight(id, delta) {
  state.customWeights[id] = Math.max(0, Math.min(100, (state.customWeights[id] || 0) + delta));
  render();
}

function buildCustomBlueprint() {
  const moduleWeights = DATA.courseModules
    .map(module => [module.id, state.customWeights[module.id] || 0])
    .filter(([, weight]) => weight > 0);
  const safeWeights = moduleWeights.length ? moduleWeights : [[DATA.courseModules[0].id, 10]];
  const difficulty = difficultyProfiles.find(item => item.id === state.customDifficultyId) || difficultyProfiles[1];
  const typeProfile = questionTypeProfiles.find(item => item.id === state.customTypeProfileId) || questionTypeProfiles[0];
  return {
    id: "custom_weighted",
    title: "自定义知识点卷",
    description: `按 ${safeWeights.length} 个知识点的自定义权重生成。`,
    totalCount: state.customTotalCount,
    totalScore: state.customTotalScore,
    moduleWeights: safeWeights,
    difficultyWeights: difficulty.weights,
    typeWeights: typeProfile.weights
  };
}

function generatePaper() {
  const blueprint = state.paperMode === "custom"
    ? buildCustomBlueprint()
    : DATA.paperBlueprints.find(item => item.id === state.blueprintId) || DATA.paperBlueprints[0];
  state.generatedPaper = buildWeightedPaper(blueprint);
  render();
}

function printPaper() {
  if (!state.generatedPaper) generatePaper();
  window.print();
}

function renderPaperBuilder() {
  const blueprints = DATA.paperBlueprints || [];
  const paper = state.generatedPaper;
  const selectedWeights = DATA.courseModules.filter(module => (state.customWeights[module.id] || 0) > 0);
  const totalWeight = selectedWeights.reduce((sum, module) => sum + (state.customWeights[module.id] || 0), 0);
  return `
    <section class="panel paper-builder">
      <div class="title">智能组卷</div>
      <div class="subtitle">可使用推荐卷型，也可以自行选择知识点并设置权重；网页预览支持打印并另存为 PDF。</div>
      <div class="paper-mode-tabs no-print">
        <button class="${state.paperMode === "preset" ? "active" : ""}" onclick="selectPaperMode('preset')">推荐卷型</button>
        <button class="${state.paperMode === "custom" ? "active" : ""}" onclick="selectPaperMode('custom')">自定义权重</button>
      </div>
      ${state.paperMode === "preset" ? `
        <div class="blueprint-grid">
          ${blueprints.map(item => `
            <button class="blueprint-card ${state.blueprintId === item.id ? "active" : ""}" onclick="selectBlueprint('${item.id}')">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.description)}</span>
              <small>${item.totalCount} 题 · ${item.totalScore} 分</small>
            </button>
          `).join("")}
        </div>
      ` : `
        <div class="custom-paper no-print">
          <div class="paper-number-grid">
            <label>题量<input type="number" min="1" max="50" value="${state.customTotalCount}" onchange="setCustomNumber('customTotalCount', this.value)" /></label>
            <label>总分<input type="number" min="1" max="300" value="${state.customTotalScore}" onchange="setCustomNumber('customTotalScore', this.value)" /></label>
          </div>
          <div class="selector-grid">
            ${difficultyProfiles.map(item => `<button class="${state.customDifficultyId === item.id ? "active" : ""}" onclick="selectCustomDifficulty('${item.id}')">${escapeHtml(item.title)}</button>`).join("")}
          </div>
          <div class="selector-grid">
            ${questionTypeProfiles.map(item => `<button class="${state.customTypeProfileId === item.id ? "active" : ""}" onclick="selectCustomTypeProfile('${item.id}')">${escapeHtml(item.title)}</button>`).join("")}
          </div>
          <div class="paper-meta">已选知识点 ${selectedWeights.length} 个 · 权重合计 ${totalWeight}</div>
          <div class="weight-list">
            ${DATA.courseModules.map(module => {
              const weight = state.customWeights[module.id] || 0;
              return `
                <div class="weight-row ${weight > 0 ? "active" : ""}">
                  <button class="weight-name" onclick="toggleCustomWeight('${module.id}')"><span>${weight > 0 ? "✓" : "+"}</span>${escapeHtml(module.title)}</button>
                  <div class="weight-controls">
                    <button onclick="adjustCustomWeight('${module.id}', -5)">-</button>
                    <strong>${weight}</strong>
                    <button onclick="adjustCustomWeight('${module.id}', 5)">+</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `}
      <div class="actions no-print">
        <button class="btn secondary" onclick="generatePaper()">生成试卷</button>
        <button class="btn" onclick="printPaper()">导出 PDF</button>
      </div>
      ${paper ? renderGeneratedPaper(paper) : `<div class="card muted">选择卷型后生成试卷。</div>`}
    </section>
  `;
}

function renderGeneratedPaper(paper) {
  const sections = paper.sections && paper.sections.length ? paper.sections : [{ title: "试题", questions: paper.questions, count: paper.questions.length, score: paper.totalScore }];
  let order = 0;
  return `
    <article id="paperExport" class="paper-export">
      <h2>${escapeHtml(paper.title)}</h2>
      <p>${escapeHtml(paper.description)}</p>
      <div class="paper-meta">${paper.totalCount} 题 · ${paper.totalScore} 分 · ${paper.moduleSummary.map(item => `${escapeHtml(item.title)} ${item.count}题`).join(" · ")}</div>
      <div class="answer-card">
        <h3>答题卡</h3>
        <div class="answer-grid">${paper.questions.map((question, index) => `<span>${index + 1}</span>`).join("")}</div>
      </div>
      ${sections.map(section => `
        <section class="paper-section">
          <h3>${escapeHtml(section.title)} <span>${section.count} 题 · ${section.score} 分</span></h3>
          ${section.questions.map((question) => {
            order += 1;
            return `
              <div class="paper-item">
                <h4>${order}. ${formatChemText(question.stem)} <span class="tag">${question.score} 分</span></h4>
                ${renderQuestionAssets(question)}
                ${Array.isArray(question.options) && question.options.length ? `<ol type="A">${question.options.map(option => `<li>${formatChemText(option)}</li>`).join("")}</ol>` : `<div class="answer-space">答题区</div>`}
              </div>
            `;
          }).join("")}
        </section>
      `).join("")}
      <section class="answer-section">
        <h3>答案与解析</h3>
        ${paper.questions.map((question, index) => `
          <div class="answer-item">
            <strong>${index + 1}. ${questionTypeTitles[questionTypeOf(question)] || "综合题"}</strong>
            <p>答案：${formatChemText(answerTextOf(question))}</p>
            ${(question.scoringPoints || []).length ? `<ol>${question.scoringPoints.map(point => `<li>${formatChemText(point)}</li>`).join("")}</ol>` : ""}
            <p>${formatChemText(question.explain)}</p>
          </div>
        `).join("")}
      </section>
    </article>
  `;
}
