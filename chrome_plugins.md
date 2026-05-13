# chrome_plugins 工程开发清单：bookmark + History

本文档将两个 Chrome Manifest V3 插件的开发清单合并到同一个工程级计划中。

> 工程名称：`chrome_plugins`  
> 子插件 1：`bookmark` —— 书签快速搜索与打开插件  
> 子插件 2：`History` —— 历史记录搜索与最近关闭恢复插件

---

## 0. 总体定位

`chrome_plugins` 不是一个单独的 Chrome 插件，而是一个工程仓库。仓库中包含两个彼此独立的 Chrome 插件：

1. `bookmark/`：专注于读取、搜索、展示和打开 Chrome 书签。
2. `history/`：专注于读取、搜索、展示 Chrome 历史记录，并可扩展“最近关闭标签页/窗口”。

两个插件应该独立开发、独立加载、独立发布。不要把两个插件的权限和功能混在同一个 `manifest.json` 里，否则会导致权限过多、职责不清、后期维护困难。

---

## 1. 推荐工程目录结构

```text
chrome_plugins/
├─ README.md
├─ bookmark/
│  ├─ manifest.json
│  ├─ popup.html
│  ├─ popup.css
│  ├─ popup.js
│  └─ icons/
│     ├─ icon16.png
│     ├─ icon48.png
│     └─ icon128.png
└─ history/
   ├─ manifest.json
   ├─ popup.html
   ├─ popup.css
   ├─ popup.js
   └─ icons/
      ├─ icon16.png
      ├─ icon48.png
      └─ icon128.png
```

说明：

- `chrome_plugins/` 是总工程目录。
- `bookmark/` 和 `history/` 分别是两个可以被 Chrome 独立加载的扩展目录。
- 每个子目录都必须有自己的 `manifest.json`。
- 每个插件都应有自己的图标、Popup 页面、CSS 和 JS。
- 不建议第一版抽公共代码，因为两个插件都很小，过早抽象会增加复杂度。

---

## 2. 两个插件的职责边界

| 插件 | 主要 API | 核心权限 | 主要功能 | 不建议混入 |
|---|---|---|---|---|
| `bookmark` | `chrome.bookmarks` | `bookmarks`、可选 `favicon` | 读取书签树、递归展开、搜索书签、打开书签 | 历史记录、最近关闭标签页 |
| `History` | `chrome.history`、`chrome.sessions` | `history`、可选 `sessions`、可选 `tabs` | 搜索历史记录、显示最近访问、恢复最近关闭 | 书签管理、书签树遍历 |

核心原则：

- `bookmark` 只关心“用户收藏过的网站”。
- `History` 只关心“用户访问过的网站”和“最近关闭的会话”。
- 两者 UI 风格可以统一，但权限和数据来源必须分开。

---

## 3. 权限设计总原则

Chrome 插件权限越少，用户越容易信任，也越容易通过后续发布审核。

### 3.1 `bookmark` 插件权限

推荐第一版：

```json
"permissions": ["bookmarks", "favicon"]
```

解释：

- `bookmarks`：读取 Chrome 书签树，必须申请。
- `favicon`：如果使用 MV3 的 `/_favicon/` 内置路径显示网页图标，建议申请。
- 不需要 `history`。
- 不需要 `sessions`。
- 创建新标签页通常可以直接使用 `chrome.tabs.create({ url })`，不一定需要额外声明 `tabs` 权限；如实际测试受限，再补充。

### 3.2 `History` 插件权限

基础版：

```json
"permissions": ["history"]
```

增强版：

```json
"permissions": ["history", "sessions", "tabs"]
```

解释：

- `history`：读取浏览历史，必须申请。
- `sessions`：只有实现“最近关闭标签页/窗口”时才申请。
- `tabs`：如果要稳定通过 API 打开历史项、打开 `chrome://history/` 或恢复后的交互，可以申请；如果只用普通链接打开网页，可以先不加。

---

## 4. bookmark 插件开发清单

### 4.1 插件定位

