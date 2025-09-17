import Link from 'next/link'
// import { Youtube, Linkedin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FooterProps {
  className?: string
}

export default function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={cn('w-full fill-available border-t bg-background', className)}>
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Smuves. All Rights Reserved.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
          <Link
            href="https://www.smuves.com/terms-of-use"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Terms of Service
          </Link>
          <Link
            href="https://www.smuves.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Privacy Policy
          </Link>
        </nav>

        {/* <div className="flex items-center gap-4">
          <Link
            href="https://www.youtube.com/@SmuvesHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <Youtube className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
          </Link>
          <Link
            href="https://www.linkedin.com/company/smuves"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
          </Link>
        </div> */}
      </div>
    </footer>
  )
}
