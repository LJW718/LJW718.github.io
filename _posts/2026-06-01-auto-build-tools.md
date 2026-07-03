---
layout: post
title:  自动化构建
date:   2026-06-01 12:08:00 +0800
categories: Tools
typora-root-url: ..

---
* content
{:toc}

# 🚀 自动化版本构建工具

本仓库包含两个自动化构建脚本，用于编译 **NL_SDK** 和 **NL_Ultra** 项目，生成适用于 U1000、U100 和 SU3 等终端的固件包。

---

## 📂 脚本对比与说明

| 特性 | `auto_build_automation.bat` | `manu_build_automation.bat` |
| :--- | :--- | :--- |
| **定位** | **全自动构建** (CI/CD, 干净环境) | **半自动构建** (开发机, 本地测试) |
| **仓库路径** | 脚本目录下的 `source_code/` | 固定绝对路径 (如 `D:\WorkSpace\Code\...`) |
| **工作区保护** | ❌ **不保留**<br>强制重置到远程分支 | ✅ **保留**<br>自动暂存修改，构建后恢复 |
| **适用场景** | 每日构建、发布打包 | 开发者日常调试、快速验证 |

---

## 🛠️ 前置条件

在运行脚本前，请确保满足以下环境要求：

- **操作系统**: Windows (依赖 `cmd.exe`)
- **Git**: 已安装并配置好 SSH 密钥 (用于访问 Bitbucket)
- **PowerShell**: 系统可用 (用于获取日期时间)
- **编译工具链**: 确保以下脚本在对应仓库中可执行：
  - SDK: `build_vx.bat`, `build_lx.bat`, `build_su3.bat`
  - Ultra: `clear.bat`, `build_automation.bat`

---

## 🚀 快速开始

### 1. 克隆本仓库

```bash
git clone <this-repo-url>
cd <this-repo-directory>
```

### 2. 修改配置（必要）

根据实际环境修改脚本开头的 `Configuration Area`：

### A. 公共配置项

| 变量名 | 说明 | 示例值 |
| :--- | :--- | :--- |
| `NL_ULTRA_REPO_URL` | NL_Ultra 仓库 SSH 地址 | `git@bitbucket.org:tti-terminal/nl_ultra.git` |
| `NL_SDK_REPO_URL` | NL_SDK 仓库 SSH 地址 | `git@bitbucket.org:tti-terminal/nl_sdk.git` |
| `NL_ULTRA_BRANCH` | 使用的 Ultra 分支 | `develop` |
| `NL_SDK_BRANCH` | 使用的 SDK 分支 | `branch_gui_pay_merge_250513_automation_desfire_u100s` |
| `TASKS[1] ~ TASKS[3]` | 编译任务定义（见下方格式） | `U1000\|build_vx.bat\|U1000\lib\|lib-u1000\lib_sdk\lib\|vx\|.NLD` |

### B. 任务定义格式

```text
版本名称|构建脚本名|SDK库源子路径|目标子路径|构建参数|产物扩展名
```

例如：

```batch
set "TASKS[1]=U1000|build_vx.bat|U1000\lib|lib-u1000\lib_sdk\lib|vx|.NLD"
set "TASKS[2]=U100|build_lx.bat|U100\lib|lib\lib_sdk\lib|lx|.NLD"
set "TASKS[3]=SU3|build_su3.bat|SU3\lib|lib_su3\lib_sdk\lib|su3|.tpk"
```

### C. 针对`manu_build`的额外配置

请修改为本地实际路径。

```batch
set "NL_ULTRA_REPO_PATH=D:\WorkSpace\Code\NL_Ultra"
set "NL_SDK_REPO_PATH=D:\WorkSpace\Code\NL_SDK"
```

### 3. 执行脚本

- **自动构建(干净环境)**
```batch
auto_build_automation.bat
```

- **手动构建(保留现场)**
```batch
manu_build_automation.bat
```

### 📁 输出目录结构

所有构建产物和日志都会保存在脚本所在目录下的`automation_release\YYYY-MM-DD\` 文件夹中。

```text
automation_release/
└── 2026-06-01/                   # 当天日期文件夹
    ├── automation_build.log      # 📝 主流程日志
    ├── sdk_commit.txt            # 📦 NL_SDK 最近10条提交记录
    ├── ultra_commit.txt          # 📦 NL_Ultra 最近10条提交记录（仅在 auto 脚本中）
    ├── xml/                      # 🌍 多语言 XML 文件
    ├── U1000/                    # 📱 U1000 版本产物 
    │   ├── U1000.NLD             # ✅ 最终固件
    │   ├── build_vx.log          # 📄 Ultra 编译日志
    │   └── sdk/
    │       ├── build_vx_sdk.log  # 📄 SDK 编译日志
    │       └── libttisdk.so      # 💾 SDK 库备份
    ├── U100/                     # 📱 U100 版本产物
    │   ├── U100.NLD
    │   ├── build_lx.log
    │   └── sdk/
    │       ├── build_lx_sdk.log
    │       └── libttisdk.so
    └── SU3/                      # 📱 SU3 版本产物
        ├── SU3.tpk
        ├── build_su3.log
        └── sdk/
            ├── build_su3_sdk.log
            └── libttisdk.so
