---
layout: post
title:  可视化构建工具
date:   2026-06-01 12:08:00 +0800
categories: 工具
tags: [自动化, 构建]
typora-root-url: ..

---
* content
{:toc}

# ULTRA可视化构建工具

Windows 下一键构建 **NL Ultra** 固件的图形界面与批处理入口，统一本地调试、项目发布与主干自动化发布流程。

- GUI：`BuildToolsGUI.pyw`（Tkinter，无控制台窗口）
- 构建脚本：`ultra_build.bat`（五种构建模式共用）
- 配置：`build_tools.ini`（首次启动 GUI 会自动生成）

当前版本见仓库根目录 [`RELEASE_NOTES.md`](RELEASE_NOTES.md)（最新 `## V主.次.修订 - YYYY-MM-DD` 条目）

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 五种构建版本 | 本地调试 / 项目发布 / 项目自动化 / 主干自动化发布 / 主干自动化热修复 |
| 仓库与分支展示 | Powerline 风格显示路径、当前分支与 git 状态 |
| 构建产品 | `ALL` / `SU3` / `U1000` / `U100`（本地调试为单选） |
| 构建前清理 | 可选；主干自动化发布强制清理 |
| 输出目录快捷打开 | 侧栏打开 `local_debug` / `project_release` / `automation_release` |
| Wi‑Fi 快捷连接 | 侧栏配置并调用 `connect_wifi.bat` |
| 单实例 | 重复启动会提示并前置已有窗口 |
| 任务栏图标 | 使用应用图标固定到任务栏（避免显示为 pythonw） |

---

## 环境要求

- Windows 10/11
- Python 3（建议 3.8+，使用自带 `tkinter`；双击 `.pyw` 时走 `pythonw`）
- Git（已加入 `PATH`，仓库可通过 SSH/HTTPS 访问）
- 本机构建环境（与仓库内既有 `build_*.bat` / 交叉编译工具链一致）

仓库远程约定（脚本默认）：

- Ultra：`nl_ultra.git`
- SDK：`nl_sdk.git`

---

## 快速开始

1. 将本目录放到本机任意路径（例如 `D:\WorkSpace\Tools\TTI\ultra_build`）。
2. 双击 **`BuildToolsGUI.pyw`** 启动界面。
3. 在配置区选择：
   - **构建版本**
   - **构建产品**
   - **ULTRA / SDK 代码仓库**（浏览选择本地 clone 目录）
4. 确认分支显示正确后，点击 **开始构建**。
5. 日志在窗口下方实时输出；成功后可选择打开输出目录。

也可直接运行批处理（依赖已写好的 `build_tools.ini`）：

```bat
ultra_build.bat
ultra_build.bat local
```

- 无 GUI、且 `[GLOBAL] build_auto_release_version=true` 时，会按 **主干自动化发布** 逻辑执行（适合计划任务 / 夜间构建）。
- 计划任务等无人值守场景可设置环境变量 `ULTRA_NO_PAUSE=1`，避免 `pause` 卡住。

---

## 构建版本说明

| 界面名称 | 内部模式 | 配置节 | 典型用途 |
|----------|----------|--------|----------|
| 本地调试 | `DEBUG` | `[ULTRA_BUILD]` | 本机调试包，输出到 `local_debug\` |
| 项目发布 | `PROJECT_RELEASE` | `[ULTRA_BUILD]` | 发布分支构建，输出到 `project_release\` |
| 项目自动化 | `PROJECT_AUTOMATED` | `[ULTRA_BUILD]` | 项目侧自动化（含 SDK）；产物在 `automation_release\automation_project\` |
| 主干自动化发布 | `AUTO_RELEASE` | `[ULTRA_AUTO_RELEASE]` | 固定分支（默认 Ultra=`develop`，SDK=`master_automation`），构建前保留现场；产品固定为 `ALL`；产物在 `automation_release\automation_daily\` |
| 主干自动化热修复 | `AUTO_HOTFIX` | `[ULTRA_BUILD]` | hotfix 类主干自动化（含 SDK）；产物在 `automation_release\automation_hotfix\` |

**主干自动化发布** 的分支在界面上不可改（构建时自动 checkout 并在结束后恢复现场）。其它模式会实时读取仓库当前分支。

需要 SDK 仓库的模式：项目自动化、主干自动化发布、主干自动化热修复。

---

## 配置文件 `build_tools.ini`

由 GUI 读写，也可手工编辑（UTF-8）。主要结构：

```ini
[GLOBAL]
build_auto_release_version = true
show_local_debug_version = true
show_project_release_version = true
show_project_automated_version = false
show_auto_release_version = false
show_auto_hotfix_version = false

