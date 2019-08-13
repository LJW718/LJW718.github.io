---
layout: post
title:  GDB分析进程占用CPU过高

date:   2019-08-13 22:08:00 +0800
categories: Linux
tag: GDB调试
---

* content
{:toc}
重点是查看进程的线程中，哪个线程占用cpu过高，然后用gdb附加到进程，调试线程，看是否有死循环或者死锁等问题。
调试步骤参考如下：    

## 1、查看CPU与进程ID
先用`top`查看CPU使用情况，再用`ps + grep`找出该死的进程pid，比如 36625 

![p1]({{ '/styles/images/Linux/gdb-pthread/1.png' | prepend: site.baseurl  }})

## 2、查看线程pid占用CPU情况
`top -H -p 36625`，(top然后shift+H可以看出某个线程，左上角有提示：thread on 则为可查看线程)所有该进程的线程都列出来， 看看哪个线程pid占用cpu最多，记下对应的线程号，如：36643
![p2]({{ '/styles/images/Linux/gdb-pthread/2.png' | prepend: site.baseurl  }})

## 3、attach到相关进程
`gdb attach` 到进程号码（36625）
![p3]({{ '/styles/images/Linux/gdb-pthread/3.png' | prepend: site.baseurl  }})

## 4、查看线程信息
（仍然在gdb中） `info threads` 结果大致如下：
![p4]({{ '/styles/images/Linux/gdb-pthread/4.png' | prepend: site.baseurl  }})

## 5、查看线程号对应的线程ID
找到线程号码对应的thread（LWP 36643）即是我们刚刚记下的线程号
![p5]({{ '/styles/images/Linux/gdb-pthread/5.png' | prepend: site.baseurl  }})

## 6、根据线程ID切换线程
（仍然在gdb中）`thread  线程号码切换到线程（2）`–这里在info threads显示出来的序号需要使用gdb能识别的线程序号，即执行：thread 2 切换到我们刚刚记下的线程号：36643的对应线程，如下：
![p6]({{ '/styles/images/Linux/gdb-pthread/6.png' | prepend: site.baseurl  }})

## 7、查看函数调用栈
（仍然在gdb中）`bt` 查看线程调用堆栈 
![p7]({{ '/styles/images/Linux/gdb-pthread/7.png' | prepend: site.baseurl  }})

## 8、根据调用函数分析源代码
从上面输出的信息，基本上可以查看线程对应的代码断，是否有死循环等，如果是死锁的话，需要多次查看当前线程堆栈，或者查看全部线程的堆栈，总是会有某些个线程跟其他线程不一致，然后再对应到代码来进行定位解决
![p8]({{ '/styles/images/Linux/gdb-pthread/8.png' | prepend: site.baseurl  }})

代码中此处陷入死循环。
