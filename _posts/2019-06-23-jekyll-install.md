---
layout: post
title:  "Jekyll安装步骤&目录结构"
date:   2019-06-23 18:01:01 +0800
categories: jekyll
tag: jekyll
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




[jekyll]:      http://jekyllrb.com
[jekyll-gh]:   https://github.com/jekyll/jekyll
[jekyll-help]: https://github.com/jekyll/jekyll-help
