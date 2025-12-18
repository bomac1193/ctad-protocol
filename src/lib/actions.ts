'use server'

// CTAD Protocol - Server Actions
//
// These actions implement the core protocol operations:
// 1. Create a Work with its initial Declaration
// 2. Create append-only Revisions to existing Declarations
// 3. Retrieve Works with full declaration history
// 4. Hash audio files server-side for AudioReferences

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createHash } from 'crypto'

/**
 * Compute SHA-256 hash of a file buffer
 *
 * Protocol note: We hash audio files server-side to create a cryptographic
 * link between the declaration and the audio. This hash is stored, NOT the
 * audio file itself. The hash provides verifiable proof that a specific
 * audio file was associated with this declaration at creation time.
 */
function computeSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

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
 *
 * Audio files are hashed server-side and stored as AudioReferences.
 * We do NOT store the audio files themselves - only the hash and filename.
 */
export async function createWork(formData: FormData) {
  const title = formData.get('title') as string
  const intent = formData.get('intent') as string
  const tools = formData.get('tools') as string
  const aiUsed = formData.get('aiUsed') === 'true'
  const contributors = formData.get('contributors') as string | null

  // Get audio files if any were uploaded
  const audioFiles = formData.getAll('audioFiles') as File[]

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

  // Process audio files: compute SHA-256 hashes server-side
  // We store only the hash and filename, not the audio data
  const audioRefData: { fileName: string; sha256: string }[] = []
  for (const file of audioFiles) {
    if (file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const sha256 = computeSha256(buffer)
      audioRefData.push({
        fileName: file.name,
        sha256,
      })
    }
  }

  // Create Work, Declaration, and AudioReferences atomically
  const work = await prisma.work.create({
    data: {
      title: title.trim(),
      declaration: {
        create: {
          intent: intent.trim(),
          tools: tools.trim(),
          aiUsed: aiUsed ?? false,
          contributors: contributors?.trim() || null,
          // Create AudioReferences for each uploaded file
          audioRefs: {
            create: audioRefData,
          },
        },
      },
    },
    include: {
      declaration: {
        include: {
          audioRefs: true,
        },
      },
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
 * Get a Work with its Declaration, Revisions, and AudioReferences
 *
 * Protocol note: Returns the complete declaration history including
 * the original declaration, all revisions in chronological order,
 * and all audio references with their SHA-256 hashes.
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
          audioRefs: {
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
 * of the complete authorship declaration record, including audio
 * references with their SHA-256 hashes for verification.
 */
export async function exportWorkAsJson(id: string) {
  const work = await getWork(id)

  if (!work) {
    return null
  }

  // Structure the export for protocol compatibility
  return {
    protocol: 'CTAD',
    version: '1.1', // Updated version to reflect audio references support
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
    // Audio references with SHA-256 hashes for verification
    audioReferences: work.declaration?.audioRefs.map((a) => ({
      id: a.id,
      createdAt: a.createdAt.toISOString(),
      fileName: a.fileName,
      sha256: a.sha256,
      description: a.description,
    })) ?? [],
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
