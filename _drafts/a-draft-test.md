---
layout: post
title:  Sublime Text3常用设置
date:   2019-08-12 23:08:00 +0800
categories: 开发工具
tag: Sublime Text3
---

* content
{:toc}

# 1、快速安装Package Control及使用

通过View->Show Console菜单打开命令行，粘贴如下代码(注意下面代码为一行)：

```
import urllib.request,os; pf = 'Package Control.sublime-package'; ipp = sublime.installed_packages_path(); urllib.request.install_opener( urllib.request.build_opener( urllib.request.ProxyHandler()) ); open(os.path.join(ipp, pf), 'wb').write(urllib.request.urlopen( 'http://sublime.wbond.net/' + pf.replace(' ','%20')).read())
```


按下enter键,稍等即可, 
安装完毕后,重启sublime，此时就可以在Preferences菜单下看到Package Settings和Package Control两个菜单了。


\# 图片
![诫子书]({{ '/styles/images/jiezishu.jpg' | prepend: site.baseurl  }})

\#文章相关信息
文章相关信息


