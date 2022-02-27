# uthash简介

  由于C语言本身不存在哈希，但是当需要使用哈希表的时候自己构建哈希会异常复杂。因此，我们可以调用开源的第三方头文件，**这只是一个头文件**：uthash.h。我们需要做的就是将头文件复制到您的项目中，然后：#include "uthash.h"。由于uthash仅是头文件，因此没有可链接的库代码。

  使用uthash添加，查找和删除通常是常数时间的操作，此哈希的目标是简约高效。它大约有1000行C。它会自动内联，因为它是作为宏实现的。
  uthash还包括三个额外的头文件，主要提供链表，动态数组和字符串。utlist.h为C结构提供了链接列表宏。utarray.h使用宏实现动态数组。utstring.h实现基本的动态字符串。

# uthash的使用

## 定义结构体

  这里我们将id作为一个索引值，也就是键值，将name作为value。

```c
#include "uthash.h"
struct my_struct {
    int id;                    /* key */
    char name[10];
    UT_hash_handle hh;         /* makes this structure hashable */
};
/*声明哈希为NULL指针*/
struct my_struct *users = NULL;    /* important! initialize to NULL */
```

  注意：一定要包含UT_hash_handle hh;hh不需要初始化。它可以命名为任何名称，但是我们一般都命名为hh。

## 添加

  HASH_ADD_INT表示添加的键值为int类型
  HASH_ADD_STR表示添加的键值为字符串类型
  HASH_ADD_PTR表示添加的键值为指针类型
  HASH_ADD表示添加的键值可以是任意类型

```c
void add_user(int user_id, char *name) {
    struct my_struct *s;
    /*重复性检查，当把两个相同key值的结构体添加到哈希表中时会报错*/
    HASH_FIND_INT(users, &user_id, s);  /* id already in the hash? */
    /*只有在哈希中不存在ID的情况下，我们才创建该项目并将其添加。否则，我们只修改已经存在的结构。*/
    if (s==NULL) {
      s = (struct my_struct *)malloc(sizeof *s);
      s->id = user_id;
      HASH_ADD_INT( users, id, s );  /* id: name of key field */
    }
    strcpy(s->name, name);
}
```

  HASH_ADD_INT函数中，第一个参数users是哈希表，第二个参数id是键字段的名称。最后一个参数s是指向要添加的结构的指针。

## 查找

```c
struct my_struct *find_user(int user_id) {
    struct my_struct *s;
    HASH_FIND_INT( users, &user_id, s );  /* s: output pointer */
    return s;
}
```

  在上述代码中，第一个参数users是哈希表，**第二个参数是user_id的地址**（**一定要传递地址**）。最后s是输出变量。当可以在哈希表中找到相应键值时，s返回给定键的结构，当找不到时s返回NULL。

## 替换

  HASH_REPLACE宏等效于HASH_ADD宏，HASH_REPLACE会尝试查找和删除项目外。如果找到并删除了一个项目，它还将返回该项目的指针作为输出参数。

```c
void replace_user(HashHead *head, HashNode *newNode) {
    HashNode *oldNode = find_user(*head, newNode->id);
    if (oldNode)
        HASH_REPLACE_INT(*head, id, newNode, oldNode);
}
```

## 删除

  要从哈希表中删除结构，必须具有指向它的指针。（如果只有键，请先执行HASH_FIND以获取结构指针）。

```c
void delete_user(struct my_struct *user) {
    HASH_DEL(users, user);  /* user: pointer to deletee */
    free(user);             /* optional; it's up to you! */
}
```

  同样，这里users是哈希表，user是指向我们要从哈希中删除的结构的指针。

  删除结构只是将其从哈希表中删除，并非free 。何时释放结构的选择完全取决于自己；uthash永远不会释放您的结构

## 循环删除

  HASH_ITER是一个宏定义，程序执行时被替换为一个循环。

```c
void delete_all() {
  struct my_struct *current_user, *tmp;

  HASH_ITER(hh, users, current_user, tmp) {
    HASH_DEL(users,current_user);  /* delete; users advances to next */
    free(current_user);            /* optional- if you want to free  */
  }
}
```

## 删除哈希表所有元素

  如果您只想删除所有项目，但不释放它们或进行每个元素的清理，则可以通过一次操作更有效地做到这一点：

```c
HASH_CLEAR(hh,users);
```

  之后，列表头（此处为users）将设置为NULL。

## 计算哈希表元素个数

```c
unsigned int num_users;
num_users = HASH_COUNT(users);
printf("there are %u users\n", num_users);
```

  当users为NULL时，HASH_COUNT会返回0.

## 遍历哈希表中的所有项目

