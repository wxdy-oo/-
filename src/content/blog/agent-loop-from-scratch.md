---
title: '从零实现一个带工具调用的 Agent Loop'
description: '不用框架，手写一个能思考、会调工具的 Agent 主循环'
date: '2025.11.02'
tags: ['Agent', 'Python']
cover: '/images/covers/agent-loop.jpg'
views: 88
words: 5200
---

为了搞清楚 Agent 框架背后到底在做什么，我不用任何框架，纯手写了一个带工具调用的 Agent Loop。代码不到 200 行，但该有的都有了。

## 核心抽象

一个 Agent 主循环其实就三件事：

```python
while not done:
    response = llm(messages, tools=tool_schemas)
    if response.has_tool_calls:
        for call in response.tool_calls:
            result = dispatch(call)
            messages.append(tool_message(call.id, result))
    else:
        done = True
        answer = response.text
```

模型每轮要么输出最终答案，要么请求调用工具；调用结果作为新消息喂回去，进入下一轮。**就这么简单**——框架的价值在细节，而不在主循环。

## 工具的定义与分发

每个工具用 JSON Schema 描述：

```python
TOOLS = {
    "search_wiki": {
        "description": "搜索维基百科，返回摘要",
        "parameters": {
            "query": {"type": "string", "description": "搜索关键词"}
        },
        "fn": search_wiki,
    },
    "calculator": {
        "description": "计算数学表达式",
        "parameters": {
            "expr": {"type": "string", "description": "如 3*(4+5)"}
        },
        "fn": lambda expr: str(eval(expr, {"__builtins__": {}})),
    },
}
```

分发就是按名字查表调用，把异常也包成字符串返回——**让模型自己看到报错并重试**，比在代码里硬处理容错效果好得多。

## 踩过的坑

### 1. 死循环

模型偶尔会在两个工具之间来回横跳。加了一个简单的防御：连续 3 次调用同一工具且参数相似时，往消息里插一条系统提示"请总结已知信息并作答"。

### 2. 上下文膨胀

搜索结果动辄几千 token。解决办法：每个工具的返回结果先截断到 800 字符，长文档让模型分次查询。

### 3. 工具描述的质量决定一切

同样的工具，描述从"搜索"改成"当需要查询事实性知识时使用，输入应为具体名词而非整句"之后，调用准确率明显提升。**工具描述是写给人看的，更是写给模型看的**。

## 收获

手写一遍之后再看 LangChain、AutoGen 这些框架，很多设计就了然了：状态机、检查点、人机回环，都是在朴素 Loop 上长出来的。建议每个做 Agent 的人都至少手写一次——**框架会过时，主循环不会**。

完整代码放在 GitHub 上了，欢迎交流。
