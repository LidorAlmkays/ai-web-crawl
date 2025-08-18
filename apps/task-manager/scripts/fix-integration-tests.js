const fs = require('fs');
const path = require('path');

// Function to fix validation test issues
function fixValidationTests(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix validateDto usage - replace array expectations with object expectations
  content = content.replace(
    /const (\w+)Errors = await validateDto\(([^)]+)\);/g,
    'const $1Result = await validateDto($2);'
  );
  
  content = content.replace(
    /expect\((\w+)Errors\)\.toHaveLength\(0\);/g,
    'expect($1Result.isValid).toBe(true);'
  );
  
  content = content.replace(
    /expect\((\w+)Errors\.length\)\.toBeGreaterThan\(0\);/g,
    'expect($1Result.isValid).toBe(false);'
  );
  
  content = content.replace(
    /expect\((\w+)Errors\.some\(error => error\.includes\(([^)]+)\)\)\)\.toBe\(true\);/g,
    'expect($1Result.errorMessage).toContain($2);'
  );
  
  // Fix database column names
  content = content.replace(/base_url/g, 'original_url');
  
  // Fix Kafka connection setup
  if (content.includes('beforeAll(async () => {')) {
    content = content.replace(
      /beforeAll\(async \(\) => \{([^}]+)\}/s,
      `beforeAll(async () => {$1
    // Connect to Kafka
    try {
      await kafkaClient.connect();
    } catch (error) {
      console.warn('Failed to connect to Kafka in test setup:', error);
    }`
    );
  }
  
  if (content.includes('afterAll(async () => {')) {
    content = content.replace(
      /afterAll\(async \(\) => \{([^}]*)\}/s,
      `afterAll(async () => {$1
    // Disconnect from Kafka
    try {
      await kafkaClient.disconnect();
    } catch (error) {
      console.warn('Failed to disconnect from Kafka in test cleanup:', error);
    }`
    );
  }
  
  // Add received_at to INSERT statements
  content = content.replace(
    /INSERT INTO web_crawl_tasks \(id, user_email, user_query, original_url, status\)/g,
    'INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)'
  );
  
  content = content.replace(
    /VALUES \(\$1, \$2, \$3, \$4, \$5\)/g,
    'VALUES ($1, $2, $3, $4, $5, $6)'
  );
  
  content = content.replace(
    /\[([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^\]]+)\]/g,
    '[$1, $2, $3, $4, $5, new Date().toISOString()]'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${filePath}`);
}

// Integration test files to fix
const testFiles = [
  'src/__tests__/integration/dto-validation.spec.ts',
  'src/__tests__/integration/end-to-end-workflow.spec.ts',
  'src/__tests__/integration/trace-context-propagation.spec.ts',
  'src/__tests__/integration/uuid-generation.spec.ts',
  'src/__tests__/integration/kafka-publishing.spec.ts',
  'src/__tests__/integration/performance.spec.ts'
];

testFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    fixValidationTests(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Integration test fixes completed!');