```c
void print_users() {
    struct my_struct *s;

    for(s=users; s != NULL; s=s->hh.next) {
        printf("user id %d: name %s\n", s->id, s->name);
    }
}
```

  还有一个hh.prev指针，可用于从任何已知项开始向后迭代哈希。
  由于hh.prev和hh.next字段的缘故，可以在哈希中向前和向后迭代。可以通过重复跟随这些指针来访问哈希中的所有项目，因此哈希也是**双链表**。

## 排序哈希表

```c
HASH_SORT( users, name_sort );
```

  第二个参数是指向比较函数的指针。它必须接受两个指针参数（要比较的项目），并且如果第一个项目分别在第二个项目之前，等于或之后排序，则必须返回小于零，零或大于零的int。 （这与标准C库中的strcmp或qsort使用的约定相同）。

```c
int sort_function(void *a, void *b) {
  /* compare a to b (cast a and b appropriately)
   * return (int) -1 if (a < b)
   * return (int)  0 if (a == b)
   * return (int)  1 if (a > b)
   */
}
```

  name_sort和id_sort的两个排序函数示例。

```c
int name_sort(struct my_struct *a, struct my_struct *b) {
    return strcmp(a->name,b->name);
}

int id_sort(struct my_struct *a, struct my_struct *b) {
    return (a->id - b->id);
}

void sort_by_name() {
    HASH_SORT(users, name_sort);
}

void sort_by_id() {
    HASH_SORT(users, id_sort);
}
```

## 完整代码

```c
#include <stdio.h>   /* gets */
#include <stdlib.h>  /* atoi, malloc */
#include <string.h>  /* strcpy */
#include "uthash.h"

struct my_struct {
    int id;                    /* key */
    char name[10];
    UT_hash_handle hh;         /* makes this structure hashable */
};

struct my_struct *users = NULL;

void add_user(int user_id, char *name) {
    struct my_struct *s;

    HASH_FIND_INT(users, &user_id, s);  /* id already in the hash? */
    if (s==NULL) {
      s = (struct my_struct *)malloc(sizeof *s);
      s->id = user_id;
      HASH_ADD_INT( users, id, s );  /* id: name of key field */
    }
    strcpy(s->name, name);
}

struct my_struct *find_user(int user_id) {
    struct my_struct *s;

    HASH_FIND_INT( users, &user_id, s );  /* s: output pointer */
    return s;
}

void delete_user(struct my_struct *user) {
    HASH_DEL(users, user);  /* user: pointer to deletee */
    free(user);
}

void delete_all() {
  struct my_struct *current_user, *tmp;

  HASH_ITER(hh, users, current_user, tmp) {
    HASH_DEL(users, current_user);  /* delete it (users advances to next) */
    free(current_user);             /* free it */
  }
}

void print_users() {
    struct my_struct *s;

    for(s=users; s != NULL; s=(struct my_struct*)(s->hh.next)) {
        printf("user id %d: name %s\n", s->id, s->name);
    }
}

int name_sort(struct my_struct *a, struct my_struct *b) {
    return strcmp(a->name,b->name);
}

int id_sort(struct my_struct *a, struct my_struct *b) {
    return (a->id - b->id);
}

void sort_by_name() {
    HASH_SORT(users, name_sort);
}

void sort_by_id() {
    HASH_SORT(users, id_sort);
}

int main(int argc, char *argv[]) {
    char in[10];
    int id=1, running=1;
    struct my_struct *s;
    unsigned num_users;

    while (running) {
        printf(" 1. add user\n");
        printf(" 2. add/rename user by id\n");
        printf(" 3. find user\n");
        printf(" 4. delete user\n");
        printf(" 5. delete all users\n");
        printf(" 6. sort items by name\n");
        printf(" 7. sort items by id\n");
        printf(" 8. print users\n");
        printf(" 9. count users\n");
        printf("10. quit\n");
        gets(in);
        switch(atoi(in)) {
            case 1:
                printf("name?\n");
                add_user(id++, gets(in));
                break;
            case 2:
                printf("id?\n");
                gets(in); id = atoi(in);
                printf("name?\n");
                add_user(id, gets(in));
                break;
            case 3:
                printf("id?\n");
                s = find_user(atoi(gets(in)));
                printf("user: %s\n", s ? s->name : "unknown");
                break;
            case 4:
                printf("id?\n");
                s = find_user(atoi(gets(in)));
                if (s) delete_user(s);
                else printf("id unknown\n");
                break;
            case 5:
                delete_all();
                break;
            case 6:
                sort_by_name();
                break;
            case 7:
                sort_by_id();
                break;
            case 8:
                print_users();
                break;
            case 9:
                num_users=HASH_COUNT(users);
                printf("there are %u users\n", num_users);
                break;
            case 10:
                running=0;
                break;
        }
    }

    delete_all();  /* free any structures */
    return 0;
}
```

# 键值的各种类型举例

