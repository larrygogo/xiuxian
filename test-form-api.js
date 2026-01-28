/**
 * 测试表单配置API
 * 使用方法：node test-form-api.js
 */

const http = require('http');

function testAPI(path, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    console.log(`\n测试: ${description}`);
    console.log(`请求: GET http://localhost:3000${path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('✅ 成功');
            console.log('响应数据:');
            console.log(JSON.stringify(json, null, 2));
            resolve(json);
          } catch (e) {
            console.log('❌ 响应不是有效的JSON');
            console.log(data);
            reject(e);
          }
        } else {
          console.log('❌ 请求失败');
          console.log(data);
          reject(new Error(`Status code: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ 请求错误: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

async function runTests() {
  console.log('===================================');
  console.log('动态表单配置API测试');
  console.log('===================================');

  try {
    // 测试登录表单配置
    const loginConfig = await testAPI('/api/auth/login-form', '登录表单配置');
    
    // 验证登录表单配置结构
    console.log('\n验证登录表单配置结构:');
    if (loginConfig.title && loginConfig.subtitle && loginConfig.submitButtonText && loginConfig.fields) {
      console.log('✅ 配置结构完整');
      console.log(`   - 标题: ${loginConfig.title}`);
      console.log(`   - 副标题: ${loginConfig.subtitle}`);
      console.log(`   - 提交按钮: ${loginConfig.submitButtonText}`);
      console.log(`   - 字段数量: ${loginConfig.fields.length}`);
      
      loginConfig.fields.forEach((field, index) => {
        console.log(`   - 字段${index + 1}: ${field.label} (${field.name}, ${field.type})`);
        console.log(`     必填: ${field.required}, 最小长度: ${field.validation.minLength}, 最大长度: ${field.validation.maxLength}`);
      });
    } else {
      console.log('❌ 配置结构不完整');
    }

    // 测试注册表单配置
    const registerConfig = await testAPI('/api/auth/register-form', '注册表单配置');
    
    // 验证注册表单配置结构
    console.log('\n验证注册表单配置结构:');
    if (registerConfig.title && registerConfig.subtitle && registerConfig.submitButtonText && registerConfig.fields) {
      console.log('✅ 配置结构完整');
      console.log(`   - 标题: ${registerConfig.title}`);
      console.log(`   - 副标题: ${registerConfig.subtitle}`);
      console.log(`   - 提交按钮: ${registerConfig.submitButtonText}`);
      console.log(`   - 字段数量: ${registerConfig.fields.length}`);
      
      registerConfig.fields.forEach((field, index) => {
        console.log(`   - 字段${index + 1}: ${field.label} (${field.name}, ${field.type})`);
        console.log(`     必填: ${field.required}, autocomplete: ${field.ui?.autocomplete}`);
      });
    } else {
      console.log('❌ 配置结构不完整');
    }

    console.log('\n===================================');
    console.log('✅ 所有测试通过！');
    console.log('===================================');

  } catch (error) {
    console.log('\n===================================');
    console.log('❌ 测试失败');
    console.log('===================================');
    console.log('错误信息:', error.message);
    console.log('\n请确保:');
    console.log('1. 服务器正在运行 (cd server && npm run dev)');
    console.log('2. 服务器端口为 3000');
    process.exit(1);
  }
}

runTests();
