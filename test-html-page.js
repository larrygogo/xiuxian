/**
 * 测试后端返回的完整HTML登录页面
 * 使用方法：node test-html-page.js
 */

const http = require('http');

function testHTMLPage(path, description) {
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
        console.log(`Content-Type: ${res.headers['content-type']}`);
        
        if (res.statusCode === 200) {
          console.log('✅ 成功');
          console.log(`HTML长度: ${data.length} 字符`);
          
          // 检查HTML内容
          const checks = [
            { test: data.includes('<!DOCTYPE html>'), name: 'DOCTYPE声明' },
            { test: data.includes('<html'), name: 'HTML标签' },
            { test: data.includes('<style>'), name: 'CSS样式' },
            { test: data.includes('<script>'), name: 'JavaScript脚本' },
            { test: data.includes('login-modal-overlay'), name: '弹窗容器' },
            { test: data.includes('form'), name: '表单元素' },
            { test: data.includes('username-input'), name: '用户名输入框' },
            { test: data.includes('password-input'), name: '密码输入框' },
            { test: data.includes('submit-btn'), name: '提交按钮' },
            { test: data.includes('postMessage'), name: 'postMessage通信' }
          ];

          console.log('\n内容检查:');
          checks.forEach(check => {
            console.log(`  ${check.test ? '✅' : '❌'} ${check.name}`);
          });

          const allPassed = checks.every(c => c.test);
          if (allPassed) {
            console.log('\n✅ 所有检查通过！');
          } else {
            console.log('\n⚠️  部分检查失败');
          }

          // 显示HTML预览（前100个字符）
          console.log('\nHTML预览:');
          console.log(data.substring(0, 200) + '...\n');

          resolve({ success: allPassed, data });
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
  console.log('完整HTML登录页面测试');
  console.log('===================================');

  try {
    // 测试登录页面
    await testHTMLPage('/api/auth/login-page', '登录页面HTML');
    
    // 测试注册页面
    await testHTMLPage('/api/auth/register-page', '注册页面HTML');

    console.log('\n===================================');
    console.log('✅ 所有测试通过！');
    console.log('===================================');
    console.log('\n💡 提示：');
    console.log('1. 在浏览器中访问: http://localhost:3000/api/auth/login-page');
    console.log('2. 或在游戏中点击登录按钮测试');
    console.log('3. 页面会在 iframe 中加载显示');

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