## 整型键值

  当键值为整型时，可以使用HASH_ADD_INT和HASH_FIND_INT。（对于所有类型的键，其他操作（例如HASH_DELETE和）HASH_SORT都是相同的）。

## 字符串键值

  当键值为字符串时，具体要使用那个函数取决于结构体中的键值为字符串数组还是字符串指针。 **这一点很重要**。当结构体中的键值为字符串数组时，使用HASH_ADD_STR。键值为字符串指针时使用HASH_ADD_KEYPTR。接下来给出两个例子参考。

  当结构体中的键值为字符串数组时

```c
#include <string.h>  /* strcpy */
#include <stdlib.h>  /* malloc */
#include <stdio.h>   /* printf */
#include "uthash.h"

struct my_struct {
    char name[10];             /* key (string is WITHIN the structure) */
    int id;
    UT_hash_handle hh;         /* makes this structure hashable */
};


int main(int argc, char *argv[]) {
    const char *names[] = { "joe", "bob", "betty", NULL };
    struct my_struct *s, *tmp, *users = NULL;

    for (int i = 0; names[i]; ++i) {
        s = (struct my_struct *)malloc(sizeof *s);
        strcpy(s->name, names[i]);
        s->id = i;
        HASH_ADD_STR( users, name, s );
    }

    HASH_FIND_STR( users, "betty", s);
    if (s) printf("betty's id is %d\n", s->id);

    /* free the hash table contents */
    HASH_ITER(hh, users, s, tmp) {
      HASH_DEL(users, s);
      free(s);
    }
    return 0;
}
```

  当结构体中的键值为字符串指针时

```c
#include <string.h>  /* strcpy */
#include <stdlib.h>  /* malloc */
#include <stdio.h>   /* printf */
#include "uthash.h"

struct my_struct {
    const char *name;          /* key */
    int id;
    UT_hash_handle hh;         /* makes this structure hashable */
};


int main(int argc, char *argv[]) {
    const char *names[] = { "joe", "bob", "betty", NULL };
    struct my_struct *s, *tmp, *users = NULL;

    for (int i = 0; names[i]; ++i) {
        s = (struct my_struct *)malloc(sizeof *s);
        s->name = names[i];
        s->id = i;
        HASH_ADD_KEYPTR( hh, users, s->name, strlen(s->name), s );
    }

    HASH_FIND_STR( users, "betty", s);
    if (s) printf("betty's id is %d\n", s->id);

    /* free the hash table contents */
    HASH_ITER(hh, users, s, tmp) {
      HASH_DEL(users, s);
      free(s);
    }
    return 0;
}
```

## 指针键值

```c
#include <stdio.h>
#include <stdlib.h>
#include "uthash.h"

typedef struct {
  void *key;
  int i;
  UT_hash_handle hh;
} el_t;

el_t *hash = NULL;
char *someaddr = NULL;

int main() {
  el_t *d;
  el_t *e = (el_t *)malloc(sizeof *e);
  if (!e) return -1;
  e->key = (void*)someaddr;
  e->i = 1;
  HASH_ADD_PTR(hash,key,e);
  HASH_FIND_PTR(hash, &someaddr, d);
  if (d) printf("found\n");

  /* release memory */
  HASH_DEL(hash,e);
  free(e);
  return 0;
}
```

## 结构体键值

  在将项目添加到哈希或查找项目之前，必须将结构体键值中的元素清零。

```c
#include <stdlib.h>
#include <stdio.h>
#include "uthash.h"

typedef struct {
  char a;
  int b;
} record_key_t;

typedef struct {
    record_key_t key;
    /* ... other data ... */
    UT_hash_handle hh;
} record_t;

int main(int argc, char *argv[]) {
    record_t l, *p, *r, *tmp, *records = NULL;

    r = (record_t *)malloc(sizeof *r);
    /*结构体键值清零*/
    memset(r, 0, sizeof *r);
    r->key.a = 'a';
    r->key.b = 1;
    HASH_ADD(hh, records, key, sizeof(record_key_t), r);

    memset(&l, 0, sizeof(record_t));
    l.key.a = 'a';
    l.key.b = 1;
    HASH_FIND(hh, records, &l.key, sizeof(record_key_t), p);

    if (p) printf("found %c %d\n", p->key.a, p->key.b);

    HASH_ITER(hh, records, p, tmp) {
      HASH_DEL(records, p);
      free(p);
    }
    return 0;
}
```

# 常用宏参考

## 类型宏

