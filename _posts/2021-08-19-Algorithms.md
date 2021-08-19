---
layout: post
title:  LeetCode刷题常用算法思路与框架

date:   2021-08 22:08:00 +0800
categories: 教程
tag: 常用算法思路与框架
typora-root-url: ..
---
* content
{:toc}


总结LeetCode刷题过程中常用的算法，以及整理部分算法思路框架，并且以伪代码实现 

## 1、二分查找
算法思路：从中间开始找，中间值等于目标值，返回true，中间值小于目标值，则从中间值右边开始查找，否则， 从中间值左边开始查找，直到找到目标返回，否则返回false。

```
nums[1,2,3,4,5,6,...,n], size = n, target = x
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
待补充
## 3、滑动窗口
待补充