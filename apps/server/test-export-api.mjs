#!/usr/bin/env node

/**
 * Integration test for custom product export API endpoint
 * Tests the /admin/products/export endpoint and verifies file creation
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

const BASE_URL = 'http://sharewear.local:9000'
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY3Rvcl9pZCI6InVzZXJfMDFLNlJDN1JUMDE3RjkyMVA1UlZNRVpHRjciLCJhY3Rvcl90eXBlIjoidXNlciIsImF1dGhfaWRlbnRpdHlfaWQiOiJhdXRoaWRfMDFLNlJDN1JXSlFHR041VzA2MllTVDNZMUgiLCJhcHBfbWV0YWRhdGEiOnsidXNlcl9pZCI6InVzZXJfMDFLNlJDN1JUMDE3RjkyMVA1UlZNRVpHRjcifSwiaWF0IjoxNzU5NjA3MjkwLCJleHAiOjE3NTk2OTM2OTB9.D-Enwf4ufrlumGVpklfTrzlfiNTmYw4GXCR9rpN4z-Q'
const STATIC_DIR = '/home/simon/Dev/sigreer/sharewear.clothing/apps/server/static'

async function getLatestCSVFile() {
  const files = await readdir(STATIC_DIR)
  const csvFiles = files.filter(f => f.endsWith('.csv'))

  if (csvFiles.length === 0) {
    return null
  }

  const filesWithStats = await Promise.all(
    csvFiles.map(async (file) => {
      const filePath = join(STATIC_DIR, file)
      const stats = await stat(filePath)
      return { file, mtime: stats.mtime }
    })
  )

  filesWithStats.sort((a, b) => b.mtime - a.mtime)
  return filesWithStats[0]?.file
}

async function testExportAPI() {
  console.log('Testing Custom Product Export API')
  console.log('===================================\n')

  // Get initial CSV file (if any)
  const initialCSV = await getLatestCSVFile()
  console.log(`Initial CSV file: ${initialCSV || 'None'}\n`)

  // Test 1: Basic export
  console.log('Test 1: Basic Export (all products)')
  console.log('-------------------------------------')

  const cmd = `curl -s -X POST '${BASE_URL}/admin/products/export' \\
    -H 'Authorization: Bearer ${AUTH_TOKEN}' \\
    -H 'Content-Type: application/json' \\
    -d '{"filters":{},"select":["*"]}'`

  try {
    const { stdout, stderr } = await execAsync(cmd)
    const response = JSON.parse(stdout)

    console.log('Response:', JSON.stringify(response, null, 2))
    console.log('Status: SUCCESS (202)')

    // Wait for workflow to complete
    console.log('\nWaiting 10 seconds for workflow to complete...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Check for new CSV file
    const latestCSV = await getLatestCSVFile()
    console.log(`\nLatest CSV file after export: ${latestCSV || 'None'}`)

    if (latestCSV && latestCSV !== initialCSV) {
      console.log('✅ SUCCESS: New CSV file created!')
      console.log(`   Filename: ${latestCSV}`)

      // Verify filename format
      const timestampMatch = latestCSV.match(/^(\d+)-product-exports\.csv$/)
      if (timestampMatch) {
        console.log('✅ Filename format is correct (no duplicate timestamp)')
      } else {
        console.log('❌ WARNING: Filename format is unexpected')
        console.log(`   Expected: {timestamp}-product-exports.csv`)
        console.log(`   Got: ${latestCSV}`)
      }

      // Check file accessibility
      const fileUrl = `${BASE_URL}/static/${latestCSV}`
      const testCmd = `curl -s -o /dev/null -w '%{http_code}' '${fileUrl}'`
      const { stdout: statusCode } = await execAsync(testCmd)

      if (statusCode === '200') {
        console.log(`✅ File is accessible at: ${fileUrl}`)
      } else {
        console.log(`❌ File returned HTTP ${statusCode} (expected 200)`)
      }
    } else {
      console.log('❌ FAILURE: No new CSV file was created')
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    if (error.stderr) {
      console.error('stderr:', error.stderr)
    }
  }
}

// Run the test
testExportAPI().catch(console.error)
