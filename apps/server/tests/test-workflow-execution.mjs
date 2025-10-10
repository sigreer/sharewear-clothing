/**
 * Test script to verify the custom product export workflow execution.
 *
 * This script:
 * 1. Authenticates as admin user
 * 2. Triggers the custom export endpoint
 * 3. Waits for workflow to complete
 * 4. Verifies CSV file generation
 * 5. Checks workflow execution records in database
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const BASE_URL = 'http://sharewear.local:9000';
const STATIC_DIR = '/home/simon/Dev/sigreer/sharewear.clothing/apps/server/static';
const DB_CONNECTION = 'PGPASSWORD=postgres psql -h localhost -p 55432 -U postgres -d shareweardb -t -c';

console.log('🧪 Testing Custom Product Export Workflow Execution\n');
console.log('=' .repeat(70));

// Helper: Execute SQL query
async function queryDb(sql) {
  const { stdout } = await execAsync(`${DB_CONNECTION} "${sql}"`);
  return stdout.trim();
}

// Helper: Get CSV files in static directory
async function getCsvFiles() {
  try {
    const files = await readdir(STATIC_DIR);
    return files.filter(f => f.endsWith('.csv')).sort();
  } catch (error) {
    return [];
  }
}

// Helper: Authenticate and get token
async function authenticate() {
  const response = await fetch(`${BASE_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'qatest@admin.com',
      password: 'testpass123'
    })
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

// Main test
async function runTest() {
  try {
    // Step 1: Authenticate
    console.log('\n1️⃣  Authenticating...');
    const token = await authenticate();
    console.log('✅ Authenticated successfully');

    // Step 2: Get initial state
    console.log('\n2️⃣  Getting initial state...');
    const initialCsvFiles = await getCsvFiles();
    const initialWorkflowCount = await queryDb(
      "SELECT COUNT(*) FROM public.workflow_execution"
    );
    console.log(`   CSV files before: ${initialCsvFiles.length}`);
    console.log(`   Workflow executions before: ${initialWorkflowCount}`);

    // Step 3: Trigger export
    console.log('\n3️⃣  Triggering product export...');
    const exportResponse = await fetch(`${BASE_URL}/admin/products/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filters: {},
        select: ['*']
      })
    });

    const exportResult = await exportResponse.json();
    console.log(`   Status: ${exportResponse.status}`);
    console.log(`   Response:`, JSON.stringify(exportResult, null, 2));

    if (exportResponse.status !== 202) {
      throw new Error(`Expected 202, got ${exportResponse.status}`);
    }

    // Step 4: Wait for workflow to complete (synchronous should be immediate)
    console.log('\n4️⃣  Waiting 3 seconds for workflow completion...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Check results
    console.log('\n5️⃣  Checking results...');
    const finalCsvFiles = await getCsvFiles();
    const finalWorkflowCount = await queryDb(
      "SELECT COUNT(*) FROM public.workflow_execution"
    );
    const newCsvFiles = finalCsvFiles.filter(f => !initialCsvFiles.includes(f));

    console.log(`   CSV files after: ${finalCsvFiles.length}`);
    console.log(`   New CSV files: ${newCsvFiles.length}`);
    console.log(`   Workflow executions after: ${finalWorkflowCount}`);

    if (newCsvFiles.length > 0) {
      console.log(`   New files created:`);
      newCsvFiles.forEach(f => console.log(`     - ${f}`));
    }

    // Step 6: Verify workflow execution records
    console.log('\n6️⃣  Checking workflow execution records...');
    const workflowDetails = await queryDb(
      "SELECT id, workflow_id, state, created_at FROM public.workflow_execution ORDER BY created_at DESC LIMIT 5"
    );

    if (workflowDetails) {
      console.log('   Latest workflow executions:');
      console.log(workflowDetails);
    } else {
      console.log('   No workflow execution records found');
    }

    // Final verdict
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 TEST RESULTS:\n');

    const workflowExecuted = parseInt(finalWorkflowCount) > parseInt(initialWorkflowCount);
    const fileGenerated = newCsvFiles.length > 0;
    const workflowIdReturned = exportResult.workflow_id !== undefined;

    console.log(`   Workflow Executed:    ${workflowExecuted ? '✅ YES' : '❌ NO'}`);
    console.log(`   CSV File Generated:   ${fileGenerated ? '✅ YES' : '❌ NO'}`);
    console.log(`   workflow_id Returned: ${workflowIdReturned ? '✅ YES' : '❌ NO'}`);

    if (fileGenerated) {
      const latestFile = newCsvFiles[0];
      console.log(`\n   Latest file: ${latestFile}`);
      console.log(`   File URL: ${BASE_URL}/static/${latestFile}`);

      // Test file accessibility
      console.log('\n7️⃣  Testing file accessibility...');
      const fileUrl = `${BASE_URL}/static/${latestFile}`;
      const fileResponse = await fetch(fileUrl);
      console.log(`   URL: ${fileUrl}`);
      console.log(`   Status: ${fileResponse.status}`);
      console.log(`   Accessible: ${fileResponse.ok ? '✅ YES' : '❌ NO'}`);
    }

    const allTestsPassed = workflowExecuted && fileGenerated;
    console.log('\n' + '='.repeat(70));
    console.log(`\n${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}\n`);

    process.exit(allTestsPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  }
}

runTest();