`bookmark` 是一个极简、美观、可搜索的 Chrome 书签 Popup 启动器。

它不是完整书签管理器，第一版不做书签增删改，不做拖拽排序，不做复杂文件夹管理。它的重点是：快速搜索、快速打开、界面好看。

### 4.2 第一版必须完成

- [ ] 点击插件图标后弹出 Popup。
- [ ] 通过 `chrome.bookmarks.getTree()` 读取完整书签树。
- [ ] 编写递归函数遍历所有书签节点。
- [ ] 将树结构转换为平铺数组。
- [ ] 每个书签保留 `id`、`title`、`url`、`dateAdded`、`path`。
- [ ] 顶部提供搜索框。
- [ ] 搜索范围包括标题、URL、文件夹路径。
- [ ] 列表项显示 favicon、标题、简化 URL、所属文件夹路径。
- [ ] 点击书签后打开新标签页。
- [ ] 支持暗黑模式。
- [ ] 搜索无结果或没有书签时显示空状态。

### 4.3 第一版暂不建议做

- [ ] 书签新增、删除、编辑。
- [ ] 拖拽排序。
- [ ] 完整文件夹管理。
- [ ] 多设备同步识别。
- [ ] AI 分类书签。
- [ ] 置顶书签持久化。

原因：这些功能会显著增加权限、状态管理和 UI 复杂度。第一版先把“查找 + 打开”做好。

