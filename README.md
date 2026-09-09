# LessOrMore

基于 [Less 官网](http://lesscss.cn/) 样式改造的简洁 Jekyll 博客主题，用于个人技术笔记与生活记录。

**在线预览：** [https://ljw718.github.io/](https://ljw718.github.io/)

## 特性

- 简洁清爽的排版，适合长文阅读
- 支持文章分类（categories）与标签（tag）
- 自动生成文章目录（TOC）
- 分页浏览（jekyll-paginate）
- 适配 GitHub Pages 一键部署

## 快速开始

### 环境要求

- Ruby（建议 2.7+）
- Bundler / Jekyll

```bash
gem install bundler jekyll
gem install jekyll-paginate
```

### 克隆与运行

```bash
git clone https://github.com/LJW718/LJW718.github.io.git
cd LJW718.github.io
jekyll serve
```

浏览器访问 [http://localhost:4000/](http://localhost:4000/) 即可预览。

> Windows 也可在项目目录打开终端后直接执行 `jekyll serve`。

## 配置说明

站点配置集中在 `_config.yml`，常用项如下：

| 配置项 | 说明 |
|--------|------|
| `name` | 站点名称 |
| `author` / `email` | 作者信息 |
| `url` | 站点完整 URL |
| `baseurl` | 子路径；`username.github.io` 用户页请设为 `''` |
| `github` / `github_username` | GitHub 主页与用户名 |
| `description` / `motto` / `banner` | 站点描述与标语 |
| `paginate` | 首页每页文章数 |

**注意：** `baseurl` 配置错误会导致 CSS/JS 等静态资源 404。用户页仓库（`*.github.io`）务必保持 `baseurl: ''`。

## 撰写文章

1. 在 `_posts` 目录新建 Markdown 文件，命名格式：

   ```text
   YYYY-MM-DD-文章标题.md
   ```

2. 文件头部使用 Front Matter，参考 `_drafts/year-month-day-BlogNameTemplate.md`：

   ```markdown
   ---
   layout: post
   title:  标题
   date:   2026-01-01 12:00:00 +0800
   categories: 分类
   tag: 标签
   ---

   * content
   {:toc}


   正文从这里开始……
   ```

3. `* content` 与 `{:toc}` 用于生成目录；目录与正文之间至少空两行。
4. 草稿可放在 `_drafts`，本地预览草稿时使用：

   ```bash
   jekyll serve --drafts
   ```

更完整的使用说明见：[如何使用当前 Jekyll 模版](https://ljw718.github.io/2019/02/22/how-to-use-this-jekyll-theme/)。

## 目录结构

```text
.
├── _config.yml      # 站点配置
├── _posts/          # 已发布文章
├── _drafts/         # 草稿与写作模板
├── _layouts/        # 页面布局
├── _includes/       # 可复用片段
├── _sass/           # 样式源文件
├── styles/          # 静态资源（CSS/JS/图片）
├── categories/      # 分类页
├── tag/             # 标签页
├── index.html       # 首页
├── author.md        # 关于作者
├── books.md         # 书单等页面
└── feed.xml         # RSS
```

## 部署

本仓库即 GitHub Pages 源码。推送到 `master`（或 Pages 所配置的分支）后，站点会自动构建并发布到 [https://ljw718.github.io/](https://ljw718.github.io/)。

若 fork 用作自己的博客：将文件复制到你的 `username.github.io` 仓库，按需修改 `_config.yml`，再开启 GitHub Pages 即可。

## 致谢

- [Less 官网](http://lesscss.cn/) — 主题样式来源；本项目在其基础上重构了 JS，并接入 Jekyll
- [GitHub](https://github.com/) — 代码托管与 Pages 发布
- [Jekyll](https://jekyllrb.com/) — 静态站点生成

## 许可

[MIT License](LICENSE)
