# loop-template

支持`each`指令(可嵌套)和插值替换的简易模板

使用: 

详情可参考`tests`中用例
```javascript
new Template(templateStr).render(context)
```

语法：
- `{{expression}}` 插值替换
- `{{each [name] in [data]}} ... {{/each}}` 循环

