function renderNav() {
  const header = document.getElementById("headerStatus");
  if (header) {
    const active = getActiveModule();
    header.innerHTML = state.view === "learn"
      ? `<span>${escapeHtml(active.title)}</span><button class="top-menu-btn" onclick="toggleCourseMenu()">课程目录</button>`
      : `<span>${escapeHtml(views.find(([id]) => id === state.view)?.[1] || "")}</span>`;
  }
  document.getElementById("nav").innerHTML = views.map(([id, label]) => (
    `<button class="${state.view === id ? "active" : ""}" onclick="setView('${id}')">${label}</button>`
  )).join("");
}

function renderButtonGrid(items, activeId, handlerName) {
  return `<div class="selector-grid">${items.map((item) => (
    `<button class="${item.id === activeId ? "active" : ""}" onclick="${handlerName}('${item.id}')">${escapeHtml(item.title)}</button>`
  )).join("")}</div>`;
}

function renderCourseDrawer(activeId) {
  return `
    <div class="drawer-backdrop ${state.courseMenuOpen ? "open" : ""}" onclick="closeCourseMenu()"></div>
    <aside class="course-drawer ${state.courseMenuOpen ? "open" : ""}" aria-hidden="${state.courseMenuOpen ? "false" : "true"}">
      <div class="drawer-head">
        <strong>课程学习</strong>
        <button onclick="closeCourseMenu()">收起</button>
      </div>
      <div class="drawer-list">
        ${DATA.courseModules.map((module) => `
          <button class="${module.id === activeId ? "active" : ""}" onclick="selectModule('${module.id}')">
            <span>${escapeHtml(module.title)}</span>
            <small>${escapeHtml(module.level)}</small>
          </button>
        `).join("")}
      </div>
    </aside>
  `;
}

function renderNodeChips(nodes, currentNode = state.activeNode) {
  if (!nodes.length) return `<div class="muted">暂无直接关联节点。</div>`;
  return `<div class="node-list">${nodes.map((node) => (
    `<button class="node-chip ${node === currentNode ? "active" : ""}" onclick="selectNode('${encodeURIComponent(node)}')">${formatChemText(node)}</button>`
  )).join("")}</div>`;
}

function renderAccordion(title, body, open = false) {
  return `
    <details class="accordion" ${open ? "open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="accordion-body">${body}</div>
    </details>
  `;
}

function renderEdgeCards(edges) {
  if (!edges.length) return `<div class="muted">暂无连接关系。</div>`;
  return edges.map((edge) => `
    <div class="edge-card">
      <button class="link-node" onclick="learnNode('${encodeURIComponent(edge.from)}')">${formatChemText(edge.from)}</button>
      <span>${formatChemText(edge.relation)}</span>
      <button class="link-node" onclick="learnNode('${encodeURIComponent(edge.to)}')">${formatChemText(edge.to)}</button>
      <p>${formatChemText(edge.use)}</p>
      <span class="tag">${escapeHtml(edge.topic)}</span>
    </div>
  `).join("");
}

function renderRelationExplorer(seedNodes) {
  const fallbackNode = seedNodes[0] || allNodes[0];
  const activeNode = state.activeNode || fallbackNode;
  const nodeEdges = getNodeEdges(activeNode);
  const connectedNodes = getConnectedNodes(activeNode);
  const modules = getNodeModules(activeNode);
  return `
    <div class="relation-layout">
      <div>
        <h3>本课相关知识点</h3>
        ${renderNodeChips(seedNodes.length ? seedNodes : allNodes.slice(0, 18), activeNode)}
      </div>
      <div>
        <h3>${formatChemText(activeNode)} 的连接</h3>
        ${connectedNodes.length ? `<div class="node-list compact">${connectedNodes.map((node) => (
          `<button class="node-chip" onclick="selectNode('${encodeURIComponent(node)}')">${formatChemText(node)}</button>`
        )).join("")}</div>` : `<div class="muted">暂无相邻节点。</div>`}
        <div class="edge-stack">${renderEdgeCards(nodeEdges)}</div>
        ${modules.length ? `<div class="module-jumps"><strong>相关课程：</strong>${modules.map((module) => (
          `<button onclick="selectModule('${module.id}')">${escapeHtml(module.title)}</button>`
        )).join("")}</div>` : ""}
      </div>
    </div>
  `;
}

