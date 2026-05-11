---
layout: post
title:  Powershell完美支持Git
date:   2025-03-30 12:08:00 +0800
categories: Git
typora-root-url: ..

---
* content
{:toc}

## 1、安装posh-git

> Install-Module posh-git -Scope CurrentUser -Force

要在你的提示符中包含 Git 信息，那么需要导入 posh-git 模块。

> Import-Module posh-git

要让 PowerShell 在每次启动时都导入 posh-git，请执行 Add-PoshGitToProfile 命令，它会在你的 $profile 脚本中添加导入语句。 此脚本会在每次打开新的 PowerShell 终端时执行。 注意，存在多个 $profile 脚本。 例如，其中一个是控制台的，另一个则属于 ISE。

> Add-PoshGitToProfile -AllHosts

## 2、安装oh-my-posh（需要科学上网

> winget install JanDeDobbeleer.OhMyPosh -s winget

## 3、安装文件图标库

> Install-Module -Name Terminal-Icons -Repository PSGallery

PS：文件图标库能否正常使用，必须依赖于Nerd Fonts字体。

使用文件图标库，需要在PowerShell配置文件中，增加如下命令：
> Import-Module -Name Terminal-Icons

## 4、安装Meslo字体(推荐)

推荐使用MesloLGM NF字体，[点此即可直接下载Meslo字体(v2.3.3)](https://github.com/ryanoasis/nerd-fonts/releases/download/v2.3.3/Meslo.zip)。
下载完成后解压，全选右键点击安装即可自动安装。

## 5、安装PSReadLine

Install-Module -Name PSReadLine -Scope CurrentUser -Force -SkipPublisherCheck

## 6、创建userProfile.ps1

Powershell窗口输入命令：notepad.exe $PROFILE
复制以下文本到xxx_Profile.ps1文件

```text
# set PowerShell to UTF-8
[console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding

#Import-Module posh-git
#Import-Module oh-my-posh
#Set-PoshPrompt Paradox
$omp_config = Join-Path $PSScriptRoot ".\takuya.omp.json"
oh-my-posh --init --shell pwsh --config $omp_config | Invoke-Expression

Import-Module -Name Terminal-Icons

# PSReadLine
Set-PSReadLineOption -EditMode Emacs
Set-PSReadLineOption -BellStyle None
Set-PSReadLineKeyHandler -Chord 'Ctrl+d' -Function DeleteChar
Set-PSReadLineOption -PredictionSource History
# 启用自动补全的快捷键（例如，在输入命令时按Tab键）
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete

# Fzf
# Import-Module PSFzf -Cmdlet fzf
# Set-PsFzfOption -PSReadlineChordReverseHistory 'Ctrl+r'

# Env
#$env:GIT_SSH = "C:\Windows\system32\OpenSSH\ssh.exe"

# Alias
Set-Alias -Name vim -Value nvim
Set-Alias ll ls
# Set-Alias g git
# Set-Alias grep findstr
# Set-Alias tig 'C:\Program Files\Git\usr\bin\tig.exe'
# Set-Alias less 'C:\Program Files\Git\usr\bin\less.exe'

# Utilities
function which ($command) {
  Get-Command -Name $command -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue
}
```

## 7、最终效果图如下

![powershell]({{ '/styles/images/Git/powershell.png' | prepend: site.baseurl  }})

参考：

https://blog.csdn.net/weixin_44155966/article/details/142624257

https://blog.csdn.net/ZHOU_YONG915/article/details/129733931

## 8、FAQ

### 更新oh-my-posh

oh-my-posh --version, 显示当前安装的Oh My Posh版本号

oh-my-posh upgrade --force, 将Oh My Posh自身强制更新到最新版本

### .ps1文件不生效

```text
验证语法：使用 oh-my-posh init pwsh，而非 --init --shell pwsh。
检查路径：确保xxxx.omp.json 文件确实存在于 `$PSScriptRoot` 所指示的目录下。
检查引号：确保整个路径被双引号 " 包围。
检查配置文件：运行 Get-Content $PROFILE 命令，可以快速查看你的配置文件中是否还存在旧的命令。
查看$PSScriptRoot路径： pwsh > $env:PSScriptRoot
如果上述路径不生效，请使用$env:POSH_THEMES_PATH，同时将xxxx.omp.json文件手动拷贝到此目录下，重启终端生效。
```

### git分支不完整

```text
修改xxxx.omp.json文件的"branch_template": "{{ trunc 50 .Branch }}",参数，50表示字符长度，按需修改。
```
