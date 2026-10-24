// Boundary for a ported Angular component's own stylesheet (see
// scripts/scope-component-css.mjs). `display: contents` keeps layout unchanged.
export default function Scope({ name, children, as: Tag = 'div' }) {
  return (
    <Tag className={`ngc-${name}`} style={{ display: 'contents' }}>
      {children}
    </Tag>
  );
}