```

### ⚙️ 核心流程详解

#### 🤖 Auto Build (全自动)

1. **准备环境**: 克隆/更新仓库到 `source_code/`。
2. **记录版本**: 保存当前 Commit ID 到 [.txt](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\source_code\nl_sdk\ReleaseNote.txt) 文件。
3. **循环编译** (U1000/U100/SU3):
   - 编译 SDK -> 生成 `sdk/build_xxx_sdk.log`。
   - 拷贝 [libttisdk.so](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\automation_release\2026-05-28\SU3\sdk\libttisdk.so) 到 Ultra 工程。
   - 清理 Ultra 工程 ([clear.bat](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\source_code\nl_sdk\clear.bat))。
   - 编译 Ultra APP -> 生成 `build_xxx.log`。
   - 收集产物 ([.NLD](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\automation_release\2026-05-28\U1000\UltraVX_GLOBAL_2100.002.011.003.NLD)/[.tpk](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\source_code\nl_ultra\dropbear\su3\dropbear_su3.tpk))。
   - 备份 SDK 库到产物目录。
4. **收尾工作**:
   - 拷贝 XML 资源。
   - 清理 30 天前的旧构建目录。
   - **重置仓库**: `git reset --hard` + `git clean -fd`。

#### 👨‍💻 Manual Build (手动/开发)

1. **检查仓库**: 若不存在则克隆，否则进入指定路径。
2. **保护现场**:
   - 检测未提交修改。
   - 若有修改，创建临时 Commit (`TEMP: Auto-build stash`)。
3. **更新代码**: `git pull` 同步最新代码。
4. **执行编译**: 同 Auto Build 的编译循环。
5. **恢复现场**:
   - 撤销临时 Commit (`git reset --mixed`)。
   - 切回原始分支。
   - > **注意**: 你的本地修改会被完整保留。

### 🔍 日志与调试

| 日志类型 | 文件路径示例 | 说明 |
| :--- | :--- | :--- |
| **主流程日志** | `automation_release/<date>/automation_build.log` | 记录脚本整体执行状态、Git 操作结果、文件拷贝情况 |
| **Ultra 编译日志** | `.../U1000/build_vx.log` | 记录 APP 层（NL_Ultra）的详细编译输出 (stdout/stderr) |
| **SDK 编译日志** | `.../U1000/sdk/build_vx_sdk.log` | 记录 SDK 层（NL_SDK）的详细编译输出 (stdout/stderr) |
| **Commit 记录** | `.../sdk_commit.txt` <br> `.../ultra_commit.txt` | 记录构建开始时两个仓库的 HEAD Commit ID，便于追溯版本 |

### ❓ 常见问题定位

| 现象 | 建议检查方法 |
| :--- | :--- |
| **Git clone / fetch 失败** | 检查 SSH 密钥配置、网络连接是否正常、仓库 URL 是否正确 |
| **构建脚本未找到** | 确认 [build_vx.bat](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\source_code\nl_sdk\build_vx.bat) 等脚本是否存在于 `nl_sdk` 根目录 |
| **libttisdk.so 复制失败** | 查看 `sdk/build_xxx_sdk.log`，确认 SDK 库是否成功生成在预期路径 |
| **APP 编译失败** | 查看对应版本的 [.log](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\automation_release\2026-05-28\U1000\build_vx.log) 文件，搜索 "Error" 关键字定位编译器错误 |
| **产物未收集** | 检查 `nl_ultra/bin` 目录下是否存在 [.NLD](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\automation_release\2026-05-28\U1000\UltraVX_GLOBAL_2100.002.011.003.NLD) 或 [.tpk](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\source_code\nl_ultra\dropbear\su3\dropbear_su3.tpk) 文件 |

---

### ⚠️ 注意事项

> **重要提示**:
> 1. **数据安全**: [auto_build_automation.bat](file://d:\WorkSpace\Project\6.GUI\gui_automation\Tools\auto_build_automation.bat) 会强制重置仓库，**严禁**在含有未推送重要提交的个人开发机上运行。建议在专用构建机或 CI 环境中使用。
> 2. **并发限制**: **严禁同时运行**两个脚本，否则会严重干扰仓库状态，导致构建失败或数据丢失。
> 3. **SSH 配置**: 脚本默认设置 `GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no` 以跳过主机密钥检查。在生产环境中，建议预先将 Bitbucket 加入 `known_hosts` 以确保安全。
> 4. **权限要求**: 确保当前用户对所有涉及目录（源码、产物、日志）拥有读写权限。
> 5. **PowerShell 依赖**: 脚本依赖 PowerShell 获取日期时间，请确保系统未禁用 PowerShell 执行策略。

---

### 🔧 自定义扩展 (添加新机型)

若要支持新的终端型号 (例如 `U2000`)，请按以下步骤操作：

1. **修改 TASKS 数组**:
   在脚本的 `Configuration Area` 中增加一行任务定义，并更新总数：
   ```batch
   set "TASKS[4]=U2000|build_u2000.bat|U2000\lib|lib-u2000\lib_sdk\lib|u2000|.NLD"
   set "TOTAL_TASKS=4"
   ```
2. **准备 SDK 构建脚本**:
   确保 `nl_sdk` 仓库根目录下包含对应的构建脚本（例如 `build_u2000.bat`），且该脚本能正确生成 `libttisdk.so`。
3. **配置 Ultra 构建参数**:
   确保 `nl_ultra` 仓库中的 `build_automation.bat` 支持新的构建参数（如 `u2000`），并能正确生成对应的固件文件。

附录1和2为脚本源码，复制粘贴保存为.bat即可使用。

**附录1**：`auto_build_automation.bat`源码

```batch
@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Configuration Area
:: ============================================================================
title auto build automation

REM ---- Paths & URLs ----
set "SCRIPT_DIR=%CD%"
set "NL_ULTRA_REPO_URL=git@bitbucket.org:tti-terminal/nl_ultra.git"
set "NL_SDK_REPO_URL=git@bitbucket.org:tti-terminal/nl_sdk.git"

set "NL_ULTRA_REPO_PATH=%SCRIPT_DIR%\source_code\nl_ultra"
set "NL_SDK_REPO_PATH=%SCRIPT_DIR%\source_code\nl_sdk"

set "NL_ULTRA_BRANCH=develop"
set "NL_SDK_BRANCH=branch_gui_pay_merge_250513_automation_desfire_u100s"

REM ---- Build Config ----
set "SDK_FILE=libttisdk.so"
set "SDK_RELEASE_PATH=%NL_SDK_REPO_PATH%\release"
set "ULTRA_BASE_PATH=%NL_ULTRA_REPO_PATH%"

REM ---- Task Definitions (Version|BuildScript|SrcSubDir|DstSubDir|BuildParam|FileExt) ----
set "TASKS[1]=U1000|build_vx.bat|U1000\lib|lib-u1000\lib_sdk\lib|vx|.NLD"
set "TASKS[2]=U100|build_lx.bat|U100\lib|lib\lib_sdk\lib|lx|.NLD"
set "TASKS[3]=SU3|build_su3.bat|SU3\lib|lib_su3\lib_sdk\lib|su3|.tpk"
set "TOTAL_TASKS=3"

