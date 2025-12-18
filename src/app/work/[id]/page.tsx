// CTAD Protocol - Work Detail Page
//
// Displays a Work with its Declaration and all Revisions.
// Provides forms for creating revisions and exporting as JSON.

import { getWork, createRevision, exportWorkAsJson } from '@/lib/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkPage({ params }: PageProps) {
  const { id } = await params
  const work = await getWork(id)

  if (!work) {
    notFound()
  }

  const declaration = work.declaration

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {/* Navigation */}
      <nav style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#666' }}>
          &larr; Home
        </Link>
      </nav>

      {/* Work Header */}
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>{work.title}</h1>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Work ID: {work.id}
        </p>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          Created: {work.createdAt.toISOString()}
        </p>
      </header>

      {/* Original Declaration */}
      {declaration && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Original Declaration
          </h2>
          <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '1rem' }}>
            Declared: {declaration.createdAt.toISOString()}
          </p>

          <dl style={{ lineHeight: '1.6' }}>
            <dt style={{ fontWeight: 'bold', marginTop: '1rem' }}>Intent</dt>
            <dd style={{ marginLeft: 0, whiteSpace: 'pre-wrap' }}>{declaration.intent}</dd>

            <dt style={{ fontWeight: 'bold', marginTop: '1rem' }}>Tools Used</dt>
            <dd style={{ marginLeft: 0, whiteSpace: 'pre-wrap' }}>{declaration.tools}</dd>

            <dt style={{ fontWeight: 'bold', marginTop: '1rem' }}>AI Used</dt>
            <dd style={{ marginLeft: 0 }}>{declaration.aiUsed ? 'Yes' : 'No'}</dd>

            {declaration.contributors && (
              <>
                <dt style={{ fontWeight: 'bold', marginTop: '1rem' }}>Contributors</dt>
                <dd style={{ marginLeft: 0 }}>{declaration.contributors}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* Revisions */}
      {declaration && declaration.revisions.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Revisions ({declaration.revisions.length})
          </h2>

          {declaration.revisions.map((revision, index) => (
            <article
              key={revision.id}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9f9f9',
                border: '1px solid #eee',
              }}
            >
              <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                Revision {index + 1} &mdash; {revision.createdAt.toISOString()}
              </p>

              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Change Note:</p>
              <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{revision.changeNote}</p>

              {revision.intent && (
                <>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Updated Intent:</p>
                  <p style={{ marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{revision.intent}</p>
                </>
              )}

              {revision.tools && (
                <>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Updated Tools:</p>
                  <p style={{ marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{revision.tools}</p>
                </>
              )}

              {revision.aiUsed !== null && (
                <p>
                  <strong>AI Used:</strong> {revision.aiUsed ? 'Yes' : 'No'}
                </p>
              )}

              {revision.contributors && (
                <p>
                  <strong>Updated Contributors:</strong> {revision.contributors}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {/* Create Revision Form */}
      {declaration && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Create Revision
          </h2>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Append a revision to update the declaration. The original declaration is never modified.
          </p>

          <form action={createRevision}>
            <input type="hidden" name="declarationId" value={declaration.id} />

            {/* Change Note (required) */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="changeNote" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Change Note *
              </label>
              <textarea
                id="changeNote"
                name="changeNote"
                required
                rows={2}
                placeholder="Why are you making this revision?"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* Updated Intent */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="intent" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Updated Intent
              </label>
              <textarea
                id="intent"
                name="intent"
                rows={3}
                placeholder="Leave empty if unchanged"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* Updated Tools */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="tools" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Updated Tools
              </label>
              <textarea
                id="tools"
                name="tools"
                rows={2}
                placeholder="Leave empty if unchanged"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* AI Used */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                AI Used
              </label>
              <select
                name="aiUsed"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              >
                <option value="">No change</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Contributors */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="contributors" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Updated Contributors
              </label>
              <input
                type="text"
                id="contributors"
                name="contributors"
                placeholder="Leave empty if unchanged"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Create Revision
            </button>
          </form>
        </section>
      )}

      {/* Export */}
      <section>
        <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
          Export
        </h2>
        <Link
          href={`/api/export/${work.id}`}
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#666',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          Export as JSON
        </Link>
      </section>
    </main>
  )
}
