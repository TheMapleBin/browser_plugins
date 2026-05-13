# chrome_plugins

Chrome Manifest V3 插件工程仓库，包含两个独立的浏览器扩展。

## 插件列表

| 插件 | 目录 | 权限 | 功能 |
|------|------|------|------|
| Quick Bookmarks | `bookmark/` | `bookmarks`, `favicon` | 书签快速搜索与打开 |
| Quick History | `history/` | `history` | 历史记录搜索 |

两个插件彼此独立，分别加载、分别发布、权限不混用。

## 加载方式

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `bookmark/` 或 `history/` 目录（**注意：不要选择 chrome_plugins/ 总目录**）
5. 点击工具栏扩展图标即可使用

## Quick Bookmarks

- 点击图标弹出搜索界面
- 自动读取全部书签并展平为可搜索列表
- 支持按标题、URL、文件夹路径搜索
- 点击书签项在新标签页打开
- 支持系统暗黑模式
- favicon 加载失败时显示首字母图标

### 权限说明

- `bookmarks`：读取 Chrome 书签树，用于展示和搜索
- `favicon`：通过 `/_favicon/` 内置路径显示网页图标

## Quick History

- 点击图标弹出搜索界面
- 默认显示最近 30 天内的 20 条历史记录
- 支持关键词实时搜索（200ms 防抖）
- 点击历史项在新标签页打开
- 显示相对访问时间（刚刚/N分钟前/N小时前/N天前）
- 支持系统暗黑模式
- 「查看全部记录」按钮（尝试打开 chrome://history/）

### 权限说明

- `history`：读取浏览历史记录，用于展示和搜索

> 第二版计划加入 `sessions` 权限，支持恢复最近关闭的标签页。

## 安全设计

- 所有用户数据（书签标题、URL、历史记录标题）均通过 `textContent` 渲染，不使用 `innerHTML`
- URL 打开前验证协议，仅允许 `http:` 和 `https:`
- 显式声明 `content_security_policy`，禁止 `object-src`、`base-uri`、`form-action`
- 权限最小化原则，不申请多余权限
- 无外部依赖，无网络请求

## 工程结构

```
chrome_plugins/
├── README.md
├── bookmark/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── history/
    ├── manifest.json
    ├── popup.html
    ├── popup.css
    ├── popup.js
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## 后续版本计划

- History 第二版：加入 `sessions` 权限，支持最近关闭标签页恢复
- Bookmark 第二版：书签增删改、拖拽排序
- 自定义图标设计

## 许可

MIT