:: ============================================================================
:: Initialization
:: ============================================================================
REM Get Date and Time
for /f %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd'"') do set "TODAY=%%i"
for /f %%i in ('powershell -Command "Get-Date -Format 'HH:mm:ss'"') do set "NOW=%%i"

set "PRODUCT_DIR=%SCRIPT_DIR%\automation_release"
set "TODAY_DIR=%PRODUCT_DIR%\%TODAY%"

REM --- Calculate Relative Path for Logging ---
set "REL_PRODUCT_DIR=.\automation_release"
set "REL_TODAY_DIR=!REL_PRODUCT_DIR!\%TODAY%"

REM Create Base Directories
if not exist "%PRODUCT_DIR%" mkdir "%PRODUCT_DIR%"
if not exist "%TODAY_DIR%" mkdir "%TODAY_DIR%"

REM Main Log is in the root of the daily directory
set "MAIN_LOG_FILE=%TODAY_DIR%\automation_build.log"
set "LOG_PREFIX=AUTO_BUILD"

REM Initialize Main Log
(
    echo ========================================
    echo Build Start: %TODAY% %NOW%
    echo Script: %~f0
    echo Output Dir: !REL_TODAY_DIR!
    echo ========================================
) > "%MAIN_LOG_FILE%"

call :LogInfo "Starting Auto Build Automation..."
call :LogInfo "Output Directory: !REL_TODAY_DIR!"

REM Save SSH Command to avoid host key checking issues
set "ORIG_GIT_SSH_COMMAND=%GIT_SSH_COMMAND%"
set "GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no"

:: ============================================================================
:: Main Execution Flow
:: ============================================================================

REM 1. Prepare Repositories & Generate Global Commit Logs
call :LogInfo "Step 1: Setting up NL_SDK Repo..."
call :PrepareRepo "%NL_SDK_REPO_PATH%" "%NL_SDK_REPO_URL%" "%NL_SDK_BRANCH%" "sdk"
if errorlevel 1 goto ExitWithError

call :LogInfo "Step 2: Setting up NL_Ultra Repo..."
call :PrepareRepo "%NL_ULTRA_REPO_PATH%" "%NL_ULTRA_REPO_URL%" "%NL_ULTRA_BRANCH%" "ultra"
if errorlevel 1 goto ExitWithError

REM 2. Change to Source Repo for Build Scripts
cd /d "%NL_SDK_REPO_PATH%" || (
    call :LogError "Cannot enter source repository: %NL_SDK_REPO_PATH%"
    goto ExitWithError
)
call :LogInfo "Current Working Directory: %CD%"
REM 3. Build Loop
call :LogInfo "Step 3: Starting Compilation Loop..."


set "STEP=1"

:BuildLoop
if %STEP% gtr %TOTAL_TASKS% goto EndBuildLoop

REM Parse Task Config
for /f "tokens=1-6 delims=|" %%A in ("!TASKS[%STEP%]!") do (
    set "VERSION=%%A"
    set "BUILD_SCRIPT=%%B"
    set "SRC_SDK_PATH=%%C"
    set "DST_SDK_PATH=%%D"
    set "BUILD_PARAM=%%E"
    set "EXT=%%F"
)

REM Define Version-Specific Directories and Logs
set "VER_DIR=%TODAY_DIR%\!VERSION!"
set "VER_SDK_LOG_DIR=!VER_DIR!\sdk"
set "SCRIPT_NAME=!BUILD_SCRIPT:.bat=!"

set "SDK_LOG_FILE=!VER_SDK_LOG_DIR!\!SCRIPT_NAME!_sdk.log"
set "ULTRA_LOG_FILE=!VER_DIR!\!SCRIPT_NAME!.log"

REM Create Directories
if not exist "!VER_DIR!" mkdir "!VER_DIR!"
if not exist "!VER_SDK_LOG_DIR!" mkdir "!VER_SDK_LOG_DIR!"

call :LogInfo "------------------------------------------"
call :LogInfo "Building [%STEP%/%TOTAL_TASKS%]: !VERSION!"
call :LogInfo "Version Dir: !REL_TODAY_DIR!\!VERSION!"

REM Initialize Version Logs
(
    echo ========================================
    echo SDK Build Start for !VERSION!: %DATE% %TIME%
    echo ========================================
) > "!SDK_LOG_FILE!"

(
    echo ========================================
    echo Ultra Build Start for !VERSION!: %DATE% %TIME%
    echo ========================================
) > "!ULTRA_LOG_FILE!"

REM 3.1 Execute Build Script (SDK)
if exist "!BUILD_SCRIPT!" (
    call :LogInfo "Executing !BUILD_SCRIPT! Build SDK..."
    echo. | call !BUILD_SCRIPT! >> "!SDK_LOG_FILE!" 2>&1
    if errorlevel 1 (
        call :LogError "!BUILD_SCRIPT! failed for !VERSION!"
        call :LogError "Check log: !REL_TODAY_DIR!\!VERSION!\sdk\!SCRIPT_NAME!_sdk.log"
        goto ExitWithError
    )
    echo [SUCCESS] SDK Build Completed. >> "!SDK_LOG_FILE!"
) else (
    call :LogWarn "!BUILD_SCRIPT! not found. Skipping build step."
    echo [SKIPPED] Script not found. >> "!SDK_LOG_FILE!"
)

REM 3.2 Copy SDK Library to Target Repo
set "SO_SRC=%SDK_RELEASE_PATH%\!SRC_SDK_PATH!\%SDK_FILE%"
set "SO_DST=%ULTRA_BASE_PATH%\!DST_SDK_PATH!\"

if exist "!SO_SRC!" (
    if not exist "!SO_DST!" mkdir "!SO_DST!"
    call :LogInfo "Copying SDK lib to Target..."
    copy /Y "!SO_SRC!" "!SO_DST!" >> "!ULTRA_LOG_FILE!" 2>&1
    if errorlevel 1 (
        call :LogError "Failed to copy SDK lib for !VERSION!"
        goto ExitWithError
    )
    echo [SUCCESS] SDK Lib Copied to Target. >> "!ULTRA_LOG_FILE!"
) else (
    call :LogWarn "SDK lib not found at !SO_SRC!"
    echo [SKIPPED] Source file not found. >> "!ULTRA_LOG_FILE!"
)