### 4.4 `bookmark/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "bookmark",
  "version": "0.1.0",
  "description": "A clean popup for quickly searching and opening Chrome bookmarks.",
  "permissions": ["bookmarks", "favicon"],
  "action": {
    "default_title": "bookmark",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 4.5 `bookmark/popup.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>bookmark</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <main class="app">
    <header class="header">
      <div>
        <h1>bookmark</h1>
        <p id="count-text">加载中...</p>
      </div>
    </header>

    <section class="search-wrap">
      <input
        id="search-input"
        type="search"
        placeholder="搜索书签标题、网址或文件夹..."
        autocomplete="off"
      />
    </section>

    <section id="bookmark-list" class="bookmark-list"></section>

    <section id="empty-state" class="empty-state" hidden>
      <div class="empty-icon">☆</div>
      <p>没有找到匹配的书签</p>
    </section>
  </main>

  <script src="popup.js"></script>
</body>
</html>
```

### 4.6 `bookmark/popup.css`

```css
:root {
  --bg: rgba(248, 250, 252, 0.92);
  --panel: rgba(255, 255, 255, 0.76);
  --text: #111827;
  --muted: #6b7280;
  --border: rgba(17, 24, 39, 0.08);
  --hover: rgba(15, 23, 42, 0.06);
  --shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
  --radius: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: rgba(15, 23, 42, 0.96);
    --panel: rgba(30, 41, 59, 0.78);
    --text: #f8fafc;
    --muted: #94a3b8;
    --border: rgba(255, 255, 255, 0.08);
    --hover: rgba(255, 255, 255, 0.08);
    --shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  }
}

* {
  box-sizing: border-box;
}

body {
  width: 390px;
  max-height: 560px;
  margin: 0;
  color: var(--text);
  background: var(--bg);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app {
  min-height: 520px;
  padding: 14px;
  background: var(--bg);
  backdrop-filter: blur(14px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.header p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.search-wrap {
  position: sticky;
  top: 0;
  z-index: 10;
  padding-bottom: 10px;
  background: var(--bg);
}

#search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  outline: none;
}

#search-input:focus {
  border-color: rgba(59, 130, 246, 0.55);
}

.bookmark-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 2px;
}

.bookmark-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 8px 10px;
  color: inherit;
  text-decoration: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
}

.bookmark-item:hover {
  background: var(--hover);
  border-color: var(--border);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.bookmark-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 5px;
}

.bookmark-main {
  min-width: 0;
  flex: 1;
}

.bookmark-title,
.bookmark-url,
.bookmark-path {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-title {
  font-size: 13px;
  font-weight: 600;
}

.bookmark-url {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.bookmark-path {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
  opacity: 0.78;
}

.empty-state {
  padding: 54px 16px;
  color: var(--muted);
  text-align: center;
}

.empty-icon {
  margin-bottom: 8px;
  font-size: 28px;
}
```

### 4.7 `bookmark/popup.js`

```js
const listEl = document.getElementById('bookmark-list');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');

let allBookmarks = [];

async function init() {
  try {
    const tree = await chrome.bookmarks.getTree();
    allBookmarks = flattenBookmarks(tree);
    renderBookmarks(allBookmarks);
    bindSearch();
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    countText.textContent = '书签加载失败';
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = '无法读取书签，请检查扩展权限。';
  }
}

function flattenBookmarks(nodes, path = []) {
  const result = [];

  for (const node of nodes) {
    const title = node.title || '';

    if (node.children) {
      const nextPath = title ? [...path, title] : path;
      result.push(...flattenBookmarks(node.children, nextPath));
      continue;
    }

    if (node.url) {
      result.push({
        id: node.id,
        title: title || '无标题',
        url: node.url,
        path: path.filter(Boolean).join(' / '),
        dateAdded: node.dateAdded || 0
      });
    }
  }

  return result;
}

function renderBookmarks(bookmarks) {
  listEl.textContent = '';
  countText.textContent = `${bookmarks.length} / ${allBookmarks.length} 个书签`;
  emptyState.hidden = bookmarks.length > 0;

  const fragment = document.createDocumentFragment();
  for (const bookmark of bookmarks) {
    fragment.appendChild(createBookmarkItem(bookmark));
  }
  listEl.appendChild(fragment);
}

function createBookmarkItem(bookmark) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'bookmark-item';
  item.title = `${bookmark.title}\n${bookmark.url}`;

  const icon = document.createElement('img');
  icon.className = 'bookmark-icon';
  icon.alt = '';
  icon.loading = 'lazy';
  icon.src = getFaviconUrl(bookmark.url);
  icon.onerror = () => {
    icon.src = createFallbackIcon(bookmark.title);
  };

  const main = document.createElement('span');
  main.className = 'bookmark-main';

  const title = document.createElement('span');
  title.className = 'bookmark-title';
  title.textContent = bookmark.title;

  const url = document.createElement('span');
  url.className = 'bookmark-url';
  url.textContent = simplifyUrl(bookmark.url);

  const path = document.createElement('span');
  path.className = 'bookmark-path';
  path.textContent = bookmark.path || '书签栏';

  main.append(title, url, path);
  item.append(icon, main);

  item.addEventListener('click', async () => {
    await chrome.tabs.create({ url: bookmark.url });
    window.close();
  });

  return item;
}

function getFaviconUrl(url) {
  return chrome.runtime.getURL(
    '/_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32'
  );
}

function createFallbackIcon(title) {
  const letter = (title || '?').trim().slice(0, 1).toUpperCase() || '?';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#e5e7eb"/>
      <text x="16" y="21" text-anchor="middle" font-size="15" font-family="Arial" fill="#111827">${letter}</text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function simplifyUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function bindSearch() {
  let timer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const keyword = searchInput.value.trim().toLowerCase();

      if (!keyword) {
        renderBookmarks(allBookmarks);
        return;
      }

      const filtered = allBookmarks.filter((bookmark) => {
        const text = [bookmark.title, bookmark.url, bookmark.path]
          .join(' ')
          .toLowerCase();
        return text.includes(keyword);
      });

      renderBookmarks(filtered);
    }, 150);
  });
}

init();
```

### 4.8 bookmark 验收标准

- [ ] 在 `chrome://extensions/` 中能加载 `bookmark/`。
- [ ] 点击工具栏图标后能打开 Popup。
- [ ] 能显示书签总数和当前筛选数量。
- [ ] 能显示所有书签链接。
- [ ] 能显示书签所属文件夹路径。
- [ ] 搜索标题、URL、文件夹名都有效。
- [ ] 点击书签能打开新标签页。
- [ ] favicon 失败时不出现破图。
- [ ] 暗黑模式下可读。
- [ ] 无结果时有空状态。

---

## 5. History 插件开发清单

### 5.1 插件定位

`History` 是一个高颜值、可搜索的 Chrome 历史记录 Popup 插件。

它第一版应该先做好最近历史记录展示和关键词搜索。第二步再加入“最近关闭标签页/窗口”。

### 5.2 第一版必须完成

- [ ] 点击插件图标后弹出 Popup。
- [ ] 通过 `chrome.history.search()` 读取最近历史记录。
- [ ] 默认显示最近 20 条历史记录。
- [ ] 顶部搜索框支持实时搜索。
- [ ] 搜索输入加入 150-250ms debounce。
- [ ] 列表项显示标题、URL、访问时间。
- [ ] 点击历史项打开新标签页。
- [ ] 支持暗黑模式。
- [ ] 无历史记录或无搜索结果时显示空状态。
- [ ] 发布前删除敏感 `console.log`。

### 5.3 第二版增强功能

- [ ] 加入 `sessions` 权限。
- [ ] 使用 `chrome.sessions.getRecentlyClosed()` 获取最近关闭标签页/窗口。
- [ ] 区分 `session.tab` 和 `session.window.tabs`。
- [ ] 使用 `chrome.sessions.restore(sessionId)` 恢复关闭的标签页或窗口。
- [ ] 添加“查看全部记录”按钮。
- [ ] 尝试打开 `chrome://history/`，失败时提示用户使用 `Ctrl + H`。

### 5.4 不建议第一版做

- [ ] 多设备同步标识。
- [ ] 大规模懒加载。
- [ ] 复杂插画。
- [ ] 历史记录删除和批量管理。
- [ ] AI 历史分类。

原因：`history.search()` 返回的数据不稳定提供“来自哪个设备”的字段；而复杂管理功能会让插件从“快速查看器”变成“历史管理器”，第一版没必要。

### 5.5 `history/manifest.json`

如果第一版只做历史搜索，使用基础版：

```json
{
  "manifest_version": 3,
  "name": "History",
  "version": "0.1.0",
  "description": "A clean popup for searching recent Chrome history.",
  "permissions": ["history"],
  "action": {
    "default_title": "History",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

如果第一版直接包含“最近关闭”和“打开新标签”，使用增强版：

```json
{
  "manifest_version": 3,
  "name": "History",
  "version": "0.1.0",
  "description": "A clean popup for searching recent Chrome history and recently closed tabs.",
  "permissions": ["history", "sessions", "tabs"],
  "action": {
    "default_title": "History",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

推荐实际开发顺序：先用基础版；等历史搜索稳定后，再改为增强版。

### 5.6 `history/popup.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>History</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <main class="app">
    <header class="header">
      <div>
        <h1>History</h1>
        <p id="count-text">加载中...</p>
      </div>
    </header>

    <section class="search-wrap">
      <input
        id="search-input"
        type="search"
        placeholder="搜索历史记录..."
        autocomplete="off"
      />
    </section>

    <section id="history-list" class="history-list"></section>

    <section id="recent-section" class="recent-section" hidden>
      <div class="section-title">最近关闭</div>
      <section id="recent-list" class="recent-list"></section>
    </section>

    <footer class="footer">
      <button id="open-full-history" type="button">查看全部记录</button>
    </footer>

    <section id="empty-state" class="empty-state" hidden>
      <div class="empty-icon">⌕</div>
      <p>没有找到匹配的历史记录</p>
    </section>
  </main>

  <script src="popup.js"></script>
</body>
</html>
```

### 5.7 `history/popup.css`

```css
:root {
  --bg: rgba(255, 255, 255, 0.9);
  --panel: rgba(255, 255, 255, 0.72);
  --text: #111827;
  --muted: #6b7280;
  --border: rgba(0, 0, 0, 0.08);
  --hover: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: rgba(17, 24, 39, 0.94);
    --panel: rgba(31, 41, 55, 0.78);
    --text: #f9fafb;
    --muted: #9ca3af;
    --border: rgba(255, 255, 255, 0.1);
    --hover: rgba(255, 255, 255, 0.08);
  }
}

* {
  box-sizing: border-box;
}

body {
  width: 380px;
  max-height: 550px;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  backdrop-filter: blur(10px);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app {
  min-height: 520px;
  padding: 14px;
}

.header {
  margin-bottom: 12px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.header p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.search-wrap {
  position: sticky;
  top: 0;
  z-index: 10;
  padding-bottom: 10px;
  background: var(--bg);
}

#search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  outline: none;
}

.history-list,
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
}

.history-item,
.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 8px 10px;
  color: inherit;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
}

.history-item:hover,
.recent-item:hover {
  background: var(--hover);
  border-color: var(--border);
}

.item-main {
  min-width: 0;
  flex: 1;
}

.item-title,
.item-url,
.item-meta {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
}

.item-url,
.item-meta {
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.section-title {
  margin: 12px 0 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.footer button {
  width: 100%;
  height: 36px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
}

.empty-state {
  padding: 48px 16px;
  color: var(--muted);
  text-align: center;
}
```

### 5.8 `history/popup.js`

```js
const DEFAULT_LIMIT = 20;
const DEFAULT_RANGE_DAYS = 30;

const listEl = document.getElementById('history-list');
const recentSection = document.getElementById('recent-section');
const recentListEl = document.getElementById('recent-list');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');
const openFullHistoryBtn = document.getElementById('open-full-history');

async function init() {
  bindSearch();
  bindFooter();
  await loadHistory('');
  await loadRecentlyClosedIfAvailable();
}

async function searchHistory(query = '') {
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
    console.error('Failed to load history:', error);
    countText.textContent = '历史记录加载失败';
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = '无法读取历史记录，请检查扩展权限。';
  }
}

function renderHistory(items) {
  listEl.textContent = '';
  countText.textContent = `${items.length} 条历史记录`;
  emptyState.hidden = items.length > 0;

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
  button.title = `${item.title || '无标题'}\n${item.url || ''}`;

  const main = document.createElement('span');
  main.className = 'item-main';

  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = item.title || '无标题';

  const url = document.createElement('span');
  url.className = 'item-url';
  url.textContent = simplifyUrl(item.url || '');

  const meta = document.createElement('span');
  meta.className = 'item-meta';
  meta.textContent = formatRelativeTime(item.lastVisitTime);

  main.append(title, url, meta);
  button.append(main);

  button.addEventListener('click', async () => {
    if (!item.url) return;
    await chrome.tabs.create({ url: item.url });
    window.close();
  });

  return button;
}

function bindSearch() {
  let timer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      loadHistory(searchInput.value.trim());
    }, 200);
  });
}

