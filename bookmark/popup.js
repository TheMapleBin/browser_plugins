/* bookmark — 核心逻辑 */
/* 安全原则：所有用户数据通过 textContent 渲染，永不使用 innerHTML */
/* 性能原则：一次展平 + 预计算 searchText + 限制渲染数量 + debounce 搜索 */

const listEl = document.getElementById('bookmark-list');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');

const MAX_RENDER = 100;       // 最多渲染条数，避免 popup DOM 过重
const DEBOUNCE_MS = 120;      // 搜索防抖延迟
const VISIBLE_LIMIT = 10;     // 标签栏最大可见数量

let allBookmarks = [];

// ---- 初始化入口 ----
async function init() {
  try {
    const tree = await chrome.bookmarks.getTree();
    allBookmarks = flattenBookmarks(tree);
    renderBookmarks(allBookmarks);
    bindSearch();
  } catch (error) {
    console.error('书签加载失败:', error);
    countText.textContent = '书签加载失败';
    emptyState.hidden = false;
    const p = emptyState.querySelector('p');
    if (p) p.textContent = '无法读取书签，请检查扩展权限。';
  }
}

// ---- 书签树展平（迭代遍历，避免深层递归栈溢出） ----
function flattenBookmarks(rootNodes) {
  const result = [];
  const stack = rootNodes.map(node => ({ node, path: [] }));

  while (stack.length > 0) {
    const { node, path } = stack.pop();
    const title = node.title || '';

    if (node.children) {
      const nextPath = title ? [...path, title] : path;

      // 倒序压栈，保证最终展示顺序接近 Chrome 书签树原顺序
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i], path: nextPath });
      }
      continue;
    }

    if (node.url) {
      const pathText = path.filter(Boolean).join(' / ');

      result.push({
        id: node.id,
        title: title || '无标题',
        url: node.url,
        path: pathText,
        dateAdded: node.dateAdded || 0,
        searchText: `${title} ${node.url} ${pathText}`.toLowerCase()
      });
    }
  }

  return result;
}

// ---- URL 解析 & 验证 ----
// 拆分为两个校验函数：打开用（允许 chrome://）、favicon 用（仅 http/https）

const OPENABLE_PROTOCOLS = new Set(['http:', 'https:', 'chrome:']);
const FAVICON_PROTOCOLS = new Set(['http:', 'https:']);

function parseUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  try {
    return new URL(rawUrl.trim());
  } catch {
    return null;
  }
}

function validateOpenUrl(rawUrl) {
  const parsed = parseUrl(rawUrl);
  if (!parsed || !OPENABLE_PROTOCOLS.has(parsed.protocol)) return null;
  return parsed.href;
}

function validateFaviconUrl(rawUrl) {
  const parsed = parseUrl(rawUrl);
  if (!parsed || !FAVICON_PROTOCOLS.has(parsed.protocol)) return null;
  return parsed.href;
}

// ---- favicon URL 构造 ----
// 使用 Chrome MV3 的 _favicon 路径，仅适用于 http/https
function getFaviconUrl(rawUrl) {
  const validUrl = validateFaviconUrl(rawUrl);
  if (!validUrl) return null;

  try {
    const favicon = new URL(chrome.runtime.getURL('/_favicon/'));
    favicon.searchParams.set('pageUrl', validUrl);
    favicon.searchParams.set('size', '32');
    return favicon.toString();
  } catch {
    return null;
  }
}

// ---- 默认首字母图标（SVG data URI） ----
function createFallbackIcon(title) {
  const letter = (title || '?').trim().slice(0, 1).toUpperCase() || '?';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="9" fill="#E5E7EB"/>' +
    '<text x="16" y="21" text-anchor="middle" font-size="15" font-family="Arial" font-weight="700" fill="#111827">' +
    escapeSvgText(letter) +
    '</text></svg>';

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function escapeSvgText(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// ---- URL 简化显示 ----
function simplifyUrl(rawUrl) {
  const parsed = parseUrl(rawUrl);
  if (!parsed) return rawUrl || '';

  if (parsed.protocol === 'chrome:') {
    const path = parsed.pathname.replace(/\/$/, '');
    return `chrome://${parsed.hostname}${path}`;
  }

  const pathname = parsed.pathname.replace(/\/$/, '');
  return parsed.hostname + pathname;
}

// ---- 动态调节列表卡片高度 ----
function getCssPxValue(varName) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return Number.parseFloat(raw) || 0;
}

function updateListCardHeight(bookmarkCount) {
  const itemHeight = getCssPxValue('--bookmark-item-height');
  const emptyHeight = getCssPxValue('--bookmark-empty-height');

  let targetHeight;
  if (bookmarkCount === 0) {
    targetHeight = emptyHeight;
  } else {
    targetHeight = Math.min(bookmarkCount, VISIBLE_LIMIT) * itemHeight;
  }

  document.documentElement.style.setProperty('--bookmark-current-list-height', `${targetHeight}px`);
}

// ---- 渲染书签列表 ----
function renderBookmarks(bookmarks) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }

  updateListCardHeight(bookmarks.length);

  countText.textContent = `${bookmarks.length} 个书签`;
  emptyState.hidden = bookmarks.length > 0;

  if (bookmarks.length === 0) return;

  const fragment = document.createDocumentFragment();
  const limit = bookmarks.slice(0, MAX_RENDER);

  for (const bookmark of limit) {
    fragment.appendChild(createBookmarkItem(bookmark));
  }

  listEl.appendChild(fragment);
}

function createBookmarkItem(bookmark) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'bookmark-item';
  item.title = bookmark.title + '\n' + bookmark.url;

  const icon = document.createElement('img');
  icon.className = 'bookmark-icon';
  icon.alt = '';
  icon.loading = 'lazy';

  const faviconSrc = getFaviconUrl(bookmark.url);
  icon.src = faviconSrc || createFallbackIcon(bookmark.title);

  icon.addEventListener('error', () => {
    icon.src = createFallbackIcon(bookmark.title);
  });

  const main = document.createElement('span');
  main.className = 'bookmark-main';

  const titleEl = document.createElement('span');
  titleEl.className = 'bookmark-title';
  titleEl.textContent = bookmark.title;

  const urlEl = document.createElement('span');
  urlEl.className = 'bookmark-url';
  urlEl.textContent = simplifyUrl(bookmark.url);

  // 注意：这里不再渲染 bookmark.path，因此不会显示"书签栏"
  main.append(titleEl, urlEl);
  item.append(icon, main);

  item.addEventListener('click', async () => {
    const openUrl = validateOpenUrl(bookmark.url);
    if (!openUrl) return;

    try {
      await chrome.tabs.create({ url: openUrl });
      window.close();
    } catch (err) {
      console.error('打开标签页失败:', err);
    }
  });

  return item;
}

// ---- 搜索执行 ----
function doSearch() {
  const keyword = searchInput.value.trim().toLowerCase();

  if (!keyword) {
    renderBookmarks(allBookmarks);
    return;
  }

  const filtered = allBookmarks.filter(item =>
    item.searchText.includes(keyword)
  );

  renderBookmarks(filtered);
}

// ---- 搜索绑定（debounce 输入 + 按钮立即执行） ----
function bindSearch() {
  let timer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(doSearch, DEBOUNCE_MS);
  });

  searchButton.addEventListener('click', () => {
    clearTimeout(timer);
    doSearch();
  });
}

init();