REM 3.3 Build Target Project (Ultra)
pushd "%NL_ULTRA_REPO_PATH%"
if errorlevel 1 (
    call :LogError "Cannot enter target repository: %NL_ULTRA_REPO_PATH%"
    goto ExitWithError
)

REM Execute clear.bat
if exist "clear.bat" (
    call :LogInfo "Executing clear.bat..."
    echo. | call clear.bat >> "!ULTRA_LOG_FILE!" 2>&1
    if errorlevel 1 (
        call :LogWarn "clear.bat failed, continuing..."
        echo [WARN] clear.bat failed. >> "!ULTRA_LOG_FILE!"
    ) else (
        echo [SUCCESS] clear.bat completed. >> "!ULTRA_LOG_FILE!"
    )
)

REM Execute build_automation.bat
if exist "build_automation.bat" (
    call :LogInfo "Executing build_automation.bat !BUILD_PARAM! Build APP..."
    echo. | call build_automation.bat !BUILD_PARAM! >> "!ULTRA_LOG_FILE!" 2>&1
    if errorlevel 1 (
        call :LogError "build_automation.bat failed for !VERSION!"
        call :LogError "Check log: !REL_TODAY_DIR!\!VERSION!\!SCRIPT_NAME!.log"
        popd
        goto ExitWithError
    )
    echo [SUCCESS] APP Build Completed. >> "!ULTRA_LOG_FILE!"
) else (
    call :LogError "build_automation.bat not found in Target Repo!"
    popd
    goto ExitWithError
)

REM 3.4 Collect Artifacts (.NLD/.tpk)
if exist "bin" (
    pushd bin
    set "FOUND=0"
    for /f "delims=" %%f in ('dir /b *!EXT! 2^>nul') do (
        set "FOUND=1"
        set "ARTIFACT_DEST=!VER_DIR!\"
        copy "%%f" "!ARTIFACT_DEST!" >nul 2>&1
        if errorlevel 1 (
            call :LogWarn "Failed to copy artifact: %%f"
            echo [ERROR] Failed to copy artifact: %%f >> "!ULTRA_LOG_FILE!"
        ) else (
            call :LogInfo "Collected: %%f"
            echo [SUCCESS] Collected artifact: %%f >> "!ULTRA_LOG_FILE!"
        )
    )
    if !FOUND! equ 0 (
        call :LogWarn "No !EXT! files found in bin."
        echo [WARN] No artifacts found. >> "!ULTRA_LOG_FILE!"
    )
    popd
) else (
    call :LogWarn "bin directory not found in Target Repo."
    echo [WARN] bin directory not found. >> "!ULTRA_LOG_FILE!"
)

REM 3.5 Backup SDK Library to Artifact Dir (Inside Version/sdk/)
if exist "!SO_SRC!" (
    copy /Y "!SO_SRC!" "!VER_SDK_LOG_DIR!\" >nul 2>&1
    call :LogInfo "Backed up !SDK_FILE! to !REL_TODAY_DIR!\!VERSION!\sdk\"
    echo [SUCCESS] Backed up SDK Lib to Version/sdk Dir. >> "!ULTRA_LOG_FILE!"
)

REM Finalize Version Logs
(
    echo ========================================
    echo SDK Build End for !VERSION!: %DATE% %TIME%
    echo ========================================
) >> "!SDK_LOG_FILE!"

(
    echo ========================================
    echo Ultra Build End for !VERSION!: %DATE% %TIME%
    echo ========================================
) >> "!ULTRA_LOG_FILE!"

popd REM Return to Source Repo from Target Repo

set /a STEP+=1
goto BuildLoop

:EndBuildLoop
call :LogInfo "Compilation Loop Finished."

:: ============================================================================
:: Copying multilanguage XML
:: ============================================================================
call :LogInfo "Copying multilanguage xml..."
if exist "%NL_ULTRA_REPO_PATH%\usr\xml" (
    xcopy "%NL_ULTRA_REPO_PATH%\usr\xml" "%TODAY_DIR%\xml\" /E /I /Y >nul 2>&1
    if errorlevel 1 (
        call :LogWarn "Failed to copy multilanguage usr/xml."
    ) else (
        call :LogInfo "Multilanguage usr/xml copied successfully."
    )
) else (
    call :LogWarn "Multilanguage usr/xml directory not found."
)

:: ============================================================================
:: Post-Build Actions
:: ============================================================================

REM Clean old product directories (older than 30 days)
if exist "%PRODUCT_DIR%" (
    call :LogInfo "Cleaning old product & log directories (>30 days)..."
    pushd "%PRODUCT_DIR%"
    forfiles /d -30 /c "cmd /c if @isdir==TRUE rmdir /s /q @file" 2>nul
    popd
)

REM Reset Target Repo to pristine state
pushd "%NL_ULTRA_REPO_PATH%"
call :LogInfo "Resetting Target Repo to pristine state..."
git reset --hard HEAD >> "%MAIN_LOG_FILE%" 2>&1
git clean -fd >> "%MAIN_LOG_FILE%" 2>&1
popd

call :LogInfo "=========================================="
call :LogInfo "BUILD SUCCESSFUL"
call :LogInfo "Artifacts saved to: !REL_TODAY_DIR!"
call :LogInfo "Commit logs saved to: !REL_TODAY_DIR!\*_commit.txt"
call :LogInfo "=========================================="

goto Cleanup

:: ============================================================================
:: Functions
:: ============================================================================

