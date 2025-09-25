const fs = require('fs')
const path = require('path')

// List of API routes that need to be updated
const apiRoutes = [
  'app/api/debug/sync-sessions/route.ts',
  'app/api/test/sync-sessions/route.ts',
  'app/api/audit/bulk-editing/route.ts',
  'app/api/hubspot/content-counts/route.ts',
  'app/api/backup/revert/route.ts',
  'app/api/sync-history/route.ts',
  'app/api/backup/schedule.ts',
  'app/api/test/cleanup-sync-sessions/route.ts',
  'app/api/backup/sync-to-sheets/route.ts',
  'app/api/history/revert/route.ts',
  'app/api/sync/to-hubspot/route.ts',
  'app/api/pages/edit/route.ts',
  'app/api/history/get-versions/route.ts',
  'app/api/sync/preview-changes/route.ts',
  'app/api/pages/bulk-edit/route.ts',
  'app/api/google/sheets/route.ts',
  'app/api/google/sheets/export/route.ts',
  'app/api/google/sheets/create/route.ts',
  'app/api/google/sheets/[sheetId]/tabs/route.ts',
  'app/api/google/sheets/[sheetId]/tabs/create/route.ts',
]

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false

    // Add import if not already present
    if (!content.includes('getAuthenticatedUser')) {
      const importMatch = content.match(/import.*from.*['"]@\/lib\/supabase\/server['"]/)
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + "\nimport { getAuthenticatedUser } from '@/lib/store/serverUtils'"
        )
        updated = true
      }
    }

    // Replace supabase.auth.getUser() pattern
    const getUserPattern =
      /const\s*{\s*\n\s*data:\s*{\s*user\s*},\s*\n\s*error:\s*authError,\s*\n\s*}\s*=\s*await\s*supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if\s*\(authError\s*\|\|\s*!user\)\s*{\s*\n\s*return\s*NextResponse\.json\(\s*\{\s*success:\s*false,\s*error:\s*['"][^'"]*['"]\s*\},\s*\{\s*status:\s*401\s*\}\s*\)\s*\n\s*}/g

    if (getUserPattern.test(content)) {
      content = content.replace(getUserPattern, 'const user = await getAuthenticatedUser()')
      updated = true
    }

    // Also handle simpler patterns
    const simplePattern =
      /const\s*{\s*data:\s*{\s*user\s*},\s*error:\s*authError,\s*}\s*=\s*await\s*supabase\.auth\.getUser\(\)\s*\n\s*if\s*\(authError\s*\|\|\s*!user\)\s*{\s*[^}]*}/g

    if (simplePattern.test(content)) {
      content = content.replace(simplePattern, 'const user = await getAuthenticatedUser()')
      updated = true
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Updated: ${filePath}`)
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message)
  }
}

console.log('🔄 Updating API routes to use getAuthenticatedUser...\n')

apiRoutes.forEach(route => {
  const filePath = path.join(process.cwd(), route)
  if (fs.existsSync(filePath)) {
    updateFile(filePath)
  } else {
    console.log(`⚠️  File not found: ${route}`)
  }
})

console.log('\n✨ API routes update complete!')
console.log(
  "\nNote: You may need to manually review and adjust some files if the patterns don't match exactly."
)