async function loadRecentlyClosedIfAvailable() {
  if (!chrome.sessions?.getRecentlyClosed) return;

  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 5 });
    if (!sessions.length) return;

    recentSection.hidden = false;
    recentListEl.textContent = '';

    const fragment = document.createDocumentFragment();
    for (const session of sessions) {
      fragment.appendChild(createRecentItem(session));
    }
    recentListEl.appendChild(fragment);
  } catch (error) {
    console.warn('Recently closed unavailable:', error);
  }
}

function createRecentItem(session) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'recent-item';

  const isTab = Boolean(session.tab);
  const sessionId = isTab ? session.tab.sessionId : session.window?.sessionId;
  const titleText = isTab
    ? (session.tab.title || '无标题')
    : `窗口 - ${session.window?.tabs?.length || 0} 个标签页`;
  const urlText = isTab ? (session.tab.url || '') : '点击恢复整个窗口';

  const main = document.createElement('span');
  main.className = 'item-main';

  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = titleText;

  const url = document.createElement('span');
  url.className = 'item-url';
  url.textContent = simplifyUrl(urlText);

  main.append(title, url);
  button.append(main);

  button.addEventListener('click', async () => {
    if (!sessionId) return;
    await chrome.sessions.restore(sessionId);
    window.close();
  });

  return button;
}

