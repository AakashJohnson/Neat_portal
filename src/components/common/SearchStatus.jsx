export default function SearchStatus({ loading, error, empty }) {
  if (error) return <p role="alert" className="text-danger">{error}</p>;
  return <div role="status" aria-live="polite" className="text-muted">{loading ? 'Searching...' : empty ? 'No results found.' : ''}</div>;
}