[ULTRA_BUILD]
build_local_debug_version = true
build_project_release_version = false
build_project_automated_version = false
build_auto_release_version = false
build_auto_hotfix_version = false
nl_ultra_branch = release/x.y.z
nl_sdk_branch = master_automation
build_product = SU3
clear_before_build = true
nl_ultra_repo_path = D:\path\to\NL_Ultra
nl_sdk_repo_path = D:\path\to\NL_SDK

[ULTRA_AUTO_RELEASE]
nl_ultra_branch = develop
nl_sdk_branch = master_automation
build_product = ALL
clear_before_build = true
nl_ultra_repo_path = D:\path\to\NL_Ultra
nl_sdk_repo_path = D:\path\to\NL_SDK

[WIFI_1]
ssid = YourSSID
password = YourPassword
```

说明：

- 模式互斥开关写在 `[ULTRA_BUILD]`；同一时间仅一个为 `true`。
- `[GLOBAL] build_auto_release_version` 由工具固定为 `true`（非 GUI 入口强制走自动发布配置）。
- `[GLOBAL] show_*_version` 控制界面是否显示对应构建版本（默认仅本地调试、项目发布为 `true`）。
  左侧文件夹按钮同样跟随：本地调试版本 / 项目发布版本 / 自动化版本（后三者任一为 true 时显示）。
- Wi‑Fi 节名为 `WIFI_1`、`WIFI_2`…，在侧栏点击可编辑。

---

## 输出目录

| 目录 | 用途 |
|------|------|
| `local_debug\` | 本地调试构建产物与日志 |
| `project_release\` | 项目发布产物与日志 |
| `automation_release\automation_daily\YYYY-MM-DD\` | **主干自动化发布**按日归档（产品子目录、SDK 日志、多语言 XML、commit 摘要等） |
| `automation_release\automation_project\YYYY-MM-DD\` | **项目自动化**按日归档（目录结构同上） |
| `automation_release\automation_hotfix\YYYY-MM-DD\` | **主干自动化热修复**按日归档（目录结构同上） |

---

## 主要文件

```
ultra_build/
├── BuildToolsGUI.pyw      # 可视化界面（主入口）
├── ultra_build.bat        # 统一构建脚本（须 CRLF 换行）
├── connect_wifi.bat       # Wi‑Fi 连接辅助
├── build_tools.ini        # 运行配置（本地生成/维护）
├── .gitattributes         # 强制 *.bat / *.cmd 使用 CRLF
├── local_debug/           # 本地调试输出
├── project_release/       # 项目发布输出
└── automation_release/    # 自动化输出根目录
    ├── automation_daily/       # 主干自动化发布
    ├── automation_project/     # 项目自动化
    └── automation_hotfix/      # 主干自动化热修复
```

---

## 注意事项

1. **`ultra_build.bat` 必须使用 CRLF**  
   仓库已通过 `.gitattributes` 约束。若在 Linux/macOS 或错误工具下改成 LF，Windows 上会出现 `'enabledelayedexpansion' is not recognized` 一类错误。

2. **先配置仓库路径**  
   未选择有效的 `nl_ultra.git` / `nl_sdk.git` 本地目录时，开始构建按钮会保持不可用。

3. **单实例**  
   同一时间只允许一个 GUI；再次启动会激活已有窗口。

4. **日志与排错**  
   - GUI 下方实时日志  
   - 启动异常可查看同目录 `error.log`  
   - 各输出目录下的 `*.log` / `*_build.log`

5. **安全**  
   `build_tools.ini` 可能包含 Wi‑Fi 密码与本机绝对路径，请勿将含敏感信息的配置提交到公开仓库。

---

## 项目源码

- [https://github.com/LJW718/BuildTools.git](https://github.com/LJW718/BuildTools.git)