```c
HASH_ADD_INT(head, keyfield_name, item_ptr)

HASH_REPLACE_INT(head, keyfiled_name, item_ptr,replaced_item_ptr)

HASH_FIND_INT(head, key_ptr, item_ptr)

HASH_ADD_STR(head, keyfield_name, item_ptr)

HASH_REPLACE_STR(head,keyfield_name, item_ptr, replaced_item_ptr)

HASH_FIND_STR(head, key_ptr, item_ptr)

HASH_ADD_PTR(head, keyfield_name, item_ptr)

HASH_REPLACE_PTR(head, keyfield_name, item_ptr, replaced_item_ptr)

HASH_FIND_PTR(head, key_ptr, item_ptr)

HASH_DEL(head, item_ptr)

HASH_SORT(head, cmp)

HASH_COUNT(head)
```

## 通用宏

```c
HASH_ADD(hh_name, head, keyfield_name, key_len, item_ptr)

HASH_ADD_BYHASHVALUE(hh_name, head, keyfield_name, key_len, hashv, item_ptr)

HASH_ADD_KEYPTR(hh_name, head, key_ptr, key_len, item_ptr)

HASH_ADD_KEYPTR_BYHASHVALUE(hh_name, head, key_ptr, key_len, hashv, item_ptr)

HASH_ADD_INORDER(hh_name, head, keyfield_name, key_len, item_ptr, cmp)

HASH_ADD_BYHASHVALUE_INORDER(hh_name, head, keyfield_name, key_len, hashv, item_ptr, cmp)

HASH_ADD_KEYPTR_INORDER(hh_name, head, key_ptr, key_len, item_ptr, cmp)

HASH_ADD_KEYPTR_BYHASHVALUE_INORDER(hh_name, head, key_ptr, key_len, hashv, item_ptr, cmp)

HASH_REPLACE(hh_name, head, keyfield_name, key_len, item_ptr, replaced_item_ptr)

HASH_REPLACE_BYHASHVALUE(hh_name, head, keyfield_name, key_len, hashv, item_ptr, replaced_item_ptr)

HASH_REPLACE_INORDER(hh_name, head, keyfield_name, key_len, item_ptr, replaced_item_ptr, cmp)

HASH_REPLACE_BYHASHVALUE_INORDER(hh_name, head, keyfield_name, key_len, hashv, item_ptr, replaced_item_ptr, cmp)

HASH_FIND(hh_name, head, key_ptr, key_len, item_ptr)

HASH_FIND_BYHASHVALUE(hh_name, head, key_ptr, key_len, hashv, item_ptr)

HASH_DELETE(hh_name, head, item_ptr)

HASH_VALUE(key_ptr, key_len, hashv)

HASH_SRT(hh_name, head, cmp)

HASH_CNT(hh_name, head)

HASH_CLEAR(hh_name, head)

HASH_SELECT(dst_hh_name, dst_head, src_hh_name, src_head, condition)

HASH_ITER(hh_name, head, item_ptr, tmp_item_ptr)

HASH_OVERHEAD(hh_name, head)
```

## 参数说明

  参数说明
  **hh_name**
  UT_hash_handle结构中字段的 名称。俗称 hh。

  **head**
  结构指针变量，用作哈希的“头”。如此命名是因为它最初指向添加到哈希中的第一项。

  **keyfield_name**
  结构中键字段的名称。（对于多字段键，这是键的第一个字段）。如果您不熟悉宏，则将字段名称作为参数传递似乎很奇怪。请参阅 注释。

  **key_len**
  键字段的长度（以字节为单位）。例如，对于整数键，它是 sizeof(int)，而对于字符串键，它是strlen(key)。（有关多字段键，请参阅此注释。）

  **key_ptr**
  对于HASH_FIND，这是指向要在哈希中查找的键的指针（由于它是指针，因此您不能在此处直接传递文字值）。对于 HASH_ADD_KEYPTR，这是要添加的项的键的地址。

  **hashv**
  提供的键的哈希值。这是..._BYHASHVALUE宏的输入参数，是 的输出参数HASH_VALUE。如果您要重复查找相同的键，则重用缓存的哈希值可以优化性能。

  **item_ptr**
  指向要添加，删除，替换或查找的结构的指针，或迭代期间的当前指针。这是一个输入参数HASH_ADD， HASH_DELETE和HASH_REPLACE宏，和用于输出参数HASH_FIND 和HASH_ITER。（当HASH_ITER用于迭代时，tmp_item_ptr 是与item_ptr内部使用的类型相同的另一个变量）。

  **replace_item_ptr**
  用于HASH_REPLACE宏。这是一个输出参数，设置为指向替换的项目（如果没有替换的项目，则设置为NULL）。

  **cmp**
  指向比较函数的指针，该函数接受两个参数（指向要比较的项目的指针），并返回一个int值，该值指定第一个项目应在第二个项目之前，等于还是之后排序（如strcmp）。

  **condition**
  接受单个参数的函数或宏（指向结构的空指针，需要将其强制转换为适当的结构类型）。如果应“选择”结构以将其添加到目标哈希中，则函数或宏的值应为非零值。

