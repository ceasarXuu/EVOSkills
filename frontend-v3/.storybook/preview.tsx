import { useLayoutEffect, type ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import '../src/styles/globals.css'
import { DashboardStoryFrame } from '../src/stories/dashboard-story-frame'

interface DashboardFrameParameters {
  frameWidth?: string
}

interface DashboardRouterParameters {
  initialEntries?: string[]
}

function StorybookThemeBridge({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlColorScheme = html.style.colorScheme
    const previousBodyColorScheme = body.style.colorScheme

    html.classList.add('dark')
    body.classList.add('dark')
    html.style.colorScheme = 'dark'
    body.style.colorScheme = 'dark'

    return () => {
      html.classList.remove('dark')
      body.classList.remove('dark')
      html.style.colorScheme = previousHtmlColorScheme
      body.style.colorScheme = previousBodyColorScheme
    }
  }, [])

  return children
}

const withDashboardEnvironment: Decorator = (Story, context) => {
  const dashboard = context.parameters.dashboard as DashboardFrameParameters | undefined
  const router = context.parameters.router as DashboardRouterParameters | undefined
  const frameWidth = dashboard?.frameWidth ?? '1120px'
  const initialEntries = router?.initialEntries ?? ['/skills']

  return (
    <StorybookThemeBridge>
      <MemoryRouter initialEntries={initialEntries} key={initialEntries.join('|')}>
        <DashboardStoryFrame width={frameWidth}>
          <Story />
        </DashboardStoryFrame>
      </MemoryRouter>
    </StorybookThemeBridge>
  )
}

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    a11y: { test: 'error' },
    backgrounds: {
      default: 'dark',
      options: {
        dark: { name: 'Dashboard dark', value: 'oklch(0.153 0.006 107.1)' },
      },
    },
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },
    layout: 'padded',
    options: {
      storySort: {
        order: [
          'Dashboard V3',
          ['Shell', 'Skills', 'Project', 'Config', 'Overlay'],
        ],
      },
    },
  },
  decorators: [withDashboardEnvironment],
}

export default preview