function renderHome() {
  const profile = state.profile;
  const weak = weakModules();
  const completed = profile.completedModules.length;
  return `
    <section class="panel hero-panel">
      <div>
        <div class="title">化学连接学习</div>
        <div class="subtitle">把概念、反应、实验、计算和题型放回同一张知识网络里。</div>
      </div>
      <div class="actions">
        <button class="btn" onclick="startDailyPractice()">今日练习</button>
        <button class="btn secondary" onclick="setView('learn')">开始学习</button>
      </div>
    </section>
    <section class="panel">
      <div class="title">学习档案</div>
      <div class="stats-grid">
        <div><strong>${profile.answered}</strong><span>累计答题</span></div>
        <div><strong>${percent(profile.correct, profile.answered)}</strong><span>正确率</span></div>
        <div><strong>${profile.bestStreak}</strong><span>最高连对</span></div>
        <div><strong>${completed}/${DATA.courseModules.length}</strong><span>完成课程</span></div>
      </div>
      ${weak.length ? `
        <div class="module-jumps">
          <strong>优先补弱：</strong>
          ${weak.map((item) => `<button onclick="practiceModule('${item.id}')">${escapeHtml(item.title)} · ${percent(item.correct, item.answered)}</button>`).join("")}
          <button onclick="startDailyPractice()">生成今日练习</button>
        </div>
      ` : `<p class="muted">完成几道练习后，这里会自动推荐薄弱模块。</p>`}
    </section>
    <section class="grid">
      ${DATA.masteryLevels.map(level => `
        <div class="card">
        <h3>${escapeHtml(level.title)} · ${escapeHtml(level.score)}</h3>
          <p>${formatChemText(level.target)}</p>
        </div>
      `).join("")}
    </section>
    <section class="panel stats-grid">
      <div><strong>${DATA.courseModules.length}</strong><span>课程模块</span></div>
      <div><strong>${DATA.edges.length}</strong><span>连接关系</span></div>
      <div><strong>${DATA.questions.length}</strong><span>练习题</span></div>
      <div><strong>${DATA.fullScoreTemplates.length}</strong><span>满分模板</span></div>
    </section>
  `;
}

function renderNetwork() {
  const activeNode = state.activeNode || allNodes[0];
  const nodeEdges = getNodeEdges(activeNode);
  const connectedNodes = getConnectedNodes(activeNode);
  return `
    <section class="panel ${state.networkMode === "overview" ? "network-overview-panel" : ""}">
      <div class="title">知识连接网络</div>
      <div class="subtitle">焦点模式用于逐个看清上下游，总览模式保留整图缩放。</div>
      <div class="network-tabs">
        <button class="${state.networkMode === "focus" ? "active" : ""}" onclick="setNetworkMode('focus')">焦点网络</button>
        <button class="${state.networkMode === "overview" ? "active" : ""}" onclick="setNetworkMode('overview')">总览缩放</button>
      </div>
      ${state.networkMode === "focus" ? `
        ${renderFocusNetwork(activeNode, connectedNodes)}
        <div class="focus-summary">
          <strong>${formatChemText(activeNode)}</strong>
          <span>${connectedNodes.length} 个关联点</span>
        </div>
      ` : `
        ${renderVectorOverview()}
      `}
    </section>
    <section class="panel">
      <h2>知识点列表</h2>
      ${renderNodeChips(allNodes, activeNode)}
    </section>
    <section class="panel">
      <h2>当前中心连接</h2>
      <div class="edge-stack">${renderEdgeCards(nodeEdges)}</div>
    </section>
  `;
}

function focusNodePosition(index, count) {
  const radiusX = count <= 4 ? 300 : 340;
  const radiusY = count <= 4 ? 145 : 188;
  const angle = count === 1 ? -Math.PI / 2 : (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: Math.round(480 + Math.cos(angle) * radiusX),
    y: Math.round(260 + Math.sin(angle) * radiusY)
  };
}

