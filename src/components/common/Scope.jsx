export default function Scope({ name, children, as: Tag = 'div' }) {
  return (
    <Tag className={`ngc-${name}`} style={{ display: 'contents' }}>
      {children}
    </Tag>
  );
}
