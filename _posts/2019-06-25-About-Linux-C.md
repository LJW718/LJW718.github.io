---
layout: post
title:  "C语言中部分函数用法"
date:   2019-06-25 22:58:01 +0800

categories: Linux
tag: C函数
---


* content
{:toc}
本篇博客是介绍C语言中一些常用、易用错的函数的使用方法,每个函数使用都以实例展示,并且都是在项目中实际用到过,持续更新...

# Linux下常用难记函数

## 1、GB2312与UTF-8互转
```
#include <iconv.h>
int code_convert(char *from_charset,char *to_charset,char *inbuf,int inlen,char *outbuf,int outlen)
{
​	iconv_t cd = NULL;
​	//int rc;
​	char **pin = &inbuf;
​	char **pout = &outbuf;
​	cd = iconv_open(to_charset,from_charset);
​	if(cd == (void *)-1)
​	{
​		return FAIL;
​	}
​	size_t n = iconv(cd,pin,&inlen,pout,&outlen);  //iconv返回转换期间不可转换字符的数量
​	if(n < 0)
​	{
​		return FAIL;
​	}
​	iconv_close(cd);
	return SUC;
}

//UNICODE码转为GB2312码
int u2g(char *inbuf,int inlen,char *outbuf,int outlen)
{
​	return code_convert("utf-8","gb2312",inbuf,inlen,outbuf,outlen);
}

//GB2312码转为UNICODE码
int g2u(char *inbuf,size_t inlen,char *outbuf,size_t outlen)
{
	return code_convert("gb2312","utf-8",inbuf,inlen,outbuf,outlen);
}
```

## 2、strtok()函数
```
#include<stdio.h>
#include<string.h>
int main(void)
{
​    char buf[]="hello@boy@this@is@heima";
​    char*temp = strtok(buf,"@");
​    while(temp)
​    {
​        printf("%s ",temp);
​        temp = strtok(NULL,"@");
​    }
​    return 0;
}
```