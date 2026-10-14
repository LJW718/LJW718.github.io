---
layout: post
title:  C语言图书信息管理系统
date:   2021-06-27 16:00:00 +0800
categories: 编程
tags: [C, 项目]
typora-root-url: ..

---
* content
{:toc}

# C 语言图书信息管理系统

用纯 C 写了一个控制台版图书信息管理系统：支持录入、增添、修改、删除、浏览与查询，数据以二进制文件持久化。适合练结构体、文件读写和菜单驱动程序结构。

## 功能一览

| 菜单 | 功能 | 说明 |
|------|------|------|
| 1 | 录入图书 | 按数量批量录入，写入文件 |
| 2 | 增添图书 | 在已有记录后追加 |
| 3 | 修改信息 | 按书名定位，可改单项或全部 |
| 4 | 删除信息 | 按书名标记删除并回写 |
| 5 | 图书总览 | 分页浏览全部记录 |
| 6 | 图书查询 | 按书名或书号查找 |
| 7 | 退出 | 结束程序 |

启动时需输入密码（代码中为 `111`），通过后进入主菜单。

## 数据设计

书籍数量上限 `N = 20`，用结构体数组存内存中的全部记录：

```c
#define N 20

struct book
{
  char name[15];      /* 书名 */
  char publisher[15]; /* 出版商 */
  char number[15];    /* 书号 */
  char writer[15];    /* 作者 */
} book[N];
```

字段长度固定，读写文件时直接按 `sizeof(struct book)` 整块读写，实现简单，也因此书名等不宜过长。

## 程序结构

整体是典型的「登录 → 菜单循环 → 功能函数」：

```text
main()
  └─ login()          密码校验
       └─ menu()      主菜单（1~7）
            ├─ enter() / add() / correct() / del()
            ├─ list() / search()
            └─ exit
```

公共能力拆成小函数，方便复用：

- `input` / `printf_face` / `printf_one` / `printf_n`：输入与表格输出
- `load` / `save`：从文件加载、写回
- `correct_data`：修改单条记录时的子菜单

## 文件读写

数据文件名为 `file`，以二进制方式存取：

```c
/* 加载：读入结构体数组，返回有效记录数 */
int load()
{
  FILE *fp;
  int i;
  if ((fp = fopen("file", "rb")) == NULL)
  {
    printf("\nCan not open file\n");
    exit(0);
  }
  for (i = 0; !feof(fp); i++)
    fread(&book[i], sizeof(struct book), 1, fp);
  fclose(fp);
  return (i - 1);
}

/* 保存：跳过已删除（书名首字符为 '\0'）的记录 */
void save(int n)
{
  FILE *fp;
  int i;
  if ((fp = fopen("file", "wb")) == NULL)
  {
    printf("\nCan not open file\n");
    exit(0);
  }
  for (i = 0; i < n; i++)
    if (book[i].name[0] != '\0')
      fwrite(&book[i], sizeof(struct book), 1, fp);
  fclose(fp);
}
```

删除并不真正压缩数组，而是把该书名置空，保存时过滤掉，属于「逻辑删除」。

## 核心流程简述

### 录入与增添

- **录入**：询问本数 `n`，循环调用 `input(i)`，再 `save(n)`。
- **增添**：先 `load()` 得到当前数量，再在末尾追加若干条并保存。

```c
void input(int i)
{
  printf_face();
  printf("\t");
  scanf("%s\t%s\t%s\t%s",
        book[i].name, book[i].publisher,
        book[i].number, book[i].writer);
}
```

输入时用空格（或 Tab）分隔四个字段，一次读入一行记录。

### 修改与删除

两者都是：列出清单 → 按**书名**查找下标 `k` → 确认后改内存 → `save`。

修改支持改书名 / 出版商 / 书号 / 作者，或整条重录；也可取消返回。

### 查询

提供两类检索：

