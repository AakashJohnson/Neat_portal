// auth/social/buttons.blade.php with config('auth.social.providers') =
// facebook, twitter, google. Social login stays BLOCKED until provider keys
// exist; the links land on /panel/auth/{provider}/login, which says so.
const PROVIDERS = [
  { name: 'facebook', className: 'btn-facebook', icon: 'fab fa-facebook fa-2x' },
  { name: 'twitter', className: 'btn-twitter', icon: 'fab fa-twitter fa-2x' },
  { name: 'google', className: 'btn-google', icon: 'fab fa-google-plus-square fa-2x' },
];

export default function SocialButtons() {
  const col = 12 / PROVIDERS.length;
  return (
    <div className="row pb-3 pt-2">
      {PROVIDERS.map((p) => (
        <div key={p.name} className={`col-${col} d-flex align-items-center justify-content-center`}>
          <a href={`/panel/auth/${p.name}/login`} className={p.className}>
            <i className={p.icon}></i>
          </a>
        </div>
      ))}
    </div>
  );
}