:PrepareRepo
    setlocal enabledelayedexpansion
    set "REPO_PATH=%~1"
    set "REPO_URL=%~2"
    set "BRANCH=%~3"
    set "REPO_TYPE=%~4"

    call :LogInfo "Initializing !REPO_TYPE! repository..."

    if not exist "!REPO_PATH!" (
        call :LogInfo "Cloning !REPO_TYPE! repo (!BRANCH!)..."
        git clone --branch !BRANCH! --single-branch "!REPO_URL!" "!REPO_PATH!" >> "%MAIN_LOG_FILE%" 2>&1
        if errorlevel 1 (
            call :LogError "Git clone failed for !REPO_TYPE!."
            endlocal & exit /b 1
        )
    )

    pushd "!REPO_PATH!"
    if errorlevel 1 (
        call :LogError "Cannot enter repo path: !REPO_PATH!"
        endlocal & exit /b 1
    )

    REM Fetch latest changes
    call :LogInfo "Fetching latest changes for !REPO_TYPE!..."
    git fetch origin >> "%MAIN_LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :LogWarn "Git fetch failed, continuing with local state..."
    )

    REM Reset to remote branch state
    call :LogInfo "Resetting !REPO_TYPE! to origin/!BRANCH!..."
    git checkout -B !BRANCH! origin/!BRANCH! >> "%MAIN_LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :LogError "Git checkout -B failed for !REPO_TYPE!."
        popd
        endlocal & exit /b 1
    )

    REM Clean untracked files
    git clean -fd >> "%MAIN_LOG_FILE%" 2>&1

    REM Log recent commits
    set "GLOBAL_COMMIT_LOG=%TODAY_DIR%\!REPO_TYPE!_commit.txt"
    call :LogInfo "Recording !REPO_TYPE! commit history to !REL_TODAY_DIR!\!REPO_TYPE!_commit.txt"
    git log --pretty=format:"%%h %%s" -10 > "!GLOBAL_COMMIT_LOG!" 2>&1
    
    popd
    endlocal
    exit /b 0

:LogInfo
    echo [%LOG_PREFIX%] [INFO] [%TIME%] %*
    echo [%LOG_PREFIX%] [INFO] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:LogWarn
    echo [%LOG_PREFIX%] [WARN] [%TIME%] %*
    echo [%LOG_PREFIX%] [WARN] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:LogError
    echo [%LOG_PREFIX%] [ERROR] [%TIME%] %*
    echo [%LOG_PREFIX%] [ERROR] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:Cleanup
    REM Restore SSH Command
    if defined ORIG_GIT_SSH_COMMAND (
        set "GIT_SSH_COMMAND=%ORIG_GIT_SSH_COMMAND%"
    ) else (
        set "GIT_SSH_COMMAND="
    )

    REM Clear Variables
    set "NL_ULTRA_REPO_URL="
    set "NL_SDK_REPO_URL="
    set "NL_ULTRA_REPO_PATH="
    set "NL_SDK_REPO_PATH="
    
    endlocal
    REM Wait for user to see results
    timeout /t 5 /nobreak >nul
    exit /b 0

:ExitWithError
    call :LogError "Build Aborted due to errors."
    echo.
    echo Check main log file for details: %MAIN_LOG_FILE%
    echo Check version-specific logs inside their respective directories.
    pause
    goto Cleanup
```

**附录2**: `manu_build_automation.bat`源码

```batch
@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Configuration Area
:: ============================================================================
title manu build automation

REM ---- Paths & URLs ----
set "NL_ULTRA_REPO_URL=git@bitbucket.org:tti-terminal/nl_ultra.git"
set "NL_SDK_REPO_URL=git@bitbucket.org:tti-terminal/nl_sdk.git"

set "NL_ULTRA_REPO_PATH=D:\WorkSpace\Code\NL_Ultra"
set "NL_ULTRA_BRANCH=develop"

set "NL_SDK_REPO_PATH=D:\WorkSpace\Code\NL_SDK"
set "NL_SDK_BRANCH=branch_gui_pay_merge_250513_automation_desfire_u100s"

REM ---- Build Config ----
set "SDK_FILE=libttisdk.so"
set "SCRIPT_DIR=%CD%"
set "LOG_PREFIX=MANU_BUILD"

REM ---- Task Definitions (Version|BuildScript|SrcSubDir|DstSubDir|BuildParam|FileExt) ----
set "TASKS[1]=U1000|build_vx.bat|U1000\lib|lib-u1000\lib_sdk\lib|vx|.NLD"
set "TASKS[2]=U100|build_lx.bat|U100\lib|lib\lib_sdk\lib|lx|.NLD"
set "TASKS[3]=SU3|build_su3.bat|SU3\lib|lib_su3\lib_sdk\lib|su3|.tpk"
set "TOTAL_TASKS=3"

:: ============================================================================
:: Initialization
:: ============================================================================
REM Get Date and Time
for /f %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd'"') do set "TODAY=%%i"
for /f %%i in ('powershell -Command "Get-Date -Format 'HH:mm:ss'"') do set "NOW=%%i"

set "PRODUCT_DIR=%SCRIPT_DIR%\automation_release"
set "TODAY_DIR=%PRODUCT_DIR%\%TODAY%"

REM Create Base Directories
if not exist "%PRODUCT_DIR%" mkdir "%PRODUCT_DIR%"
if not exist "%TODAY_DIR%" mkdir "%TODAY_DIR%"

REM --- Calculate Relative Path for Logging ---
set "REL_PRODUCT_DIR=.\automation_release"
set "REL_TODAY_DIR=!REL_PRODUCT_DIR!\%TODAY%"

REM Main Log is in the root of the daily directory
set "MAIN_LOG_FILE=%TODAY_DIR%\automation_build.log"

REM Initialize Main Log
(
    echo ========================================
    echo Build Start: %TODAY% %NOW%
    echo Script: %~f0
    echo Output Dir: !REL_TODAY_DIR!
    echo ========================================
) > "%MAIN_LOG_FILE%"

call :LogInfo "Starting Build Automation..."
call :LogInfo "Output Directory: !REL_TODAY_DIR!"

REM Save SSH Command
set "ORIG_GIT_SSH_COMMAND=%GIT_SSH_COMMAND%"
set "GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no"

:: ============================================================================
:: Main Execution Flow
:: ============================================================================

REM 1. NL_SDK Repo Setup (Init, Temp Commit if dirty, Pull --rebase, Log)
call :LogInfo "Step 1: Setting up NL_SDK Repo..."
call :SetupNL_SDKRepo
if errorlevel 1 goto ExitWithError

REM 2. NL_Ultra Repo Setup (Init, Handle Dirty/.so, Pull --rebase, Log)
call :LogInfo "Step 2: Setting up NL_Ultra Repo..."
call :SetupNL_UltraRepo
if errorlevel 1 goto ExitWithError

REM 3. Build Loop
call :LogInfo "Step 3: Starting Compilation Loop..."
call :ExecuteBuildLoop
if errorlevel 1 goto ExitWithError

REM 4. Copy multilanguage XML
call :LogInfo "Step 4: Copy multilanguage XML..."
call :CopyMultilangXML

