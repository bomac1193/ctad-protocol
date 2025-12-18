// CTAD Protocol - Library Page
//
// Lists all Works in the registry, ordered by creation date (newest first).
// Each work links to its detail page for viewing declaration and revisions.

import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// Fetch all works from the database
async function getAllWorks() {
  return prisma.work.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      declaration: {
        include: {
          revisions: true,
          audioRefs: true,
        }
      }
    }
  })
}

export default async function LibraryPage() {
  const works = await getAllWorks()

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <nav style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#666' }}>
          &larr; Home
        </Link>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>Library</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        All registered works with creation-time authorship declarations.
      </p>

      {works.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          No works registered yet.{' '}
          <Link href="/new" style={{ color: '#000' }}>
            Create the first declaration
          </Link>
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {works.map((work) => (
            <li
              key={work.id}
              style={{
                marginBottom: '1rem',
                padding: '1rem',
                border: '1px solid #ddd',
                backgroundColor: '#fafafa',
              }}
            >
              <Link
                href={`/work/${work.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                  {work.title}
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
                  Created: {work.createdAt.toISOString().split('T')[0]}
                </p>
                {work.declaration && (
                  <p style={{ margin: 0, marginTop: '0.25rem', color: '#888', fontSize: '0.75rem' }}>
                    {work.declaration.revisions.length} revision(s) &bull;{' '}
                    {work.declaration.audioRefs.length} audio reference(s)
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link
          href="/new"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#000',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          + New Declaration
        </Link>
      </div>
    </main>
  )
}
