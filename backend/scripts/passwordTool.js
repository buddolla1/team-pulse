const bcrypt = require('bcryptjs');

const printUsage = () => {
  console.log('Usage:');
  console.log('  node scripts/passwordTool.js hash <password> [rounds]');
  console.log('  node scripts/passwordTool.js verify <password> <hash>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/passwordTool.js hash admin123');
  console.log('  node scripts/passwordTool.js verify admin123 "$2b$10$..."');
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }

  if (command === 'hash') {
    const password = args[0];
    const rounds = Number.parseInt(args[1], 10) || 10;

    if (!password) {
      printUsage();
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, rounds);
    console.log(hash);
    return;
  }

  if (command === 'verify') {
    const password = args[0];
    const hash = args[1];

    if (!password || !hash) {
      printUsage();
      process.exit(1);
    }

    const isMatch = await bcrypt.compare(password, hash);
    console.log(isMatch ? 'MATCH' : 'NO MATCH');
    return;
  }

  printUsage();
  process.exit(1);
};

main().catch((error) => {
  console.error('Password tool failed:', error.message);
  process.exit(1);
});