function bindFooter() {
  openFullHistoryBtn?.addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url: 'chrome://history/' });
      window.close();
    } catch {
      alert('无法自动打开历史记录页面，请按 Ctrl + H 查看全部历史记录。');
    }
  });
}

function simplifyUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
}

init();
```

### 5.9 History 验收标准

- [ ] 在 `chrome://extensions/` 中能加载 `history/`。
- [ ] 点击工具栏图标后能打开 Popup。
- [ ] 默认显示最近 20 条历史记录。
- [ ] 输入关键词后约 200ms 刷新搜索结果。
- [ ] 标题、URL、访问时间能正确显示。
- [ ] 长标题和长 URL 不撑破布局。
- [ ] 点击历史项可打开对应网页。
- [ ] 如果启用 `sessions`，最近关闭区域能显示 tab / window，并能恢复。
- [ ] `chrome://history/` 无法打开时有 fallback 提示。
- [ ] 系统暗黑模式下样式可读。
- [ ] 发布前无隐私敏感 `console.log`。

---

## 6. 统一 UI 风格建议

两个插件虽然功能不同，但建议保持一致的视觉语言：

- Popup 宽度控制在 380px - 400px。
- 最大高度控制在 550px - 560px。
- 使用圆角搜索框。
- 列表项高度保持在 44px - 48px。
- 使用 Flexbox 布局。
- 标题、URL、路径都使用单行省略。
- 使用 CSS 变量管理颜色。
- 支持 `prefers-color-scheme: dark`。
- hover 使用轻微背景色变化，不要做过重动画。
- 空状态使用简洁文字即可，不建议塞复杂插画。

