// Rebuild the static social card from the existing brand assets.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f6ef"/>
  <path d="M808 0H1200V630H744C843 493 743 220 808 0Z" fill="#e3e9dd"/>
  <circle cx="994" cy="284" r="190" fill="#d0ddc7"/>
  <circle cx="1090" cy="86" r="13" fill="#225342"/>
  <path d="M740 510h24m-12-12v24M1105 479h28m-14-14v28" stroke="#225342" stroke-width="3" stroke-linecap="round"/>
  <g fill="#173d30" font-family="Arial, Helvetica, sans-serif">
    <text x="74" y="269" font-size="66" font-weight="700" letter-spacing="-2">Seu negócio merece</text>
    <text x="74" y="350" font-size="80" font-weight="700" letter-spacing="-2">preço certo.</text>
    <text x="77" y="421" font-size="26" fill="#53645b">Custos claros. Seu trabalho valorizado.</text>
  </g>
  <rect x="76" y="493" width="348" height="53" rx="26.5" fill="#173d30"/>
  <text x="103" y="527" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#ffffff">Seu negócio. Mais clareza.</text>
  <path d="M76 591H1124" stroke="#cbd3c7"/>
</svg>`);
const logo = await sharp(path.join(root, 'public/pricit-logo-dark-green.png')).trim().resize({width:226}).png().toBuffer();
const mascot = await sharp(path.join(root, 'public/mascot-cool.png')).trim().resize({height:470}).png().toBuffer();
await sharp(background).composite([
  {input:logo,top:66,left:76},
  {input:mascot,top:88,left:812},
]).jpeg({quality:88,mozjpeg:true}).toFile(path.join(root, 'public/share-business.jpg'));
console.log('Social card generated: public/share-business.jpg (1200×630)');
