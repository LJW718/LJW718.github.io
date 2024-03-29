---
layout: post
title:  "Markdown基础语法学习 ！"
date:   2019-02-23 19:58:01 +0800
categories: Markdown
tag: Markdown
---

* content
{:toc}

这是一篇关于Markdown语法的博客

--------------------------------------------------

## **Markdown简介及扩展**
> Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档，然后转换成格式丰富的HTML页面。    —— <a href="https://zh.wikipedia.org/wiki/Markdown" target="_blank"> [ 维基百科 ]

-------------------------------------------------

## **常用语法**
## 一、标题
在想要设置为标题的`文字前面加#`来表示, 一个#是一级标题，二个#是二级标题，以此类推。支持六级标题。
注：标准语法一般在#后跟个空格再写文字,`在内容末尾敲**2个空格**+**回车**进行换行`  
示例：
```
# 这是一级标题
## 这是二级标题
### 这是三级标题
#### 这是四级标题
##### 这是五级标题
###### 这是六级标题
```
## 二、字体
**加粗**   要加粗的文字左右分别用`2个*号`包起来  
*斜体*    要倾斜的文字左右分别用`1个*号`包起来  
***斜体加粗***  要倾斜和加粗的文字左右分别用`3个*号`包起来  
~~删除线~~    要加删除线的文字左右分别用`2个~~号`包起来  

## 三、引用
在引用的文字前加`>`即可。引用也可以嵌套，如加两个>>三个>>> n个...貌似`可以一直加下去`,
>我是一级引用
>>我是二级引用
>>
>>>>>>>>>我TM是多少级引用？算了,暂时没啥卵用


## 四、分割线
`三个或者三个以上的 - 或者 * `都可以,`---`和`*******`显示效果都一样。示例： 三个-   

---

## 五、图片
语法：
`![图片alt](图片地址 ''图片title'')`

图片alt就是显示在图片下面的文字，相当于对图片内容的解释。  
图片地址可以为网上的地址，也可以是styles/images/下图片的绝对路径  
图片title是图片的标题，当鼠标移到图片上时显示的内容。title可加可不加   
示例：  
![blockchain](https://ss0.bdstatic.com/70cFvHSh_Q1YnxGkpoWK1HF6hhy/it/
u=702257389,1274025419&fm=27&gp=0.jpg "区块链<图片来自网络>")

## 六、超链接
语法：  
`[超链接名](超链接地址 "超链接title")`  title可加可不加

示例：  
[Github官网](http://www.github.com)  
[Jekyll官网](http://jekyllrb.com)  
注：Markdown本身语法不支持链接在新页面中打开,如果想要在新页面中打开的话可以用html语言的a标签代替。
示例：`<a href="https://github.com/LJW718/LJW718.github.io" target="_blank">本项目</a>`<a href="https://github.com/LJW718/LJW718.github.io" target="_blank">本项目</a>

## 七、列表


(1)无序列表  
语法：
无序列表 在列表前加 - + * 任何一种都可以
- 列表内容  
+ 列表内容  
* 列表内容  
注意：`- + * 跟内容之间都要有一个空格`  

(2)有序列表  
语法：`数字+.+列表内容`  
1. 列表内容  
2. 列表内容  
3. 列表内容  

注意：`序号跟内容之间要有空格`  

(3)列表嵌套
`上一级和下一级之间敲三个空格`即可
- 一级无序列表内容  
   - 二级无序列表内容  
   - 二级无序列表内容  
   - 二级无序列表内容

+ 一级无序列表内容
   1. 二级有序列表内容
   2. 二级有序列表内容
   3. 二级有序列表内容

1. 一级有序列表内容
   - 二级无序列表内容
   - 二级无序列表内容
   - 二级无序列表内容

2. 一级有序列表内容
   1. 二级有序列表内容
   2. 二级有序列表内容
   3. 二级有序列表内容

**Markdown　Extra**　定义列表语法：
项目３
:   定义 1
> 定义1内容

## 八、表格
语法：  
表头|表头|表头  
---|:--:|---:  
内容|内容|内容  
内容|内容|内容  

`第二行分割表头和内容`。`-` 有一个就行，为了对齐，多加了几个,文字默认居左  
`------两边`加`：`表示文字`居中`  
`------右边`加`：`表示文字`居右`  
注：原生的语法两边都要用 | 包起来。  

示例1:

|姓名|技能|排行|
|---|--|--|
|刘备|哭|大哥|
|关羽|打|二哥|
|张飞|骂|三弟|

示例2： 

| 项目      |    价格 | 数量  |
| :-----    | --------:| :--: |
| Computer  | 1600 元 |  5   |
| Phone     |   12 元 |  12  |
| Pipe      |    1 元 | 234  |


## 九、代码块
语法：  
单行代码：代码之间分别用`1个反引号包起来`   
代码块：代码之间分别用`3个反引号包起来，且两边的反引号单独占一行`

```
  代码...  
  代码...  
  代码... 
```


示例：
单行代码
`create database hero;`  

代码块  
```
    function func(){
         echo "Hello World !";
    }
    fun();
```

## 十、流程图
```flow
st=>start: 开始
op=>operation: My Operation
cond=>condition: Yes or No?
e=>end
st->op->cond
cond(yes)->e
cond(no)->op
&
```




<!--
### 十一、脚注
生成一个脚注[^footnote]    
[^footnote]: 这里是 **脚注** 的 *内容*.  

### 目录
用 `[TOC]`来生成目录：

[TOC]

### 数学公式
### UML 图:

-->

## **浏览器兼容**

 1. 目前，本编辑器对Chrome浏览器支持最为完整。建议大家使用较新版本的Chrome。
 2. IE９以下不支持
 3. IE９，10,11存在以下问题：
    - 不支持离线功能
    + IE9不支持文件导入导出
    * IE10不支持拖拽文件导入

---------

整理自简书  ：https://www.jianshu.com/p/191d1e21f7ed