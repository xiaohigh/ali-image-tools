const { execSync } = require('child_process');
const path = require('path');

const projectDir = __dirname;
process.chdir(projectDir);

console.log('='.repeat(50));
console.log('Building for Cloudflare Pages...');
console.log('='.repeat(50));

try {
  execSync('npx @cloudflare/next-on-pages', { 
    stdio: 'inherit',
    cwd: projectDir
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Deploying to Cloudflare Pages...');
  console.log('='.repeat(50));
  
  execSync('npx wrangler pages deploy .vercel/output/static --project-name aliyun-image-model', {
    stdio: 'inherit',
    cwd: projectDir
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Deployment completed!');
  console.log('='.repeat(50));
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
}

