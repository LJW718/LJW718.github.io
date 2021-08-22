---
layout: post
title:  如何使用当前Jekyll模版
date:   2019-02-22 01:08:00 +0800
categories: Document
tag: 教程
---

* content
{:toc}


致谢							{#Thanks}
====================================

+ 感谢[Github](https://github.com/)提供的代码维护和发布平台
+ 感谢[Jekyll](https://jekyllrb.com/)团队做出如此优秀的产品
+ 感谢该开源项目的发起者


使用							{#How-to-use}
====================================

下载							{#Download}
------------------------------------

```bash
git clone https://github.com/LJW718/LJW718.github.io
```

配置							{#Configuration}
------------------------------------

将当前项目下的所有文件Copy至你自己的`***.github.io`仓库，  
该项目需要配置的只有一个文件`_config.yml`，打开之后按照如下进行配置。

> 特别注意`baseurl`的配置。如果是`***.github.io`项目，不修改为空`''`的话，会导致JS,CSS等静态资源无法找到的错误

```bash
name: 博客名称
email: 邮箱地址
author: 作者名
url: 个人网站
### baseurl修改为项目名，如果项目是'***.github.io'，则设置为空''
baseurl: ''
resume_site: 个人简历网站
github: github地址
github_username: github用户名称

```

如何写文章							{#How-to-write-document}
------------------------------------

在`_posts`目录下新建一个文件，可以创建文件夹并在文件夹中添加文件，方便维护。在新建文件中粘贴如下信息，并修改以下的`titile`,`date`,`categories`,`tag`的相关信息，添加`* content {:toc}`为目录相关信息，在进行正文书写前需要在目录和正文之间输入至少2行空行。然后按照正常的Markdown语法书写正文。

```bash
---
layout: post
#标题配置
title:  标题 
#时间配置
date:   2019-02-22 01:08:00 +0800
#大类配置
categories: document
#小类配置
tag: 教程
---

* content
{:toc}


文章相关信息
```

执行							{#execute}
------------------------------------

```
Windows系统：Ctrl+r 输入cmd,回车，cd命令进入到该项目
jekyll server
```

效果							{#result}
------------------------------------
打开浏览器并输入URL`http://localhost:4000/`,回车。


关于作者						{#about-author}
====================================

热爱编程，擅长Linux，精通C,喜欢探索新领域的程序猿。
