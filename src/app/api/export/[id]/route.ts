// CTAD Protocol - JSON Export API
//
// Returns the complete declaration history as a portable JSON document.
// This is the machine-readable format of an authorship declaration.

import { exportWorkAsJson } from '@/lib/actions'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await exportWorkAsJson(id)

  if (!data) {
    return NextResponse.json(
      { error: 'Work not found' },
      { status: 404 }
    )
  }

  // Return JSON with appropriate headers for download
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ctad-${id}.json"`,
    },
  })
}
