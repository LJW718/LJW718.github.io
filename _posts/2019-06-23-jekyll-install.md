---
layout: post
title:  "Jekyll安装步骤&目录结构"
date:   2019-06-23 18:01:01 +0800
categories: jekyll
tag: jekyll
typora-root-url: ..
---

* content
{:toc}

## 一、背景

由于最近换了新电脑，之前的Jekyll环境用不了了，但是之前创建的仓库[https://LJW718.github.io](http://ljw718.github.io) 依然是可以访问的，所以需要在新电脑上重新安装。

## 二、什么是jekyll？

首先解释下什么是jekyll，jekyll相当于一个编译工具，安装好jekyll后，你可以通过jekyll创建一个网站模板，创建好之后，我们就可以通过http://127.0.0.1:4000/ 访问刚刚创建的网站了（具体jekyll用法后面再介绍），我们可以实时修改刚刚创建的模板里面的内容，并可以实时通过本地url预览改动后的效果。我们把这个博客推送到上一步创建的代码仓库里，再通过https://ljw718.github.io/ 就可以访问到博客里面的内容了。有了Jekyll，我们不用每次改动一点点就把代码推送到仓库中进行预览，而是本地就可以预览。GitHub支持jekyll，hexo等语法解析。
那么如何安装jekyll呢？我这边暂只讲解windows下的安装步骤。

## 三、jekyll安装

首先进入官网点击下载安装[Ruby installer](https://rubyinstaller.org/);  或者用阿里云盘下载：[Ruby2.6.1.1](https://www.aliyundrive.com/s/C6ULdQDbome)
点击下载[RubyGems](https://rubygems.org/pages/download), 或者用阿里云盘下载：[[RubyGems3.0.2]](https://www.aliyundrive.com/s/KkiH9ftS3ZY) , 不建议下载最新的版本，可能存在兼容性问题， 用我的这两个链接下载即可，亲测有效。下载完成后解压至你想放的位置,

例如我放到E:\rubygems-3.0.2。

### 1、(win+R)DOS安装

打开命令行执行,进入到解压包的位置：cd E:\rubygems-3.0.2
E:  
ruby setup.rb  
在命令行执行gem install jekyll；  
安装完成，我们可以用jekyll命令创建一个博客模板,打开命令行执行：
cd d:
d:
jekyll new testblog  
cd testblog  
jekyll server  

### 2、Shell命令安装

熟悉Linux的朋友应该不陌生，我们先安装一个可以在windows下敲shell命令的工具，我们拿Git-bash为例(Git命令行输入工具),兼容部分shell命令,然后在git-bash终端完成jekyll安装以及启动。  
打开命令行执行,进入到解压包的位置：cd E:\rubygems-3.0.2
ruby setup.rb  
在命令行执行gem install jekyll；  
安装完成，我们可以用jekyll命令创建一个博客模板,打开命令行执行：
cd d:
jekyll new testblog  
cd testblog  
jekyll server  
操作和DOS命令基本一致，个人习惯使用Linux命令。

在浏览器输入http://127.0.0.1:4000/ 即可浏览刚刚创建的blog  
到此jekyll 就安装完成了。  


## 四、jekyll目录结构

jekyll目录结构主要包含如下目录：  
_posts 博客内容  
_pages 其他需要生成的网页，如About页  
_layouts 网页排版模板  
_includes 被模板包含的HTML片段，可在_config.yml中修改位置  
assets 辅助资源 css布局 js脚本 图片等  
_data 动态数据  
_sites 最终生成的静态网页  
_config.yml 网站的一些配置信息  
index.html 网站的入口  

## 五、jekyll安装常见问题

### Gem 证书错误

![p1](/styles/images/Other/图片 2.png)

1.先查看证书默认位置,系统,安装不一样可能导致证书查找位置不同

`ruby -e "require 'openssl'; puts OpenSSL::X509::DEFAULT_CERT_FILE"`

![p2](/styles/images/Other/图片 4.png)

比如检查出地址是 D:/Ruby30-x64/ssl/cert.pem , 备份一下cert_bak.pem

![p3](/styles/images/Other/图片 6.png)

`curl -o  D:\Ruby30-x64\ssl\aaa.pem  https://curl.haxx.se/ca/cacert.pem`

![p4](/styles/images/Other/图片 11.png)

一次不行， 多试几次。

![p5](/styles/images/Other/图片 8.png)

点击aaa中的html链接， 下载证书

![p6](/styles/images/Other/图片 7.png)

将证书名字改成cert.pem,证书配置完成

`gem source -a https://rubygems.org/`  （修改Ruby的gem源，默认的源， 之前删除了）

安装jekyll:    `gem install jekyll`

![p7](/styles/images/Other/图片 9.png)

![p8](/styles/images/Other/图片 5.png)

### Dependency Error

```text
Dependency Error: Yikes! It looks like you don't have jekyll-paginate or one of its dependencies installed. In order to use Jekyll as currently configured, you'll need to install this gem. If you've run Jekyll with `bundle exec`, ensure that you have included the jekyll-paginate gem in your Gemfile as well. The full error message from Ruby is: 'cannot load such file -- jekyll-paginate' If you run into trouble, you can find helpful resources at https://jekyllrb.com/help/!

------------------------------------------------
      Jekyll 4.4.1   Please append `--trace` to the `serve` command
      for any additional information or backtrace.
------------------------------------------------
```

解决方案：gem install jekyll-paginate

### Liquid Warning: Liquid syntax error

Liquid Warning: Liquid syntax error (line 117): [:dot, "."] is not a valid expression in 
{% raw %}"{{ .Branch | truncate 50 }}"{% endraw %} in D:/WorkSpace/Alvin/private/LJW718.github.io/_posts/2025-03-30-PowershellSupportGit.md

```text
看到你遇到的错误了，问题出现在 {% raw %} "branch_template": "{{ .Branch | truncate 50 }}" {% endraw %}这段代码上。这是因为你的博客文章文件（.md）在构建时，Jekyll 引擎会优先解析其中的所有 {% raw %}{{ }} {% endraw %}标签。但它无法识别 Oh My Posh 的语法，所以当它碰到这个标签时就报错了。
```

处理起来很简单，但需要根据你写文章的目的（分享代码还是记录教程文件），分两种情况来解决。

```text
情况一：只需在博客文章里分享这段代码

如果只是想在文章里展示这个配置，而不需要 Jekyll 执行它，用 raw 标签把代码包起来就可以了。
把你教程 xxxx.omp.json 文件中的那一行，在文章里写成下面这样：
```
&#123;% raw %&#125;"branch_template": "&#123;&#123; .Branch | truncate 50 &#125;&#125;"&#123;% endraw %&#125;

```text
原理：raw 标签会告诉 Jekyll “这是一段原始文本，里面的内容请不要解析”，从而确保了 {% raw %}{{ .Branch | truncate 50 }}{% endraw %}能无损地出现在最终的网页上。
```

```text
情况二：需要在自己的 takuya.omp.json 文件里使用

如果是为了修正 takuya.omp.json 配置文件本身，问题就出在 truncate 过滤器上。根据 Oh My Posh 模板引擎的语法，正确的写法应该是：{% raw %}"branch_template": "{{ .Branch | truncate 50 }}"{% endraw %}
原理：你的 Oh My Posh 版本，其支持的 Sprig 函数库提供了 trunc 函数来实现字符串截取
```

[jekyll]:      http://jekyllrb.com
[jekyll-gh]:   https://github.com/jekyll/jekyll
[jekyll-help]: https://github.com/jekyll/jekyll-help
