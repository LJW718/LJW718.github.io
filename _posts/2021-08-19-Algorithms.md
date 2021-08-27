---
layout: post
title:  LeetCode刷题常用算法思路与框架

date:   2021-08-19 22:08:00 +0800
categories: LeetCode
tag: 常用算法思路与框架
typora-root-url: ..
---
* content
{:toc}


总结[LeetCode](https://leetcode-cn.com/problemset/all/)刷题过程中常用的算法，以及整理部分算法思路框架，并且以伪代码实现 

## 1、二分查找
算法思路：从中间开始找，中间值等于目标值，返回true，中间值小于目标值，则从中间值右边开始查找，否则， 从中间值左边开始查找，直到找到目标返回，否则返回false。

```
nums = [1,2,3,4,5,6,...,n], size = n, target = x
int left = 0;
int right = n - 1;
int mid = 0;
while (left <= right) {
	mid = left + (right - left)/2
	if (nums[mid] == target) {
		return true;
	} else if(nums[mid] < target) {
		left = mid + 1;
	} else {
		right = mid
	}
}
return false
```
## 2、双指针
算法思路：涉及一维数组，大部分是双指针一个在左，一个在右，多维数组，都从左边开始，满足条件的指针先动。

LeetCode第11题：  [盛最多水的容器](https://leetcode-cn.com/problems/container-with-most-water/)

```
nums = [1,7,3,5,5,6,7,8.6,2]   size = n, target = x

int left = 0;
int right = size - 1;
int x = 1;
int min = 0;
int max = 0;
while (left < right) {
	min = MIN(nums[left], nums[right]);
	max = MAX(max, min * (right, - left));
	if (nums[left] < nums[right]) {
		++left;
	}
	++right;
}
return max;
```

## 3、滑动窗口

算法思路：定义两个索引left和right, 开始都指向窗口起始位置，先移动right,改变窗口大小，此时检查窗口内部的数据是否满足待测条件， 不满足窗口继续向右移动， 若满足；计算窗口内部的数据，left右移。

LeetCode第209题：[长度最小的子数组](https://leetcode-cn.com/problems/minimum-size-subarray-sum/)

```
nums = [1,2,3,4,5,6,7,8...,n]   size = n, target = x
int left = 0;
int right = 0;
int x = 1;
while (right < size) {
	x *= nums[right];
	while (x >= targht) {
		// 省略处理过程
		++left;
	}
	++right;
}
```

## 4、深度优先搜索（DFS）

算法思路：从起始节点开始搜索，到下一个节点，判断其是否满足退出条件（搜索到末尾了）。如果到达末尾，此时进行数据相关处理，否则，一直搜索下去。

LeetCode第797题：[所有可能的路径](https://leetcode-cn.com/problems/all-paths-from-source-to-target/)
LeetCode第200题：[岛屿数量](https://leetcode-cn.com/problems/number-of-islands/)
LeetCode第797题：[省份数量](https://leetcode-cn.com/problems/number-of-provinces/)

```
// 第797题：省份数量：
void DFS(int **isConnected, int *visted, int provence, int i) {
    for (int j = 0; j < provence; j++) {
        if (isConnected[i][j] == 1 && visted[j] == 0) {
            visted[j] = 1;
            DFS(isConnected, visted, provence, j);
        }
    }
    return;
}

int findCircleNum(int** isConnected, int isConnectedSize, int* isConnectedColSize){
    int provence = isConnectedSize;
    int *visted = (int *)malloc(sizeof(int) * provence);
    memset(visted, 0, sizeof(int) * provence);

    int cnt = 0;
    for (int i = 0; i < provence; i++) {
        if (visted[i] != 1) {
            DFS(isConnected, visted, provence, i);
            cnt++;
        }
    }
    return cnt;
}
```



