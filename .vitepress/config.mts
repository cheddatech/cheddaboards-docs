import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CheddaBoards Docs',
  description: 'Online leaderboards for any game engine. Hosted or self-hosted.',
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',
  sitemap: { hostname: 'https://docs.cheddaboards.com' },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap' }]
  ],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Quick start', link: '/quickstart/rest' },
      { text: 'API', link: '/api/overview' },
      { text: 'Engines', link: '/engines/godot-4' },
      { text: 'Dashboard', link: 'https://cheddaboards.com/developers' }
    ],
    sidebar: [
      {
        text: 'Quick start',
        items: [
          { text: 'REST (any engine)', link: '/quickstart/rest' },
          { text: 'Godot drop-in', link: '/quickstart/godot' },
          { text: 'Unity', link: '/quickstart/unity' }
        ]
      },
      {
        text: 'API reference',
        items: [
          { text: 'Overview', link: '/api/overview' },
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Scores', link: '/api/scores' },
          { text: 'Scoreboards', link: '/api/scoreboards' },
          { text: 'Players', link: '/api/players' },
          { text: 'Achievements', link: '/api/achievements' },
          { text: 'Moderation', link: '/api/moderation' },
          { text: 'Errors', link: '/api/errors' }
        ]
      },
      {
        text: 'Engine guides',
        items: [
          { text: 'Godot 4', link: '/engines/godot-4' },
          { text: 'Godot 3.6', link: '/engines/godot-3' },
          { text: 'Unity', link: '/engines/unity' },
          { text: 'Signals reference (Godot)', link: '/engines/godot-signals' },
          { text: 'Web / HTML5 export', link: '/engines/web-export' }
        ]
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Data model', link: '/concepts/data-model' },
          { text: 'Players and accounts', link: '/concepts/accounts' },
          { text: 'Device code login', link: '/concepts/device-code' },
          { text: 'Timed leaderboards', link: '/concepts/timed-leaderboards' },
          { text: 'Category boards', link: '/concepts/category-boards' },
          { text: 'Anti-cheat', link: '/concepts/anti-cheat' },
          { text: 'Moderation', link: '/concepts/moderation' },
          { text: 'Privacy', link: '/concepts/privacy' }
        ]
      },
      {
        text: 'Self-hosting',
        items: [
          { text: 'Overview', link: '/self-hosting/overview' },
          { text: 'Deploy the canister', link: '/self-hosting/canister' },
          { text: 'Build your proxy', link: '/self-hosting/proxy' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cheddatech' },
      { icon: 'x', link: 'https://x.com/chedda86' }
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/cheddatech/cheddaboards-docs/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: "Can't be taken away. Open source backend and SDKs.",
      copyright: '© CheddaTech Ltd'
    }
  }
})