function networkFilteredEdges() {
  const module = state.networkModuleId === "all"
    ? null
    : DATA.courseModules.find((item) => item.id === state.networkModuleId);
  const search = (state.networkSearch || "").trim().toLowerCase();
  return DATA.edges.filter((edge) => {
    const moduleMatch = !module || edgeMatchesModule(edge, module);
    const searchText = `${edge.from} ${edge.to} ${edge.relation} ${edge.use} ${edge.topic}`.toLowerCase();
    const searchMatch = !search || searchText.includes(search);
    return moduleMatch && searchMatch;
  });
}

function networkNodes(edges) {
  return [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function topicColor(topic) {
  const palette = {
    "结构链": "#2563eb",
    "表达链": "#0f766e",
    "定量链": "#7c3aed",
    "离子链": "#0891b2",
    "氧还链": "#dc2626",
    "能量链": "#d97706",
    "原理链": "#4f46e5",
    "水溶液链": "#0284c7",
    "有机链": "#16a34a",
    "实验链": "#9333ea",
    "高考综合": "#be123c"
  };
  return palette[topic] || "#475569";
}

function overviewLayout(nodes) {
  const width = 1680;
  const height = 960;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = 640;
  const radiusY = 360;
  return nodes.reduce((map, node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
    map[node] = {
      x: Math.round(centerX + Math.cos(angle) * radiusX),
      y: Math.round(centerY + Math.sin(angle) * radiusY)
    };
    return map;
  }, {});
}

function edgeKey(edge) {
  return `${edge.from}__${edge.to}__${edge.relation}`;
}

function activePathNodes(path) {
  return new Set(path || []);
}

function activePathEdges(path) {
  const set = new Set();
  if (!path || path.length < 2) return set;
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    const edge = DATA.edges.find((item) => (
      (item.from === from && item.to === to) ||
      (item.from === to && item.to === from)
    ));
    if (edge) set.add(edgeKey(edge));
  }
  return set;
}

function findNetworkPath(start, target) {
  if (!start || !target || start === target) return start && target ? [start] : [];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    const nextNodes = getConnectedNodes(last);
    for (const next of nextNodes) {
      if (visited.has(next)) continue;
      const candidate = [...path, next];
      if (next === target) return candidate;
      visited.add(next);
      queue.push(candidate);
    }
  }
  return [];
}

function renderNetworkControls() {
  const pathOptions = allNodes
    .filter((node) => node !== (state.activeNode || allNodes[0]))
    .map((node) => `<option value="${escapeHtml(node)}" ${state.networkPathTarget === node ? "selected" : ""}>${escapeHtml(node)}</option>`)
    .join("");
  return `
    <div class="network-controls">
      <label>搜索知识点或关系
        <input value="${escapeHtml(state.networkSearch)}" placeholder="如：氧化还原、实验、离子" oninput="setNetworkSearch(this.value)" />
      </label>
      <label>按课程筛选
        <select onchange="setNetworkFilter(this.value)">
          <option value="all" ${state.networkModuleId === "all" ? "selected" : ""}>全部课程</option>
          ${DATA.courseModules.map((module) => `<option value="${module.id}" ${state.networkModuleId === module.id ? "selected" : ""}>${escapeHtml(module.title)}</option>`).join("")}
        </select>
      </label>
      <label>学习路径目标
        <select onchange="setNetworkPathTarget(this.value)">
          <option value="">选择目标知识点</option>
          ${pathOptions}
        </select>
      </label>
    </div>
  `;
}

function renderPathGuide(path) {
  if (!state.networkPathTarget) return "";
  if (!path.length) {
    return `<div class="path-guide"><strong>学习路径：</strong><span>当前筛选下暂未找到连接路径。</span></div>`;
  }
  return `
    <div class="path-guide">
      <strong>学习路径：</strong>
      ${path.map((node, index) => `
        <button onclick="selectOverviewNode('${encodeURIComponent(node)}')">${formatChemText(node)}</button>
        ${index < path.length - 1 ? `<span>→</span>` : ""}
      `).join("")}
    </div>
  `;
}

function renderVectorOverview() {
  const edges = networkFilteredEdges();
  const nodes = networkNodes(edges);
  const activeNode = state.activeNode || nodes[0] || allNodes[0];
  const positions = overviewLayout(nodes);
  const path = findNetworkPath(activeNode, state.networkPathTarget);
  const pathNodes = activePathNodes(path);
  const pathEdges = activePathEdges(path);
  const svgEdges = edges.map((edge) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) return "";
    const color = topicColor(edge.topic);
    const active = pathEdges.has(edgeKey(edge));
    return `
      <g class="graph-edge ${active ? "path-active" : ""}">
        <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" />
        <text x="${Math.round((from.x + to.x) / 2)}" y="${Math.round((from.y + to.y) / 2)}">${escapeHtml(edge.relation)}</text>
      </g>
    `;
  }).join("");
  const svgNodes = nodes.map((node) => {
    const pos = positions[node];
    const isActive = node === activeNode;
    const inPath = pathNodes.has(node);
    return `
      <g class="graph-node ${isActive ? "active" : ""} ${inPath ? "path-node" : ""}" onclick="selectOverviewNode('${encodeURIComponent(node)}')" tabindex="0">
        <rect x="${pos.x - 74}" y="${pos.y - 24}" width="148" height="48" rx="10"></rect>
        <text x="${pos.x}" y="${pos.y + 5}">${escapeHtml(node)}</text>
      </g>
    `;
  }).join("");
  return `
    ${renderNetworkControls()}
    ${renderPathGuide(path)}
    <div class="overview-tools">
      <button class="btn secondary" onclick="zoomNetwork(-0.2)">缩小</button>
      <button class="btn secondary" onclick="resetNetworkZoom()">重置</button>
      <button class="btn secondary" onclick="zoomNetwork(0.2)">放大</button>
      <span id="networkScaleLabel" class="zoom-label">${Math.round(state.networkScale * 100)}%</span>
    </div>
    <div class="overview-hint">高清矢量图支持滚轮缩放；点击节点会切换到焦点网络并可继续跳转课程。</div>
    <div id="networkOverviewFrame" class="overview-frame vector-frame" onwheel="handleNetworkWheel(event)">
      <svg id="networkOverviewImage" class="network-svg" viewBox="0 0 1680 960" style="transform:scale(${state.networkScale});" role="img" aria-label="化学知识网络总览">
        <defs>
          <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
        </defs>
        ${svgEdges}
        ${svgNodes}
      </svg>
    </div>
    <div class="network-summary">${nodes.length} 个节点 · ${edges.length} 条关系</div>
  `;
}
