---
layout: post
title:  常用Git命令
date:   2021-08-22 12:08:00 +0800
categories: 工具
tags: [Git]
typora-root-url: ..

---
* content
{:toc}


## 1、Git工作流程

![git-process](/styles/images/Git/git-process.png)

## 2、Git工作区、暂存区和版本库



- **工作区：**就是你在电脑里能看到的目录。

- **暂存区：**英文叫 stage 或 index。一般存放在 **.git** 目录下的 index 文件（.git/index）中，所以我们把暂存区有时也叫作索引（index）。

- **版本库：**工作区有一个隐藏目录 **.git**，这个不算工作区，而是 Git 的版本库。

  

![img](/styles/images/Git/work-stage.jpg)

- 图中左侧为工作区，右侧为版本库。在版本库中标记为 "index" 的区域是暂存区（stage/index），标记为 "master" 的是 master 分支所代表的目录树。
- 图中我们可以看出此时 "HEAD" 实际是指向 master 分支的一个"游标"。所以图示的命令中出现 HEAD 的地方可以用 master 来替换。
- 图中的 objects 标识的区域为 Git 的对象库，实际位于 ".git/objects" 目录下，里面包含了创建的各种对象及内容。
- 当对工作区修改（或新增）的文件执行 **git add** 命令时，暂存区的目录树被更新，同时工作区修改（或新增）的文件内容被写入到对象库中的一个新的对象中，而该对象的ID被记录在暂存区的文件索引中。
- 当执行提交操作（git commit）时，暂存区的目录树写到版本库（对象库）中，master 分支会做相应的更新。即 master 指向的目录树就是提交时暂存区的目录树。
- 当执行 **git reset HEAD** 命令时，暂存区的目录树会被重写，被 master 分支指向的目录树所替换，但是工作区不受影响。
- 当执行 **git rm --cached <file>** 命令时，会直接从暂存区删除文件，工作区则不做出改变。
- 当执行 **git checkout .** 或者 **git checkout -- <file>** 命令时，会用暂存区全部或指定的文件替换工作区的文件。这个操作很危险，会清除工作区中未添加到暂存区中的改动。
- 当执行 **git checkout HEAD .** 或者 **git checkout HEAD <file>** 命令时，会用 HEAD 指向的 master 分支中的全部或者部分文件替换暂存区和以及工作区中的文件。这个命令也是极具危险性的，因为不但会清除工作区中未提交的改动，也会清除暂存区中未提交的改动。

## 3、Git常用命令

Git 常用的是以下 6 个命令：**git clone**、**git push**、**git add** 、**git commit**、**git checkout**、**git pull**。

![git-command](/styles/images/Git/git-command.jpg)

**说明：**

- workspace：工作区
- staging area：暂存区/缓存区
- local repository：版本库或本地仓库
- remote repository：远程仓库

一个简单的操作步骤：

```bash
git init                 # 初始化仓库
git add .                # 添加文件到暂存区
git commit -m "init"     # 将暂存区内容提交到仓库
```

### 3.1 创建仓库

#### `git init` — 初始化仓库

在当前目录创建 `.git`，把它变成 Git 仓库。

```bash
mkdir demo && cd demo
git init
# 输出类似：Initialized empty Git repository in .../demo/.git/
```

#### `git clone` — 克隆远程仓库

把远程项目完整下载到本地。

```bash
# HTTPS
git clone https://github.com/LJW718/LJW718.github.io.git

# SSH
git clone git@github.com:LJW718/LJW718.github.io.git

# 克隆到指定目录名
git clone https://github.com/LJW718/LJW718.github.io.git my-blog
```

### 3.2 提交与修改

#### `git add` — 添加文件到暂存区

```bash
git add README.md              # 添加单个文件
git add src/ styles/           # 添加指定目录
git add .                      # 添加当前目录所有变更
git add -u                     # 只添加已跟踪文件的修改/删除
```

#### `git status` — 查看仓库状态

```bash
git status                     # 详细状态
git status -s                  # 简短状态（A/M/?? 等）
```

#### `git diff` — 查看差异

```bash
git diff                       # 工作区 vs 暂存区
git diff --staged              # 暂存区 vs 最近一次提交（等同 --cached）
git diff HEAD                  # 工作区+暂存区 vs HEAD
git diff main..feature         # 比较两个分支
git diff HEAD~1 HEAD -- app.js # 查看某文件相邻两次提交差异
```

#### `git commit` — 提交到本地仓库

```bash
git commit -m "fix: correct login validation"
git commit -am "docs: update README"   # 对已跟踪文件跳过 add，直接提交
git commit --amend -m "better message" # 修改最近一次提交说明（未 push 时慎用）
```

#### `git reset` — 回退版本 / 取消暂存

```bash
git reset HEAD README.md       # 取消暂存某个文件，保留工作区修改
git reset --soft HEAD~1        # 回退 1 个提交，改动保留在暂存区
git reset --mixed HEAD~1       # 默认：回退提交，改动回到工作区
git reset --hard HEAD~1        # 危险：回退提交，丢弃暂存区和工作区改动
git reset --hard <commit_id>   # 回退到指定提交
```

