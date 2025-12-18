// CTAD Protocol - Home Page
//
// Minimal entry point for the protocol.

import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>CTAD Protocol</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Creation-Time Authorship Declaration
      </p>

      <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
        CTAD is a minimal protocol for recording creation-time authorship declarations.
        It records claims, not verification. It prioritizes intent over prompts.
        Declarations are append-only and model-agnostic.
      </p>

      <nav>
        <Link
          href="/new"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#000',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Create New Declaration
        </Link>
      </nav>
    </main>
  )
}
