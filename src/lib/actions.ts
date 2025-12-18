'use server'

// CTAD Protocol - Server Actions
//
// These actions implement the core protocol operations:
// 1. Create a Work with its initial Declaration
// 2. Create append-only Revisions to existing Declarations
// 3. Retrieve Works with full declaration history

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Input types for server actions
interface CreateWorkInput {
  title: string
  intent: string
  tools: string
  aiUsed: boolean
  contributors?: string
}

interface CreateRevisionInput {
  declarationId: string
  changeNote: string
  intent?: string
  tools?: string
  aiUsed?: boolean
  contributors?: string
}

/**
 * Create a new Work with its initial Declaration
 *
 * Protocol note: A Work and its Declaration are created atomically.
 * The Declaration captures the creation-time authorship claim.
 * This is the only time the Declaration is written - all future
 * changes are recorded as Revisions.
 */
export async function createWork(formData: FormData) {
  const title = formData.get('title') as string
  const intent = formData.get('intent') as string
  const tools = formData.get('tools') as string
  const aiUsed = formData.get('aiUsed') === 'true'
  const contributors = formData.get('contributors') as string | null

  // Validate required fields
  if (!title?.trim()) {
    return { error: 'Work title is required' }
  }
  if (!intent?.trim()) {
    return { error: 'Intent statement is required' }
  }
  if (!tools?.trim()) {
    return { error: 'Tools used is required' }
  }

  // Create Work and Declaration atomically
  const work = await prisma.work.create({
    data: {
      title: title.trim(),
      declaration: {
        create: {
          intent: intent.trim(),
          tools: tools.trim(),
          aiUsed: aiUsed ?? false,
          contributors: contributors?.trim() || null,
        },
      },
    },
    include: {
      declaration: true,
    },
  })

  // Redirect to the work page
  redirect(`/work/${work.id}`)
}

/**
 * Create a Revision to an existing Declaration
 *
 * Protocol note: Revisions are append-only. The original Declaration
 * is never modified. Each Revision captures a point-in-time amendment
 * with a required change note explaining why the revision was made.
 */
export async function createRevision(formData: FormData) {
  const declarationId = formData.get('declarationId') as string
  const changeNote = formData.get('changeNote') as string
  const intent = formData.get('intent') as string | null
  const tools = formData.get('tools') as string | null
  const aiUsedValue = formData.get('aiUsed')
  const aiUsed = aiUsedValue === 'true' ? true : aiUsedValue === 'false' ? false : null
  const contributors = formData.get('contributors') as string | null

  // Validate required fields
  if (!declarationId) {
    return { error: 'Declaration ID is required' }
  }
  if (!changeNote?.trim()) {
    return { error: 'Change note is required' }
  }

  // Verify declaration exists
  const declaration = await prisma.declaration.findUnique({
    where: { id: declarationId },
  })

  if (!declaration) {
    return { error: 'Declaration not found' }
  }

  // Create the revision (append-only)
  await prisma.declarationRevision.create({
    data: {
      declarationId,
      changeNote: changeNote.trim(),
      intent: intent?.trim() || null,
      tools: tools?.trim() || null,
      aiUsed: aiUsed ?? null,
      contributors: contributors?.trim() || null,
    },
  })

  // Revalidate the work page to show the new revision
  revalidatePath(`/work/${declaration.workId}`)

  return { success: true }
}

/**
 * Get a Work with its Declaration and all Revisions
 *
 * Protocol note: Returns the complete declaration history including
 * the original declaration and all revisions in chronological order.
 */
export async function getWork(id: string) {
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      declaration: {
        include: {
          revisions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  return work
}

/**
 * Export a Work's declaration history as JSON
 *
 * Protocol note: This provides a portable, machine-readable format
 * of the complete authorship declaration record.
 */
export async function exportWorkAsJson(id: string) {
  const work = await getWork(id)

  if (!work) {
    return null
  }

  // Structure the export for protocol compatibility
  return {
    protocol: 'CTAD',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    work: {
      id: work.id,
      title: work.title,
      createdAt: work.createdAt.toISOString(),
    },
    declaration: work.declaration
      ? {
          id: work.declaration.id,
          createdAt: work.declaration.createdAt.toISOString(),
          intent: work.declaration.intent,
          tools: work.declaration.tools,
          aiUsed: work.declaration.aiUsed,
          contributors: work.declaration.contributors,
        }
      : null,
    revisions: work.declaration?.revisions.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      changeNote: r.changeNote,
      intent: r.intent,
      tools: r.tools,
      aiUsed: r.aiUsed,
      contributors: r.contributors,
    })) ?? [],
  }
}