---

## 7. 调试和加载方式

两个插件要分别加载。

### 7.1 加载 bookmark 插件

1. 打开 Chrome。
2. 地址栏输入：

```text
chrome://extensions/
```

3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择：

```text
chrome_plugins/bookmark/
```

6. 点击扩展图标测试 Popup。

### 7.2 加载 History 插件

同样进入 `chrome://extensions/`，点击“加载已解压的扩展程序”，选择：

```text
chrome_plugins/history/
```

注意：不要选择 `chrome_plugins/` 总目录。Chrome 加载扩展时必须选择包含 `manifest.json` 的具体插件目录。

---

## 8. 常见错误与解决方法

| 错误 | 常见原因 | 解决方法 |
|---|---|---|
| `chrome.bookmarks is undefined` | 没声明 `bookmarks` 权限，或选错目录 | 检查 `bookmark/manifest.json`，重新加载扩展。 |
| `chrome.history is undefined` | 没声明 `history` 权限，或选错目录 | 检查 `history/manifest.json`，重新加载扩展。 |
| `chrome.sessions is undefined` | 没声明 `sessions` 权限 | 只有需要最近关闭功能时才添加该权限。 |
| favicon 不显示 | 没声明 `favicon` 权限，或 URL 异常 | 加 `favicon` 权限，并保留默认图标 fallback。 |
| 点击不打开页面 | URL 为空、事件未绑定、权限策略差异 | 检查 Console，必要时加 `tabs` 权限。 |
| Popup 白屏 | JS 报错中断 | 右键 Popup 页面，点击“检查”，查看 Console。 |
| 修改代码后没生效 | 扩展没有重新加载 | 回到 `chrome://extensions/`，点击对应扩展的刷新按钮。 |
| 选择总目录无法加载 | 总目录没有 `manifest.json` | 分别选择 `bookmark/` 或 `history/`。 |

---

## 9. 发布前检查清单

两个插件发布前都需要检查：