#### `git rm` — 删除文件

```bash
git rm log.txt                 # 删除工作区并暂存删除
git rm --cached secret.env     # 只从仓库移除跟踪，本地文件保留
git rm -r build/               # 递归删除目录
```

#### `git mv` — 移动或重命名

```bash
git mv old_name.md new_name.md
git mv docs/guide.md notes/guide.md
git status                     # 会显示为 renamed
```

#### `git checkout` — 切换分支 / 恢复文件

```bash
git checkout main              # 切换到 main 分支
git checkout -b feature/login  # 创建并切换到新分支
git checkout -- app.js         # 用暂存区内容覆盖工作区该文件（丢弃未暂存修改）
git checkout HEAD -- app.js    # 用 HEAD 覆盖暂存区和工作区该文件
```

> 新版本更推荐用 `git switch` 切换分支、`git restore` 恢复文件，语义更清晰。

```bash
git switch main
git switch -c feature/login
git restore app.js             # 恢复工作区
git restore --staged app.js    # 取消暂存
```

### 3.3 提交日志

#### `git log` — 查看提交历史

```bash
git log                        # 完整日志
git log --oneline              # 一行一条
git log --graph --oneline --all
git log -5                     # 最近 5 条
git log --author="LiuJingwen"
git log --since="2024-01-01" --until="2024-12-31"
git log -p -- app.js           # 查看某文件的提交补丁
```

#### `git blame <file>` — 查看文件每行最后修改者

```bash
git blame README.md
git blame -L 10,30 app.js      # 只看第 10~30 行
```

#### `git reflog` — 查看本地操作记录（含已“丢失”的提交）

```bash
git reflog                     # 查看 HEAD 移动记录
git reflog show main
# 误 reset 后，可从 reflog 找到旧 commit 再恢复
git checkout <old_commit_id>
# 或
git reset --hard HEAD@{2}
```

### 3.4 远程操作

#### `git remote` — 管理远程仓库

```bash
git remote -v                  # 查看远程仓库地址
git remote add origin git@github.com:LJW718/LJW718.github.io.git
git remote set-url origin https://github.com/LJW718/LJW718.github.io.git
git remote rename origin github
git remote remove upstream
```

#### `git fetch` — 拉取远程更新（不自动合并）

```bash
git fetch origin               # 获取 origin 全部更新
git fetch origin main          # 只获取 main
git log HEAD..origin/main      # 查看远程比本地多了哪些提交
```

#### `git pull` — 拉取并合并

```bash
git pull                       # 拉取当前分支跟踪的远程分支并合并
git pull origin main
git pull --rebase origin main  # 用 rebase 方式整合，历史更线性
```

#### `git push` — 推送到远程

```bash
git push origin main
git push -u origin feature/login   # 首次推送并设置上游
git push origin --delete feature/old  # 删除远程分支
git push --force-with-lease        # 相对安全的强制推送（慎用）
```

### 3.5 标签（git tag）

标签常用来标记版本发布点，例如 `v1.0.0`。标签分两种：

- **轻量标签（lightweight）**：只是某个 commit 的引用
- **附注标签（annotated）**：含打标签者、日期、说明，发布场景更推荐

#### 查看标签

```bash
git tag                        # 列出本地所有标签
git tag -l "v1.*"              # 按模式筛选
git show v1.0.0                # 查看标签详情（附注标签会显示说明）
```

#### 创建标签

```bash
# 给当前提交打附注标签（推荐）
git tag -a v1.0.0 -m "release version 1.0.0"

# 给历史某次提交打标签
git log --oneline
git tag -a v0.9.0 3a1b2c3 -m "hotfix before 1.0"

# 轻量标签（不推荐用于正式发布）
git tag v1.0.0-beta
```

#### 推送 / 删除标签

```bash
# 推送单个标签到远程
git push origin v1.0.0

# 推送本地全部标签
git push origin --tags

# 删除本地标签
git tag -d v1.0.0

# 删除远程标签（两种写法等价）
git push origin --delete v1.0.0
git push origin :refs/tags/v1.0.0
```

#### 检出标签

```bash
# 进入“分离头指针”状态查看该版本代码
git checkout v1.0.0

# 基于标签新建分支继续开发（推荐）
git switch -c hotfix/1.0.1 v1.0.0
```

#### 典型发版流程举例

```bash
git checkout main
git pull origin main
git tag -a v1.2.0 -m "release 1.2.0: add git tag docs"
git push origin main
git push origin v1.2.0
```

## 4、Git常见问题

### OpenSSL SSL_read: Connection was reset, errno 10054

![ssl-error](/styles/images/Git/2021-08-20_01-01-37.png)

解决方案：

```bash
git config --global http.sslVerify false
```

举例：如果 `git clone` / `git pull` 时反复报 `Connection was reset`，可先临时关闭 SSL 校验；网络稳定后建议再改回：

```bash
git config --global http.sslVerify true
```
