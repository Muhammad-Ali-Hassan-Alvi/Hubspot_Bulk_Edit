import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  onIconClick?: () => void
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, type, icon, iconPosition = 'right', onIconClick, ...props }, ref) => {
    const IconWrapper = (
      <span
        className={cn(
          'absolute inset-y-0 flex items-center text-muted-foreground',
          iconPosition === 'left' ? 'left-3' : 'right-3',
          onIconClick && 'cursor-pointer'
        )}
        onClick={onIconClick}
        onMouseDown={e => e.preventDefault()}
      >
        {icon}
      </span>
    )

    return (
      <div className="relative w-full">
        {icon && iconPosition === 'left' && IconWrapper}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {icon && iconPosition === 'right' && IconWrapper}
      </div>
    )
  }
)

InputWithIcon.displayName = 'InputWithIcon'

export { InputWithIcon }