1. 按书名 `strcmp(s.name, book[i].name)`
2. 按书号 `strcmp(s.number, book[i].number)`

命中后打印该条记录，可继续查或回菜单。

### 浏览

`printf_n` 每 10 条暂停一次（`Press any key to continue...`），避免记录多时刷屏。

## 使用提示

1. 在可写目录下运行，以便生成数据文件 `file`。
2. 首次使用先选「录入图书」建立数据；之后用「增添」扩容。
3. 书名、书号等字段勿含空格（`scanf("%s")` 遇空格即结束）。
4. Windows 下用到了 `system("cls")`、`system("color ...")`，换环境需自行调整清屏方式。

## 可改进点

作业向实现够用，若继续打磨，可以考虑：

| 现状 | 建议 |
|------|------|
| `void main()` | 改为标准 `int main(void)` |
| `feof` 控制读循环 | 以 `fread` 返回值判断是否读完 |
| 固定长度字符串 | 注意溢出；或改用动态分配 |
| 删除留空洞 | 删除后压缩数组，或维护有效计数 |
| 密码明文写死 | 仅作演示；正式系统勿这样存 |
| 查找重名只留最后一条 | 改为列出全部匹配项 |

## 小结

这个小系统把 **结构体数组 + 二进制文件 + 菜单分发** 串成了一条完整链路：内存里改、磁盘上存、按字段查。弄懂 `load` / `save` 和按名定位这两块，后面做学生管理、通讯录一类控制台项目，骨架都差不多。

下文附完整源码。保存为 `book.c` 后编译运行即可，例如：

```bash
gcc book.c -o book
./book
```

Windows 下也可用 Dev-C++ / VS 新建控制台工程直接编译。

