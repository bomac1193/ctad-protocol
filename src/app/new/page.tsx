// CTAD Protocol - Create New Work
//
// This page creates a Work and its initial Declaration atomically.
// All fields except contributors are required.

import { createWork } from '@/lib/actions'

export default function NewWorkPage() {
  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>Create New Work</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Record a creation-time authorship declaration for your work.
      </p>

      <form action={createWork}>
        {/* Work Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="title" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Work Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Intent */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="intent" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Intent *
          </label>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            What were you trying to create? What is the creative vision?
          </p>
          <textarea
            id="intent"
            name="intent"
            required
            rows={4}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Tools */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="tools" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Tools Used *
          </label>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            List all tools, software, instruments, and systems used in creation.
          </p>
          <textarea
            id="tools"
            name="tools"
            required
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* AI Used */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="aiUsed"
              value="true"
              style={{ width: '1.25rem', height: '1.25rem' }}
            />
            <span style={{ fontWeight: 'bold' }}>AI was used in creation</span>
          </label>
        </div>

        {/* Contributors */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="contributors" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Contributors
          </label>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Optional: List other people or entities who contributed to this work.
          </p>
          <input
            type="text"
            id="contributors"
            name="contributors"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Audio Files */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="audioFiles" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Audio Files
          </label>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Optional: Upload audio files to create SHA-256 hash references.
            The files are NOT stored - only their cryptographic hashes.
          </p>
          <input
            type="file"
            id="audioFiles"
            name="audioFiles"
            accept="audio/*"
            multiple
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Create Declaration
        </button>
      </form>
    </main>
  )
}