REM 5. Restore Repositories
call :LogInfo "Step 5: Restoring Repositories..."
call :RestoreRepositories

call :LogInfo "=========================================="
call :LogInfo "BUILD SUCCESSFUL"
call :LogInfo "Artifacts saved to: !REL_TODAY_DIR!"
call :LogInfo "Commit logs saved to: !REL_TODAY_DIR!\*_commit.txt"
call :LogInfo "=========================================="

goto Cleanup

:: ============================================================================
:: Functions
:: ============================================================================

:: Unified Initialization Function
:InitAndSetupRepo
    setlocal enabledelayedexpansion
    set "REPO_PATH=%~1"
    set "REPO_URL=%~2"
    set "BRANCH=%~3"
    set "REPO_TYPE=%~4"

    call :LogInfo "Initializing !REPO_TYPE! repository..."

    if not exist "!REPO_PATH!" (
        call :LogInfo "Cloning !REPO_TYPE! repo (!BRANCH!)..."
        git clone --branch !BRANCH! --single-branch "!REPO_URL!" "!REPO_PATH!" >> "%MAIN_LOG_FILE%" 2>&1
        if errorlevel 1 (
            call :LogError "Git clone failed for !REPO_TYPE!."
            endlocal & exit /b 1
        )
    )

    pushd "!REPO_PATH!"
    if errorlevel 1 (
        call :LogError "Cannot enter repo path: !REPO_PATH!"
        endlocal & exit /b 1
    )

    REM Ensure we are on the correct branch
    git fetch origin >> "%MAIN_LOG_FILE%" 2>&1
    
    git rev-parse --verify "!BRANCH!" >>nul 2>&1
    if errorlevel 1 (
        call :LogInfo "Creating local branch !BRANCH! tracking origin/!BRANCH!..."
        git checkout -b !BRANCH! origin/!BRANCH! >> "%MAIN_LOG_FILE%" 2>&1
    ) else (
        call :LogInfo "Switching to branch !BRANCH!..."
        git checkout !BRANCH! >> "%MAIN_LOG_FILE%" 2>&1
    )

    if errorlevel 1 (
        call :LogError "Git checkout failed for !REPO_TYPE!."
        popd
        endlocal & exit /b 1
    )

    popd
    endlocal
    exit /b 0

:: ============================================================================
:: NL_SDK Repository Setup
:: ============================================================================
:SetupNL_SDKRepo
    call :LogInfo "Setting up NL_SDK Repository..."
    
    REM 1. Initialize/Ensure Branch
    call :InitAndSetupRepo "%NL_SDK_REPO_PATH%" "%NL_SDK_REPO_URL%" "%NL_SDK_BRANCH%" "nl_sdk"
    if errorlevel 1 exit /b 1

    cd /d "%NL_SDK_REPO_PATH%" || (
        call :LogError "Cannot access NL_SDK Repo path."
        exit /b 1
    )

    REM 2. Check Dirty State & Temp Commit BEFORE Pull
    call :LogInfo "Checking for uncommitted changes in NL_SDK..."
    call :CheckGitDirty NL_SDK
    if errorlevel 1 exit /b 1

    REM 3. Pull Latest Code with Rebase
    call :LogInfo "Pulling latest NL_SDK code with rebase..."
    git pull --rebase >> "%MAIN_LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :LogError "Failed to pull --rebase NL_SDK repo. Check for conflicts."
        exit /b 1
    )

    REM 4. Record Commit Log (After Pull)
    set "SDK_COMMIT_LOG=%TODAY_DIR%\sdk_commit.txt"
    call :LogInfo "Recording NL_SDK commit history to !REL_TODAY_DIR!\sdk_commit.txt"
    git log --pretty=format:"%%h %%s" -10 > "!SDK_COMMIT_LOG!" 2>&1

    exit /b 0

:: ============================================================================
:: NL_Ultra Repository Setup
:: ============================================================================
:SetupNL_UltraRepo
    call :LogInfo "Setting up NL_Ultra Repository..."
    
    REM 1. Initialize/Ensure Branch
    call :InitAndSetupRepo "%NL_ULTRA_REPO_PATH%" "%NL_ULTRA_REPO_URL%" "%NL_ULTRA_BRANCH%" "ultra"
    if errorlevel 1 exit /b 1

    pushd "%NL_ULTRA_REPO_PATH%" || (
        call :LogError "Cannot access NL_Ultra Repo path."
        exit /b 1
    )

    REM 2. Check Dirty State & Temp Commit BEFORE Pull
    call :LogInfo "Checking for uncommitted changes in NL_Ultra..."
    call :CheckGitDirty NL_Ultra
    if errorlevel 1 (
        popd
        exit /b 1
    )

    REM 3. Pull Latest Code with Rebase
    call :LogInfo "Pulling latest NL_Ultra code with rebase..."
    git pull --rebase >> "%MAIN_LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :LogError "Failed to pull --rebase NL_Ultra repo. Check for conflicts."
        popd
        exit /b 1
    )

    REM 4. Record Final Commit Log (After Pull)
    set "ULTRA_FINAL_COMMIT_LOG=%TODAY_DIR%\ultra_commit.txt"
    call :LogInfo "Recording NL_Ultra commit history to !REL_TODAY_DIR!\ultra_commit.txt"
    git log --pretty=format:"%%h %%s" -10 > "!ULTRA_FINAL_COMMIT_LOG!" 2>&1

    popd
    exit /b 0

