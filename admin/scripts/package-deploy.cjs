const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'deploy', new Date().toISOString().replace(/[:.]/g, '-'));
if (!fs.existsSync(path.join(root, 'build', 'index.html')))
  throw new Error('Run the production build first.');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'build'), path.join(output, 'admin'), { recursive: true });
const privateDir = path.join(output, 'starline-admin-private');
fs.mkdirSync(privateDir);
for (const file of ['bootstrap.php', 'config.example.php', '.htaccess'])
  fs.copyFileSync(path.join(root, 'server', file), path.join(privateDir, file));
fs.cpSync(path.join(root, 'server', 'src'), path.join(privateDir, 'src'), {
  recursive: true,
});
fs.cpSync(path.join(root, 'server', 'migrations'), path.join(privateDir, 'migrations'), {
  recursive: true,
});
console.log(`Deployment package: ${output}`);
console.log(
  'Private credentials and runtime files are excluded. Configure config.php on the server.',
);

fs.cpSync(path.join(root, 'server', 'release'), path.join(privateDir, 'release'), {
  recursive: true,
});
