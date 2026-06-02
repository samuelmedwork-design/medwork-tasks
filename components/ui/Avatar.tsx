import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Avatar({ name, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const sizes = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' }
  const base = cn(sizes[size], 'rounded-full flex-shrink-0 flex items-center justify-center font-bold overflow-hidden', className)

  if (avatarUrl) {
    return (
      <div className={base}>
        <Image src={avatarUrl} alt={name} width={40} height={40} className="w-full h-full object-cover rounded-full" />
      </div>
    )
  }
  return (
    <div className={cn(base, 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300')}>
      {getInitials(name)}
    </div>
  )
}