## 完整源码

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#define N 20 //书籍数量不超过20本
struct book  //定义书籍结构体
{
  char name[15];      //书名
  char publisher[15]; //出版商
  char number[15];    //书号
  char writer[15];    //作者
} book[N];
void printf_face() //调用printf函数
{
  printf("\n\t书名\t\t出版商\t\t书籍号\t\t作者\n"); //输出书名，出版商，书籍号，作者
}
void printf_one(int i)
{
  printf("\t%s\t\t%s\t\t%s\t\t%s\n", book[i].name, book[i].publisher, book[i].number, book[i].writer);
}
void printf_n(int n)
{
  int j;
  for (j = 0; j < n; j++)
  {
    if ((j != 0) && (j % 10 == 0))
    {
      printf("\n\nPress any key to continue...:");
      getchar();
      puts("\n\n");
    }
    printf_one(j);
  }
  getchar();
}
int load()
{
  FILE *fp; //文件指针
  int i;
  if ((fp = fopen("file", "rb")) == NULL) //只读打开一个二进制文件并判断是否成功
  {
    printf("\nCan not open file\n");
    exit(0); //错误退出
  }
  for (i = 0; !feof(fp); i++)                    //没有遇到文件结束或没有出现错误就继续for循环
    fread(&book[i], sizeof(struct book), 1, fp); //读取并显示数据
  fclose(fp);                                    //关闭该文件
  return (i - 1);
}
int correct_data(int i, int n) // 数据修改
{
  int c, w1;
  void input(int i);
  void menu();
  do
  {
    puts("\n修改选项=>\n\n  1).书名  2).出版商  3).书籍号  4).作者  5).所有数据  6).取消并返回");
    printf("请选择?: [ ]\b\b");
    scanf("%d", &c);
    if (c > 6 || c < 1)
    {
      puts("\nChoose error! Please again!");
      getchar();
    }
  } while (c > 6 || c < 1);
  do
  {
    switch (c)
    {
    case 1:
      printf("name:");
      scanf("%s", book[i].name);
      break;
    case 2:
      printf("publisher:");
      scanf("%s", book[i].publisher);
      break;
    case 3:
      printf("number:");
      scanf("%s", book[i].number);
      break;
    case 4:
      printf("writer:");
      scanf("%s", book[i].writer);
      break;
    case 5:
      input(i);
      break;
    case 6:
      menu();
    }
    puts("\nNow:\n");
    printf_face();
    printf_one(i);
    printf("\n确定?\n\n\t1).是  2).不，重新修改  3).返回不保存 [ ]\b\b");
    scanf("%d", &w1);
  } while (w1 == 2);
  return (w1);
}
void input(int i)
{
  printf_face();
  printf("\t");
  scanf("%s\t%s\t%s\t%s", book[i].name, book[i].publisher, book[i].number, book[i].writer);
}
void save(int n) //通过void save()函数来保存图书
{
  FILE *fp;
  int i;
  if ((fp = fopen("file", "wb")) == NULL) //只写打开或建立一个二进制文件并判断是否错误
  {
    printf("\nCan not open file\n");
    exit(0);
  }
  for (i = 0; i < n; i++)
    if (book[i].name[0] != '\0')
      if (fwrite(&book[i], sizeof(struct book), 1, fp) != 1) //将book[i]所指向的一段大小为N的内容写入
        printf("file write error\n");
  fclose(fp);
}
void printf_back()
{
  int w;
  void list();
  void menu();
  printf("\n\n\t成功\n\n");
  printf("What do you want to do?\n\n\t1).浏览所有\t2).返回:  [ ]\b\b");
  scanf("%d", &w);
  if (w == 1)
  {
    list();
    system("cls");
  }
  else
    menu();
}
// 打开文件-写入-关闭
void login()
{
  int n;
  system("color b");
  printf("请输入密码:");
  scanf("%d", &n);
  if (n == 111) //密码
  {
    void menu();
    system("cls");
    menu();
  }
}
void main() //主函数
{
  login();
}
void menu()
{
  int n, w1;
  void enter();
  void add();
  void correct();
  void list();
  void del();
  void search();
  do
  {
    puts("\t\t***********************菜单***********************\n ");
    puts("\t\t*******************1.录入图书*********************");
    puts("\t\t*******************2.增添图书*********************");
    puts("\t\t*******************3.修改信息*********************");
    puts("\t\t*******************4.删除信息*********************");
    puts("\t\t*******************5.图书总览*********************");
    puts("\t\t*******************6.图书查询*********************");
    puts("\t\t*******************7.退出软件*********************");
    puts("\n\n\t********************图书信息管理系统********************* ");
    printf("请选择服务种类(1-7) : [ ]\b\b");
    scanf("%d", &n);
    system("color 3");
    system("cls");
    if (n < 1 || n > 7)
    {
      w1 = 1;
      getchar();
    }
    else
      w1 = 0;
  } while (w1 == 1);
  switch (n)
  {
  case 1:
    enter();
    break;
  case 2:
    add();
    break;
  case 3:
    correct();
    break;
  case 4:
    del();
    break;
  case 5:
    list();
    break;
  case 6:
    search();
    break;
  case 7:
    exit(0);
    break;
  }
}
void enter() //录入图书信息
{
  int i, n;
  printf("How many book(0-%d)?:", N - 1);
  scanf("%d", &n);
  printf("请输入数据:\n");
  for (i = 0; i < n; i++)
  {
    printf("\n输入第 %d个记录.\n", i + 1);
    input(i);
  }
  if (i != 0)
    save(n);
  printf_back();
}
void add() //增加图书信息
{
  int i, n, k, t;
  n = load();
  printf("How many books do you want to add(0-%d)?:", N - n - 1);
  scanf("%d", &t);
  k = n + t;
  for (i = n; i < k; i++)
  {
    printf("\n输入第 %d个记录.\n", i - n + 1);
    input(i);
  }
  save(k);
  printf_back();
}
void correct() //修改图书信息
{
  struct book s;
  int i, n, k, w0 = 1, w1, w2 = 0;
  n = load();
  do
  {
    k = -1;
    printf_face();
    printf_n(n);
    do
    {
      printf("\n\nEnter name that you want to correct!\nName:");
      scanf("%s", s.name);
      for (i = 0; i < n; i++)
        if (strcmp(s.name, book[i].name) == 0)
        {
          k = i;
          s = book[i];
        } //选择排序
      if (k == -1)
        printf("\n\n没有记录请重新输入!");
    } while (k == -1);
    printf_face();
    printf_one(k);
    w1 = correct_data(k, n);
    if (w1 == 1)
    {
      printf("\n\t录入成功\n\n是否继续?\n\n\t1).是 2).保存返回\t[ ]\b\b");
      scanf("%d", &w0);
      system("cls");
      w2 = 1;
    }
    else
    {
      w0 = 0;
      if (w2 == 0)
        book[k] = s;
    }
    if ((w0 != 1) && (w2 == 1))
      save(n);
  } while (w0 == 1);
  menu();
}
void list() //浏览图书
{
  int n;
  n = load();
  printf_face();
  printf_n(n);
  printf("\t共有 %d 记录.\n", n);
  printf("\nPress any key to back...");
  getchar();
  menu();
}
void search() //查询图书
{
  int w0, k, i, n, w1, w2;
  struct book s;
  n = load();
  do
  {
    printf("请选择查找类别:  1).书名  2).书籍号   [ ]\b\b");
    scanf("%d", &w1);
    if (w1 < 1 || w1 > 2)
    {
      printf("输入错误!请重新输入!\n");
      w2 = 1;
    }
  } while (w2 == 1);
  if (w1 == 1)
  {
    do
    {
      k = -1;
      do
      {
        printf("\n\nEnter name that tou want to search!\nName:");
        scanf("%s", s.name);
        for (i = 0; i < n; i++)
          if (strcmp(s.name, book[i].name) == 0)
          {
            k = i;
            s = book[i];
          }
        if (k == -1)
          printf("\n\n没有记录请重新输入!");
      } while (k == -1);
      printf_face();
      printf_one(k);
      printf("\nWhat do you want to do?\n\t1).继续   2).返回菜单   [ ]\b\b");
      scanf("%d", &w0);
    } while (w0 == 1);
    menu();
  }
  else
  {
    do
    {
      k = -1;
      do
      {
        printf("\n\nEnter number that you want to search!\nNum:");
        scanf("%s", s.number);
        for (i = 0; i < n; i++)
          if (strcmp(s.number, book[i].number) == 0)
          {
            k = i;
            s = book[i];
          }
        if (k == -1)
          printf("\n\n没有记录请重新输入!");
      } while (k == -1);
      printf_face();
      printf_one(k);
      printf("\nWhat do you want to do?\n\t1).继续   2).返回菜单   [ ]\b\b");
      scanf("%d", &w0);
    } while (w0 == 1);
    menu();
  }
}
void del() //删除图书信息
{
  struct book s;
  int i, n, k, w0, w1;
  n = load();
  do
  {
    k = -1;
    printf_face();
    printf_n(n);
    do
    {
      printf("\n\nEnter name that you want to delete!\nName:");
      scanf("%s", s.name);
      for (i = 0; i < n; i++)
        if (strcmp(s.name, book[i].name) == 0)
        {
          k = i;
          s = book[i];
        }
      if (k == -1)
        printf("\n\n没有记录请重新输入!");
    } while (k == -1);
    printf_face();
    printf_one(k);
    printf("\n确定?\n\t1).是   2).返回  [ ]\b\b");
    scanf("%d", &w0);
    if (w0 == 1)
    {
      book[k].name[0] = '\0';
      save(n);
    }
    else
      break;
    printf("\n\t删除成功\n");
    printf("What do you want to do?\n\t1).继续   2).返回  [ ]\b\b");
    scanf("%d", &w1);
  } while (w1 == 1);
  menu();
}
```
