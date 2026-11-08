export function AppLogo({ mobile = false }: { mobile?: boolean }) {
  const className = `brand-logo${mobile ? ' brand-logo-mobile' : ''}`;
  return <img src="/pricit-logo.png" alt="pricit" width={4063} height={1755} className={className}/>;
}
