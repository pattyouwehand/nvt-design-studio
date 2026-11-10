import SignOutButton from '@/components/SignOutButton'

const tools = [
  { name: 'Canva', href: 'https://www.canva.com/' },
  { name: 'Groq', href: 'https://groq.com/' },
  { name: 'ChatGPT', href: 'https://chatgpt.com/' }
]

export default function StudioFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-[#F5F2EB] px-6 py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          NVT Design Studio
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <nav
            aria-label="Creative tools"
            className="flex flex-wrap items-center gap-5"
          >
            <p className="text-sm text-neutral-500">Quick click:</p>
            {tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                {tool.name}
              </a>
            ))}
          </nav>

          <div className="border-l border-neutral-300 pl-5">
            <SignOutButton variant="compact" />
          </div>
        </div>
      </div>
    </footer>
  )
}