:ExecuteBuildLoop
    
    for /L %%i in (1,1,%TOTAL_TASKS%) do (
        REM Parse Task
        for /f "tokens=1-6 delims=|" %%A in ("!TASKS[%%i]!") do (
            set "VER=%%A"
            set "BUILD_SCRIPT=%%B"
            set "SRC_SDK_PATH=%%C"
            set "DST_SDK_PATH=%%D"
            set "BUILD_PARAM=%%E"
            set "EXT=%%F"
        )

        REM Define Version-Specific Directories and Logs
        set "VER_DIR=%TODAY_DIR%\!VER!"
        set "VER_SDK_LOG_DIR=!VER_DIR!\sdk"
        set "SCRIPT_NAME=!BUILD_SCRIPT:.bat=!"

        set "SDK_LOG_FILE=!VER_SDK_LOG_DIR!\!SCRIPT_NAME!_sdk.log"
        set "ULTRA_LOG_FILE=!VER_DIR!\!SCRIPT_NAME!.log"

        REM Create Directories
        if not exist "!VER_DIR!" mkdir "!VER_DIR!"
        if not exist "!VER_SDK_LOG_DIR!" mkdir "!VER_SDK_LOG_DIR!"

        call :LogInfo "------------------------------------------"
        call :LogInfo "Building [%%i/%TOTAL_TASKS%]: !VER!"
        call :LogInfo "Version Dir: !REL_TODAY_DIR!\!VER!"

        REM Initialize Version Logs
        (
            echo ========================================
            echo SDK Build Start for !VER!: %DATE% %TIME%
            echo ========================================
        ) > "!SDK_LOG_FILE!"

        (
            echo ========================================
            echo Ultra Build Start for !VER!: %DATE% %TIME%
            echo ========================================
        ) > "!ULTRA_LOG_FILE!"
        
        REM 1. Build SDK Lib
        if exist "!BUILD_SCRIPT!" (
            call :LogInfo "Executing !BUILD_SCRIPT! Build SDK..."
            echo. | call !BUILD_SCRIPT! >> "!SDK_LOG_FILE!" 2>&1
            if errorlevel 1 (
                call :LogError "!BUILD_SCRIPT! failed for !VER!"
                call :LogError "Check log: !REL_TODAY_DIR!\!VER!\sdk\!SCRIPT_NAME!_sdk.log"
                exit /b 1
            )
            echo [SUCCESS] SDK Build Completed. >> "!SDK_LOG_FILE!"
        ) else (
            call :LogWarn "!BUILD_SCRIPT! not found. Skipping build step."
            echo [SKIPPED] Script not found. >> "!SDK_LOG_FILE!"
        )

        REM 2. Copy libttisdk.so to Target Repo
        set "SO_SRC=%NL_SDK_REPO_PATH%\release\!SRC_SDK_PATH!\%SDK_FILE%"
        set "SO_DST=%NL_ULTRA_REPO_PATH%\!DST_SDK_PATH!\"
        
        if exist "!SO_SRC!" (
            if not exist "!SO_DST!" mkdir "!SO_DST!"
            call :LogInfo "Copying SDK lib to Target..."
            copy /Y "!SO_SRC!" "!SO_DST!" >> "!ULTRA_LOG_FILE!" 2>&1
            if errorlevel 1 (
                call :LogError "Failed to copy SDK lib for !VER!"
                exit /b 1
            )
            echo [SUCCESS] SDK Lib Copied to Target. >> "!ULTRA_LOG_FILE!"
        ) else (
            call :LogWarn "SDK lib not found at !SO_SRC!"
            echo [SKIPPED] Source file not found. >> "!ULTRA_LOG_FILE!"
        )

        REM 3. Build Target Project
        pushd "%NL_ULTRA_REPO_PATH%"
        
        if exist "clear.bat" (
            call :LogInfo "Executing clear.bat..."
            echo. | call clear.bat >> "!ULTRA_LOG_FILE!" 2>&1
            if errorlevel 1 (
                call :LogWarn "clear.bat failed, continuing..."
                echo [WARN] clear.bat failed. >> "!ULTRA_LOG_FILE!"
            ) else (
                echo [SUCCESS] clear.bat completed. >> "!ULTRA_LOG_FILE!"
            )
        )

        if exist "build_automation.bat" (
            call :LogInfo "Executing build_automation.bat !BUILD_PARAM! Build APP..."
            echo. | call build_automation.bat !BUILD_PARAM! >> "!ULTRA_LOG_FILE!" 2>&1
            if errorlevel 1 (
                call :LogError "build_automation.bat failed for !VER!"
                call :LogError "Check log: !REL_TODAY_DIR!\!VER!\!SCRIPT_NAME!.log"
                popd
                exit /b 1
            )
            echo [SUCCESS] APP Build Completed. >> "!ULTRA_LOG_FILE!"
        ) else (
            call :LogError "build_automation.bat not found in Target Repo!"
            popd
            exit /b 1
        )

        REM 4. Collect Artifacts (.NLD/.tpk)
        if exist "bin" (
            pushd bin
            set "FOUND=0"
            for /f "delims=" %%f in ('dir /b *!EXT! 2^>nul') do (
                set "FOUND=1"
                set "ARTIFACT_DEST=!VER_DIR!\"
                copy "%%f" "!ARTIFACT_DEST!" >nul 2>&1
                if errorlevel 1 (
                    call :LogWarn "Failed to copy artifact: %%f"
                    echo [ERROR] Failed to copy artifact: %%f >> "!ULTRA_LOG_FILE!"
                ) else (
                    call :LogInfo "Collected: %%f"
                    echo [SUCCESS] Collected artifact: %%f >> "!ULTRA_LOG_FILE!"
                )
            )
            if !FOUND! equ 0 (
                call :LogWarn "No !EXT! files found in bin."
                echo [WARN] No artifacts found. >> "!ULTRA_LOG_FILE!"
            )
            popd
        ) else (
            call :LogWarn "bin directory not found in Target Repo."
            echo [WARN] bin directory not found. >> "!ULTRA_LOG_FILE!"
        )

        REM 5. Backup SDK Lib to Artifact Dir (Inside Version/sdk/)
        if exist "!SO_SRC!" (
            copy /Y "!SO_SRC!" "!VER_SDK_LOG_DIR!\" >nul 2>&1
            call :LogInfo "Backed up !SDK_FILE! to !REL_TODAY_DIR!\!VER!\sdk\"
            echo [SUCCESS] Backed up SDK Lib to Version/sdk Dir. >> "!ULTRA_LOG_FILE!"
        )

        REM Finalize Version Logs
        (
            echo ========================================
            echo SDK Build End for !VER!: %DATE% %TIME%
            echo ========================================
        ) >> "!SDK_LOG_FILE!"

        (
            echo ========================================
            echo Ultra Build End for !VER!: %DATE% %TIME%
            echo ========================================
        ) >> "!ULTRA_LOG_FILE!"

        popd REM Return from Target Repo
    )
    exit /b 0

