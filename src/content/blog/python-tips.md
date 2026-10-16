---
title: 'Python 里那些让我少写很多代码的小技巧'
description: '日常高频使用的 Python 技巧合集'
date: '2024.10.16'
tags: ['Python', '效率']
cover: '/images/covers/python-tips.jpg'
views: 118
words: 2600
---

整理一下这几年真正高频使用的 Python 技巧。不是花活，每一条都是每周会用到好几次的那种。

## 集合与字典操作

### defaultdict：告别 if key in dict

```python
from collections import defaultdict

tag_count = defaultdict(int)
for post in posts:
    for tag in post.tags:
        tag_count[tag] += 1
```

### 字典合并与解包

```python
config = {**default_config, **user_config}  # 后者覆盖前者
def greet(name, greeting="你好"):
    ...
params = {"name": "无需多言", "greeting": "嗨"}
greet(**params)
```

## 迭代器三剑客

```python
from itertools import groupby, chain, islice

# 按年份分组（需先排序）
for year, group in groupby(sorted(posts, key=key_fn), key=key_fn):
    print(year, list(group))

# 拍平嵌套列表
flat = list(chain.from_iterable(nested))

# 只取前 100 条，不加载全部
first_100 = list(islice(stream, 100))
```

## 路径与文件

`pathlib` 全面优于 `os.path`，没有之一：

```python
from pathlib import Path

root = Path("content/blog")
for md in root.rglob("*.md"):
    text = md.read_text(encoding="utf-8")
    print(md.stem, len(text))
```

## 函数式小招

```python
# sorted 的 key 可以叠加
posts.sort(key=lambda p: (p.year, -p.views))

# any / all 替代显式循环
if any(p.draft for p in posts):
    ...

# 条件表达式
level = "高产" if count > 10 else "低产"
```

## 调试与性能

```python
# f-string 调试（3.8+）
print(f"{user.name=} {len(posts)=}")

# 简单计时
from time import perf_counter
t0 = perf_counter()
...
print(f"耗时 {perf_counter() - t0:.3f}s")

# 缓存
from functools import lru_cache

@lru_cache(maxsize=None)
def expensive(n):
    ...
```

## 类型提示值得写

不是工程洁癖，是**IDE 补全和重构的前提**：

```python
def top_tags(posts: list[Post], k: int = 5) -> list[tuple[str, int]]:
    ...
```

写了类型之后，`mypy` 能在运行前抓到一大半低级错误。

## 最后

Python 的魅力在于**少即是多**：标准库已经覆盖了 80% 的日常需求，写代码之前先搜一下"这件事标准库有没有做"，长期能省下惊人的时间。
