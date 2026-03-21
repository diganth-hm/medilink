import { Link } from 'react-router-dom'

export default function Settings() {
  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
        <p className="text-secondary">Manage your account and application preferences</p>
      </div>

      <div className="space-y-4">
        {/* Edit Profile Card */}
        <Link 
          to="/dashboard/profile?edit=true"
          className="card block hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 border-l-4 border-l-blue-500"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl flex-shrink-0">
              ✏️
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">Edit Profile</h3>
              <p className="text-secondary text-sm">Update your personal and medical information</p>
            </div>
            <div className="ml-auto text-secondary text-xl">
              →
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