:CopyMultilangXML
    call :LogInfo "Copying multilanguage xml..."
    if exist "%NL_ULTRA_REPO_PATH%\usr\xml" (
        xcopy "%NL_ULTRA_REPO_PATH%\usr\xml" "%TODAY_DIR%\xml\" /E /I /Y >nul 2>&1
        if errorlevel 1 (
            call :LogWarn "Failed to copy multilanguage usr/xml."
        ) else (
            call :LogInfo "Multilanguage usr/xml copied successfully."
        )
    ) else (
        call :LogWarn "Multilanguage usr/xml directory not found."
    )
    exit /b 0

:: ============================================================================
:: Functions (Updated for Better Restore and SO handling)
:: ============================================================================

:CheckGitDirty
    REM %1 = Repo Name (NL_SDK/NL_Ultra)
    set "HAS_CHANGES=0"
    git status --porcelain | findstr /r /c:"^" >nul
    if errorlevel 1 (
        set "%1_HAS_CHANGES=0"
        call :LogInfo "%1 Repo is clean."
        exit /b 0
    )
    
    set "HAS_CHANGES=1"
    set "%1_HAS_CHANGES=1"
    call :LogWarn "%1 Repo has uncommitted changes. Preparing temporary commit..."
    
    REM --- Handle libttisdk.so specifically for NL_Ultra Repo ---
    if "%1"=="NL_Ultra" (
        call :LogInfo "Checking for libttisdk.so modifications in NL_Ultra..."
        git status --porcelain | findstr "libttisdk.so" >nul
        if not errorlevel 1 (
            call :LogInfo "Found modified libttisdk.so. Reverting it before temp commit..."
            for /f "tokens=2 delims= " %%F in ('git status --porcelain ^| findstr "libttisdk.so"') do (
                call :LogInfo "Reverting: %%F"
                git checkout -- "%%F" >> "%MAIN_LOG_FILE%" 2>&1
            )
            
            REM Check if workspace is NOW clean after reverting .so files
            git status --porcelain | findstr /r /c:"^" >nul
            if errorlevel 1 (
                set "%1_HAS_CHANGES=0"
                call :LogInfo "%1 Repo is now clean after reverting .so files. Skipping temporary commit."
                exit /b 0
            )
        )
    )

    REM Save current HEAD hash to restore later
    for /f "delims=" %%i in ('git rev-parse HEAD') do set "%1_OLD_HEAD=%%i"
    
    REM Add all changes and create a temporary commit
    call :LogInfo "Creating temporary commit for %1..."
    git add -A >> "%MAIN_LOG_FILE%" 2>&1
    git commit -m "TEMP: manu build automation [DO NOT PUSH]" >> "%MAIN_LOG_FILE%" 2>&1
    if errorlevel 1 (
        call :LogError "Failed to create temporary commit in %1 Repo."
        exit /b 1
    )
    call :LogInfo "Temporary commit created for %1."
    exit /b 0

:RestoreRepositories
    call :LogInfo "Restoring Repositories to pre-build state..."

    REM --- Restore NL_Ultra Repo ---
    pushd "%NL_ULTRA_REPO_PATH%"
    
    if "!NL_Ultra_HAS_CHANGES!"=="1" (
        call :LogInfo "Reverting temporary commit in NL_Ultra..."
        git reset --mixed %NL_Ultra_OLD_HEAD% >> "%MAIN_LOG_FILE%" 2>&1
    ) else (
        call :LogInfo "NL_Ultra repo had no changes to restore."
    )

    if not "!TGT_CUR_BRANCH!"=="%NL_ULTRA_BRANCH%" (
        call :LogInfo "Switching NL_Ultra back to branch: !TGT_CUR_BRANCH!..."
        git checkout !TGT_CUR_BRANCH! >> "%MAIN_LOG_FILE%" 2>&1
        if errorlevel 1 (
            call :LogWarn "Failed to switch back to original NL_Ultra branch. Manual check required."
        )
    )
    popd

    REM --- Restore NL_SDK Repo ---
    cd /d "%NL_SDK_REPO_PATH%"
    
    if "!NL_SDK_HAS_CHANGES!"=="1" (
        call :LogInfo "Reverting temporary commit in NL_SDK..."
        git reset --mixed %NL_SDK_OLD_HEAD% >> "%MAIN_LOG_FILE%" 2>&1
    ) else (
        call :LogInfo "NL_SDK repo had no changes to restore."
    )

    if not "!SRC_CUR_BRANCH!"=="%NL_SDK_BRANCH%" (
        call :LogInfo "Switching NL_SDK back to branch: !SRC_CUR_BRANCH!..."
        git checkout !SRC_CUR_BRANCH! >> "%MAIN_LOG_FILE%" 2>&1
        if errorlevel 1 (
            call :LogWarn "Failed to switch back to original NL_SDK branch. Manual check required."
        )
    )
    
    call :LogInfo "Repositories restored."
    exit /b 0

:: ============================================================================
:: Logging Helpers
:: ============================================================================
:LogInfo
    echo [%LOG_PREFIX%] [INFO] [%TIME%] %*
    echo [%LOG_PREFIX%] [INFO] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:LogWarn
    echo [%LOG_PREFIX%] [WARN] [%TIME%] %*
    echo [%LOG_PREFIX%] [WARN] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:LogError
    echo [%LOG_PREFIX%] [ERROR] [%TIME%] %*
    echo [%LOG_PREFIX%] [ERROR] [%TIME%] %* >> "%MAIN_LOG_FILE%"
    goto :eof

:: ============================================================================
:: Cleanup & Exit
:: ============================================================================
:Cleanup
    if defined ORIG_GIT_SSH_COMMAND (
        set "GIT_SSH_COMMAND=%ORIG_GIT_SSH_COMMAND%"
    ) else (
        set "GIT_SSH_COMMAND="
    )

    set "NL_ULTRA_REPO_URL="
    set "NL_SDK_REPO_URL="
    set "NL_ULTRA_REPO_PATH="
    set "NL_SDK_REPO_PATH="
    
    endlocal
    pause
    exit /b 0

:ExitWithError
    call :LogError "Build Aborted due to errors."
    echo.
    echo Check main log file for details: %MAIN_LOG_FILE%
    echo Check version-specific logs inside their respective directories.
    pause
    exit /b 1
```