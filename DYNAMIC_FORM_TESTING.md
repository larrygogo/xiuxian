# 动态表单配置功能测试指南

## 功能概述

登录和注册表单现在支持从服务器端动态获取配置，包括：
- 字段定义（类型、标签、占位符、图标）
- 验证规则（必填、最小/最大长度、正则表达式）
- UI配置（顺序、自动完成）

## 测试步骤

### 1. 启动服务器

```bash
cd server
npm run dev
```

如果遇到权限问题，可以尝试：
```bash
cd server
npx tsx src/index.ts
```

或者：
```bash
cd server
npm run build
node dist/index.js
```

### 2. 测试表单配置API

#### 测试登录表单配置
```bash
curl http://localhost:3000/api/auth/login-form
```

预期响应：
```json
{
  "title": "登录仙界",
  "subtitle": "问道长生 · 修仙之旅",
  "submitButtonText": "踏入仙途",
  "fields": [
    {
      "name": "username",
      "type": "text",
      "label": "仙号",
      "icon": "👤",
      "placeholder": "请输入仙号（3-20字符）",
      "required": true,
      "validation": {
        "minLength": 3,
        "maxLength": 20,
        "errorMessage": "仙号长度必须在3-20个字符之间"
      },
      "ui": {
        "order": 1,
        "autocomplete": "username"
      }
    },
    {
      "name": "password",
      "type": "password",
      "label": "密令",
      "icon": "🔑",
      "placeholder": "请输入密令（至少6字符）",
      "required": true,
      "validation": {
        "minLength": 6,
        "maxLength": 50,
        "errorMessage": "密令至少需要6个字符"
      },
      "ui": {
        "order": 2,
        "autocomplete": "current-password"
      }
    }
  ]
}
```

#### 测试注册表单配置
```bash
curl http://localhost:3000/api/auth/register-form
```

预期响应类似，但 `autocomplete` 为 `"new-password"`。

### 3. 启动客户端

```bash
cd phaser-client
npm run dev
```

### 4. 浏览器测试

1. 打开浏览器访问 `http://localhost:5173`（或客户端运行的端口）
2. 在登录场景点击"登录"按钮
3. 观察弹窗是否正确显示：
   - 标题：登录仙界
   - 副标题：问道长生 · 修仙之旅
   - 两个输入框（仙号、密令）
   - 提交按钮：踏入仙途

### 5. 测试验证规则

#### 测试用户名验证
- 输入少于3个字符 → 应显示错误："仙号长度必须在3-20个字符之间"
- 输入超过20个字符 → 应显示错误："仙号最多20个字符"
- 留空提交 → 应显示错误："请输入仙号"

#### 测试密码验证
- 输入少于6个字符 → 应显示错误："密令至少需要6个字符"
- 留空提交 → 应显示错误："请输入密令"

### 6. 测试注册表单

1. 点击"立即注册"链接切换到注册模式
2. 观察表单是否正确切换：
   - 标题：注册仙籍
   - 提交按钮：开启修行
   - 表单字段保持一致
   - 验证规则保持一致

### 7. 测试表单提交

1. 输入有效的用户名和密码
2. 提交表单
3. 验证是否能正常登录/注册
4. 检查控制台是否有错误

## 降级处理

如果无法从服务器获取表单配置（网络错误、服务器宕机等），客户端会自动使用内置的默认配置，确保功能正常运行。

## 开发者控制台验证

打开浏览器开发者工具（F12），在Network标签中：
1. 点击登录按钮
2. 查找 `login-form` 请求
3. 验证响应状态为 200
4. 查看响应体是否包含正确的表单配置

## 测试结果

- [ ] 服务器成功启动
- [ ] GET /api/auth/login-form 返回正确配置
- [ ] GET /api/auth/register-form 返回正确配置
- [ ] 登录弹窗显示动态生成的表单
- [ ] 注册弹窗显示动态生成的表单
- [ ] 表单验证规则正确工作
- [ ] 表单提交功能正常
- [ ] 降级方案（无法获取配置时）正常工作
- [ ] 切换登录/注册模式正常工作

## 扩展测试

### 修改服务器端配置

尝试修改 `server/src/services/formConfigService.ts`：

1. 添加新字段（如邮箱）
2. 修改验证规则（如密码最小长度改为8）
3. 修改UI文本（标题、提示等）

重启服务器后，观察客户端是否自动适配新配置，无需修改客户端代码。

## 注意事项

1. 确保服务器和客户端都在运行
2. 检查端口配置是否正确（默认服务器3000，客户端5173）
3. 如果修改了配置文件，需要重启服务器
4. 客户端使用热重载，修改后会自动刷新