- [ ] `manifest.json` 中的权限是否最小化。
- [ ] 图标尺寸是否包含 16、48、128。
- [ ] 没有发布版敏感 `console.log`。
- [ ] 无外部依赖或外部请求，除非明确说明。
- [ ] 支持浅色和暗黑模式。
- [ ] 空状态、失败状态、长文本状态都可用。
- [ ] README 说明插件用途和权限用途。
- [ ] 准备截图。
- [ ] 准备隐私说明。
- [ ] 版本号符合语义化版本习惯，例如 `0.1.0`、`0.2.0`、`1.0.0`。

---

## 10. 推荐开发顺序

### 第 1 步：创建总工程

```text
chrome_plugins/
├─ bookmark/
└─ history/
```

### 第 2 步：先开发 bookmark

原因：`bookmark` 只读书签树，数据比较稳定，风险小，适合作为第一个 MV3 练手插件。

开发顺序：

1. `manifest.json`
2. `popup.html`
3. `popup.js` 读取书签并渲染
4. 搜索过滤
5. `popup.css` 美化
6. favicon fallback
7. 验收

### 第 3 步：再开发 History

原因：历史记录权限更敏感，且搜索、最近关闭、恢复会话涉及更多边界情况。

开发顺序：

1. `manifest.json` 先只申请 `history`
2. `popup.html`
3. `popup.js` 读取最近 20 条历史记录
4. 搜索防抖
5. `popup.css` 美化
6. 点击打开历史项
7. 增加 `sessions` 和最近关闭恢复
8. 验收

### 第 4 步：统一 README 和视觉风格

最后再补：

- 总工程 README。
- 两个插件的截图。
- 权限说明。
- 使用说明。
- 后续版本计划。

---

## 11. 可以直接交给 Claude Code 的总提示词

```text
请在当前目录创建一个名为 chrome_plugins 的工程。该工程包含两个独立的 Chrome Manifest V3 插件：bookmark 和 history。

目录结构要求：
chrome_plugins/bookmark/ 下包含 manifest.json、popup.html、popup.css、popup.js、icons/icon16.png、icons/icon48.png、icons/icon128.png。
chrome_plugins/history/ 下也包含 manifest.json、popup.html、popup.css、popup.js、icons/icon16.png、icons/icon48.png、icons/icon128.png。

bookmark 插件要求：插件名称为 bookmark，权限只申请 bookmarks 和 favicon。Popup 打开后调用 chrome.bookmarks.getTree() 获取完整书签树，递归遍历所有书签节点，转换为平铺数组，同时保留 title、url、id、dateAdded 和文件夹 path。UI 宽度约 390px，最大高度约 560px；顶部显示 bookmark 标题和结果数量；顶部固定搜索框；列表项左侧显示 favicon，中间显示标题、简化 URL 和文件夹路径；支持暗黑模式；搜索标题、URL 和路径，加入 100-200ms debounce；点击书签后用 chrome.tabs.create({ url }) 打开新标签并关闭 popup；favicon 使用 MV3 的 /_favicon/ 路径，失败时使用默认 SVG 首字母图标。

history 插件要求：插件名称为 History。第一版先申请 history 权限，实现最近 20 条历史记录展示和搜索。Popup 顶部显示 History 标题、搜索框和结果数量；列表项显示标题、简化 URL 和相对访问时间；搜索调用 chrome.history.search()，加入约 200ms debounce；点击历史项用 chrome.tabs.create({ url }) 打开新标签并关闭 popup。第二阶段可加入 sessions 和 tabs 权限，实现 chrome.sessions.getRecentlyClosed({ maxResults: 5 })，区分 tab 和 window，并用 chrome.sessions.restore(sessionId) 恢复最近关闭会话。添加“查看全部记录”按钮，尝试打开 chrome://history/，失败时提示用户按 Ctrl + H。

两个插件都要使用 Manifest V3、无外部依赖、支持暗黑模式、长文本省略、空状态提示、错误处理，并避免申请多余权限。请输出完整可运行代码。
```

---

## 12. 参考资料

- Chrome Extensions Manifest V3 文档
- Chrome `bookmarks` API
- Chrome `history` API
- Chrome `sessions` API
- Chrome `tabs` API
- Chrome Extensions favicon 机制
