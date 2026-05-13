/* Quick History — 核心逻辑（基础版） */
/* 安全原则：所有用户数据通过 textContent 渲染，永不使用 innerHTML */
/* 权限范围：仅 history，不含 sessions（第二版再加入） */

const DEFAULT_LIMIT = 20;           // 默认显示条数
const DEFAULT_RANGE_DAYS = 30;      // 搜索范围（天）
const DEBOUNCE_MS = 200;            // 搜索防抖延迟

const listEl = document.getElementById('history-list');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');
const openFullHistoryBtn = document.getElementById('open-full-history');

// ---- 安全 URL 验证 ----
// 只允许 http/https 协议，拒绝 javascript:、data:、file:、chrome: 等
function validateUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

// ---- 初始化入口 ----
async function init() {
  bindSearch();
  bindFooter();
  await loadHistory('');
}

// ---- 搜索历史记录 ----
async function searchHistory(query) {
  return chrome.history.search({
    text: query,
    startTime: Date.now() - 1000 * 60 * 60 * 24 * DEFAULT_RANGE_DAYS,
    maxResults: DEFAULT_LIMIT
  });
}

async function loadHistory(query) {
  try {
    const items = await searchHistory(query);
    renderHistory(items);
  } catch (error) {
    console.error('历史记录加载失败:', error);
    countText.textContent = '历史记录加载失败';
    emptyState.hidden = false;
    const p = emptyState.querySelector('p');
    if (p) p.textContent = '无法读取历史记录，请检查扩展权限。';
  }
}

// ---- 渲染历史列表（全部使用 textContent，防止 XSS） ----
function renderHistory(items) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }

  countText.textContent = items.length + ' 条历史记录';
  emptyState.hidden = items.length > 0;

  if (items.length === 0) return;

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.appendChild(createHistoryItem(item));
  }
  listEl.appendChild(fragment);
}

function createHistoryItem(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-item';
  button.title = (item.title || '无标题') + '\n' + (item.url || '');

  const main = document.createElement('span');
  main.className = 'item-main';

  // 标题（textContent 安全渲染）
  const titleEl = document.createElement('span');
  titleEl.className = 'item-title';
  titleEl.textContent = item.title || '无标题';

  // URL（textContent 安全渲染）
  const urlEl = document.createElement('span');
  urlEl.className = 'item-url';
  urlEl.textContent = simplifyUrl(item.url || '');

  // 相对访问时间（textContent 安全渲染）
  const metaEl = document.createElement('span');
  metaEl.className = 'item-meta';
  metaEl.textContent = formatRelativeTime(item.lastVisitTime);

  main.append(titleEl, urlEl, metaEl);
  button.append(main);

  // 点击打开（先验证 URL 协议）
  button.addEventListener('click', async () => {
    if (!item.url) return;
    const safeUrl = validateUrl(item.url);
    if (!safeUrl) return;

    try {
      await chrome.tabs.create({ url: safeUrl });
      window.close();
    } catch (err) {
      console.error('打开标签页失败:', err);
    }
  });

  return button;
}

// ---- 搜索防抖 ----
function bindSearch() {
  let timer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      loadHistory(searchInput.value.trim());
    }, DEBOUNCE_MS);
  });
}

// ---- 查看全部记录按钮 ----
function bindFooter() {
  if (!openFullHistoryBtn) return;

  openFullHistoryBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url: 'chrome://history/' });
      window.close();
    } catch {
      alert('无法自动打开历史记录页面，请按 Ctrl + H 查看全部历史记录。');
    }
  });
}

// ---- URL 简化显示 ----
function simplifyUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

// ---- 相对时间格式化 ----
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + ' 分钟前';
  if (diff < day) return Math.floor(diff / hour) + ' 小时前';
  return Math.floor(diff / day) + ' 天前';
}

init();
