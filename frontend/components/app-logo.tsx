export function AppLogo({ mobile = false }: { mobile?: boolean }) {
  const className = `brand-logo${mobile ? ' brand-logo-mobile' : ''}`;
  return <>
    <img src="/pricit-logo-dark-green.png" alt="pricit" width={4063} height={1755} className={`${className} app-logo-light`}/>
    <img src="/pricit-logo.png" alt="pricit" width={4063} height={1755} className={`${className} app-logo-dark`}/>
  </>;
}
