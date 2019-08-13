---
layout: post
title:  Sublime Text3使用技巧
date:   2019-08-12 23:08:00 +0800
categories: 开发工具
tag: Sublime Text3
---

* content
{:toc}
Sublime Text3使用技巧及其常见问题解决办法

# 1、Package Control快速安装

通过View->Show Console菜单打开命令行

![图1]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_10-53-42-p1.jpg' | prepend: site.baseurl  }})

![图2]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_11-02-50-p2.jpg' | prepend: site.baseurl  }})

粘贴如下代码(注意下面代码为一行)：

```
import urllib.request,os; pf = 'Package Control.sublime-package'; ipp = sublime.installed_packages_path(); urllib.request.install_opener( urllib.request.build_opener( urllib.request.ProxyHandler()) ); open(os.path.join(ipp, pf), 'wb').write(urllib.request.urlopen( 'http://sublime.wbond.net/' + pf.replace(' ','%20')).read())
```

按下enter键,稍等即可, 
安装完毕后,重启sublime，此时就可以在Preferences菜单下看到`Package Settings`和`Package Control`两个菜单了。

# 2、Package Control使用

打开命令行,快捷键为：`Ctrl + Shift + p`,输入`pci`(点击Package Control:Install Packge选项),几秒钟后弹出插件管理页面,输入想要安装的插件名称,以`ctags`为例

![图3]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_11-15-14-p3.png' | prepend: site.baseurl  }})

按回车即可安装。

# 3、解决Unable to download XXX问题

Sublime Text3 安装插件报错：  
`Package Control`  
`Unable to download XXX. Please view the console for more details.`

解决方法：
Preferences > Package Settings > Package Control > Settings-User
![图4]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_11-42-53-p4.png' | prepend: site.baseurl  }})

增加如下内容：
```
"debug": true,
"downloader_precedence":
{
    "linux": [ "curl", "urllib", "wget" ],
    "osx": [ "curl", "urllib" ],
    "windows": [ "wininet" ]
},
```
调整格式后内容如下：
```
{
	"bootstrapped": true,
	"debug": true,
	"downloader_precedence":
	{
		"linux":
		[
			"curl",
			"urllib",
			"wget"
		],
		"osx":
		[
			"curl",
			"urllib"
		],
		"windows":
		[
			"wininet"
		]
	},
}
```
再次安装插件就OK了。

# 4、安装常用插件

## 4.1  Localization [汉化] 
使用：安装后，点击help->languaremove packagege->相应语言版本  
![图5]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_12-49-03-p5.png' | prepend: site.baseurl  }})

## 4.2  Doc​Blockr [生成注释]  
使用：输入`/**`,然后按Tab键,该插件就会自动解析任何功能,并准备合适的模板   
自定义注释：Preferences > Package Settings > DocBlockr > Settings-User
![图6]({{ '/styles/images/SublimeText3/Snipaste_2019-08-13_13-02-28-p6.png' | prepend: site.baseurl  }})
输入
```
{
    //自定义配置
    "jsdocs_extra_tags": [
                    "@Author liujw",
                    "@DateTime {{datetime}}",
                    "@FuncName: {{String}}",
                ],

}
```
## 4.3  AutoFileName [自动完成文件路径]  

## 4.4  CTags [函数跳转]
CTags58.zip下载链接[`https://pan.baidu.com/s/18uYw4b6uX4_DffdJShfoug`](https://pan.baidu.com/s/18uYw4b6uX4_DffdJShfoug)[提取码：`ge06`]  
参考步骤 [`https://www.jianshu.com/p/9f5801e83c6c`](https://www.jianshu.com/p/9f5801e83c6c)

 
## 4.4  AStyleFormatter [C/C++等编码风格格式器]
使用：找到需要格式化的`.c`文件,快捷键`Ctrl + ALT + F` 	

## 4.5  ConvertToUTF8  [中文乱码解决包]

# 5、卸载不常用插件
`Ctrl + Shift + p`打开命令行,输入`pcrp`(点击Package Control:Remove Packge选项),几秒钟后弹出插件管理页面,选择想要卸载的插件即可。


