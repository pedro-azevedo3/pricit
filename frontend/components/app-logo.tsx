export function AppLogo({ mobile = false }: { mobile?: boolean }) {
  const className = `brand-logo${mobile ? ' brand-logo-mobile' : ''}`;
  if (mobile) return <>
    <img src="/pricit-logo-dark-green.png" alt="pricit" width={4063} height={1755} className={`${className} mobile-logo-light`}/>
    <img src="/pricit-logo.png" alt="pricit" width={4063} height={1755} className={`${className} mobile-logo-dark`}/>
  </>;
  return <img src="/pricit-logo.png" alt="pricit" width={4063} height={1755} className={className}/>;
}
