const installer = require('electron-installer-windows');
const path = require('path');

const options = {
  src: 'dist/MDReader-win32-x64',
  dest: 'dist/installer',
  icon: path.join(__dirname, 'assets', 'icon.ico'),
  authors: ['MD Reader Team'],
  exe: 'MDReader.exe',
  description: 'A modern Markdown reader with tabs support',
  title: 'MD Reader',
  name: 'MDReader',
  noMsi: true
};

async function main() {
  console.log('Creating Windows installer...');
  try {
    await installer(options);
    console.log('Successfully created installer at dist/installer');
  } catch (error) {
    console.error('Error creating installer:', error);
  }
}

main();