import { InDevelopment } from './in-development'
import { Zap, Settings, BarChart3, Users, Database } from 'lucide-react'

export function InDevelopmentDemo() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">InDevelopment Component Examples</h2>

      {/* Example 1: Default usage */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Default Usage</h3>
        <InDevelopment icon={Zap}>
          <div className="p-4 bg-muted rounded">
            <p>This is the content that will be blurred and disabled.</p>
            <button className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded">
              Disabled Button
            </button>
          </div>
        </InDevelopment>
      </div>

      {/* Example 2: Custom message */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Custom Message</h3>
        <InDevelopment icon={Settings} message="Settings panel coming soon!">
          <div className="p-4 bg-muted rounded">
            <p>Settings configuration will go here.</p>
          </div>
        </InDevelopment>
      </div>

      {/* Example 3: Different icon */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Different Icon</h3>
        <InDevelopment icon={BarChart3}>
          <div className="p-4 bg-muted rounded">
            <p>Analytics dashboard content.</p>
          </div>
        </InDevelopment>
      </div>

      {/* Example 4: Team management example */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Team Management</h3>
        <InDevelopment icon={Users} message="Team features are being built">
          <div className="p-4 bg-muted rounded">
            <p>Team member management interface.</p>
          </div>
        </InDevelopment>
      </div>

      {/* Example 5: Database example */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Database Management</h3>
        <InDevelopment icon={Database} message="Database tools in development">
          <div className="p-4 bg-muted rounded">
            <p>Database management and backup tools.</p>
          </div>
        </InDevelopment>
      </div>
    </div>
  )
}