function focusEdgeFor(activeNode, node) {
  return DATA.edges.find((edge) => (
    (edge.from === activeNode && edge.to === node) ||
    (edge.from === node && edge.to === activeNode)
  ));
}

function renderFocusNetwork(activeNode, connectedNodes) {
  const limitedNodes = connectedNodes.slice(0, 12);
  const hiddenCount = Math.max(0, connectedNodes.length - limitedNodes.length);
  const items = limitedNodes.map((node, index) => {
    const position = focusNodePosition(index, limitedNodes.length);
    const edge = focusEdgeFor(activeNode, node) || {};
    const color = topicColor(edge.topic);
    const controlY = position.y < 260 ? position.y + 48 : position.y - 48;
    return {
      node,
      position,
      edge,
      color,
      path: `M480 260 Q${Math.round((480 + position.x) / 2)} ${controlY} ${position.x} ${position.y}`,
      labelX: Math.round((480 + position.x) / 2),
      labelY: Math.round((260 + position.y) / 2 + (position.y < 260 ? -18 : 22))
    };
  });
  return `
    <div class="focus-network">
      <svg class="focus-map" viewBox="0 0 960 520" role="img" aria-label="焦点知识网络">
        <defs>
          <marker id="focusArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
          <filter id="focusShadow" x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#0f172a" flood-opacity="0.16"></feDropShadow>
          </filter>
        </defs>
        <ellipse class="focus-orbit-line" cx="480" cy="260" rx="340" ry="188"></ellipse>
        <ellipse class="focus-orbit-line inner" cx="480" cy="260" rx="210" ry="112"></ellipse>
        ${items.map((item) => `
          <g class="focus-connection">
            <path d="${item.path}" style="--edge-color:${item.color}"></path>
            <text x="${item.labelX}" y="${item.labelY}">${escapeHtml(item.edge.relation || "关联")}</text>
          </g>
        `).join("")}
        <g class="focus-hub" onclick="setNetworkNode('${encodeURIComponent(activeNode)}')" tabindex="0">
          <rect x="370" y="214" width="220" height="92" rx="18"></rect>
          <text x="480" y="252">${escapeHtml(activeNode)}</text>
          <text class="focus-node-caption" x="480" y="280">当前学习中心</text>
        </g>
        ${items.map((item, index) => `
          <g class="focus-satellite" onclick="setNetworkNode('${encodeURIComponent(item.node)}')" tabindex="0">
            <rect x="${item.position.x - 86}" y="${item.position.y - 34}" width="172" height="68" rx="14" style="--node-color:${item.color}"></rect>
            <text x="${item.position.x}" y="${item.position.y - 4}">${escapeHtml(item.node)}</text>
            <text class="focus-node-caption" x="${item.position.x}" y="${item.position.y + 18}">${escapeHtml(item.edge.topic || `关联 ${index + 1}`)}</text>
          </g>
        `).join("")}
      </svg>
      <div class="focus-side">
        <div class="focus-side-head">
          <span>关联路径</span>
          <strong>${limitedNodes.length}${hiddenCount ? ` +${hiddenCount}` : ""}</strong>
        </div>
        ${items.map((item) => `
          <button class="focus-relation-card" onclick="setNetworkNode('${encodeURIComponent(item.node)}')">
            <span class="relation-dot" style="background:${item.color}"></span>
            <strong>${formatChemText(item.node)}</strong>
            <small>${formatChemText(item.edge.relation || "关联")} · ${formatChemText(item.edge.use || item.edge.topic || "")}</small>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLearn() {
  const active = getActiveModule();
  const classroom = getActiveClassroom();
  const relatedNodes = getModuleNodes(active);
  const completed = state.profile.completedModules.includes(active.id);
  if (!state.activeNode && relatedNodes.length) state.activeNode = relatedNodes[0];

  return `
    ${renderCourseDrawer(active.id)}
    <section class="panel">
      <div class="learn-toolbar">
        <div>
          <div class="title">课程学习</div>
          <div class="subtitle">当前课程：${escapeHtml(active.title)}</div>
        </div>
        <button class="btn" onclick="toggleCourseMenu()">课程目录</button>
      </div>
      <h2>${escapeHtml(active.title)} <span class="tag">${escapeHtml(active.level)}</span></h2>
      <p>${formatChemText(active.target)}</p>
      <div class="chain">${formatChemText(active.chain)}</div>
      <div class="actions">
        <button class="btn ${completed ? "secondary" : ""}" onclick="toggleModuleComplete('${active.id}')">${completed ? "已完成，点击撤销" : "标记本课完成"}</button>
        <button class="btn secondary" onclick="practiceModule('${active.id}')">练这个模块</button>
      </div>
      ${renderAccordion("相关知识点跳转", renderRelationExplorer(relatedNodes), true)}
      ${renderAccordion("必会连接", `<ol>${active.essentials.map(item => `<li>${formatChemText(item)}</li>`).join("")}</ol>`, true)}
      ${renderAccordion("例题讲解", `<div class="card"><strong>${formatChemText(active.example.stem)}</strong><p>${formatChemText(active.example.answer)}</p></div>`)}
      ${renderAccordion("易错点", `<ul>${active.traps.map(item => `<li>${formatChemText(item)}</li>`).join("")}</ul>`)}
    </section>
    <section class="panel">
      <div class="title">从零开始课堂</div>
      ${renderButtonGrid(DATA.classroomUnits, classroom.id, "selectClassroom")}
      <h2>${escapeHtml(classroom.title)} <span class="tag">${escapeHtml(classroom.level)}</span></h2>
      <p><strong>本课问题：</strong>${formatChemText(classroom.problem)}</p>
      ${renderAccordion("老师会这样讲", `<ol>${classroom.teacherTalk.map(item => `<li>${formatChemText(item)}</li>`).join("")}</ol>`, true)}
      ${renderAccordion("板书与例题", `
        ${classroom.blackboard.map(item => `<div class="chain">${formatChemText(item)}</div>`).join("")}
        <div class="card"><strong>${formatChemText(classroom.example.stem)}</strong><ol>${classroom.example.walkthrough.map(item => `<li>${formatChemText(item)}</li>`).join("")}</ol></div>
      `)}
      ${renderAccordion("马上练与提醒", `
        <ul>${classroom.practice.map(item => `<li>${formatChemText(item)}</li>`).join("")}</ul>
        <div class="card"><strong>老师提醒：</strong>${formatChemText(classroom.teacherWarning)}</div>
      `)}
    </section>
    <section class="panel">
      <h2>复习与提分工具</h2>
      ${renderAccordion("30 天自学路线", `<div class="compact-grid">${DATA.studyPlan.map(day => `
        <div class="card"><h3>Day ${day.day} · ${escapeHtml(day.title)}</h3><p>${formatChemText(day.task)}</p><p><strong>过关：</strong>${formatChemText(day.check)}</p></div>
      `).join("")}</div>`)}
      ${renderAccordion("80+ / 满分模板", `<div class="compact-grid">${DATA.fullScoreTemplates.map(tpl => `
        <div class="card"><h3>${escapeHtml(tpl.title)}</h3><span class="tag">${escapeHtml(tpl.scene)}</span><ol>${tpl.steps.map(s => `<li>${formatChemText(s)}</li>`).join("")}</ol></div>
      `).join("")}</div>`)}
      ${renderAccordion("错因补救", `<div class="compact-grid">${DATA.mistakeTypes.map(item => `<div class="card"><h3>${escapeHtml(item.title)}</h3><p>${formatChemText(item.fix)}</p></div>`).join("")}</div>`)}
      ${renderAccordion("大题评分清单", `<div class="compact-grid">${DATA.answerRubrics.map(item => `<div class="card"><h3>${escapeHtml(item.scene)}</h3><ol>${item.points.map(point => `<li>${formatChemText(point)}</li>`).join("")}</ol></div>`).join("")}</div>`)}
    </section>
  `;
}
