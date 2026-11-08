import Image from 'next/image';

export function Mascot({ pose = 'happy', size = 112, className = '' }: {
  pose?: 'happy' | 'cool'; size?: number; className?: string;
}) {
  return <Image src={`/mascot-${pose}.png`} alt="" aria-hidden="true"
    width={size} height={size} sizes={`${size}px`} draggable={false}
    className={`mascot ${className}`} />;
}
