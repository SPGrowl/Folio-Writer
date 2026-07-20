<script setup lang="ts">
import { ref } from 'vue'
import MarkdownEditor from '@/components/custom/MarkdownEditor/index.vue'

const content = ref(`# 标题
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
--- + 回车   或     *** + 回车
**加粗**      
_斜体_   
~~删除线~~  
>引用
>>第二层引用
>>>第三层引用
+ 列表
+ 1
+ 2
  - 2.1
  - 2.2
+ 3

链接 <http://www.baidu.com>（暂不支持）
具名链接 [百度一下](http: // www.baidu.com)（暂不支持）

待办（暂不支持）
- [ ] 人生四大喜
- [ ] 久旱逢甘露
- [ ] 他乡遇故知
- [ ] 洞房花烛夜
- [ ] 金榜题名时

表格（暂不支持）
| 姓名 | 年龄 | 性别 |
| ---- | ---- | ---- |
| 张三 | 20 | 男 |
| 李四 | 21 | 女 |
| 王五 | 22 | 男 |
`)
</script>

<template>
  <div class="flex h-full w-full flex-col p-4">
    <MarkdownEditor v-model="content" class="min-h-0 flex-1" />
  </div>
</template>
