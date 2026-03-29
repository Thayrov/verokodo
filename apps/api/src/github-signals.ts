/**
 * Purpose: Fetch compact public GitHub signals used for oracle generation.
 * Interface: fetchGitHubSignals(username) -> normalized signals payload.
 * Invariants: output is bounded in size and stable for prompt usage.
 * Decisions: readme is optional; user profile/repo fetches are required.
 */

import { HTTPException } from 'hono/http-exception'

import type { OracleSignals } from '@verokodo/shared'

type GitHubUser = {
  login: string
  name: string | null
  followers: number
  public_repos: number
}

type GitHubRepo = {
  name: string
  language: string | null
  pushed_at: string
}

const GITHUB_API = 'https://api.github.com'

function githubHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'verokodo-oracle'
  }
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: githubHeaders() })

  if (response.status === 404) {
    throw new HTTPException(404, { message: 'GitHub user not found.' })
  }

  if (!response.ok) {
    throw new HTTPException(502, {
      message: `GitHub API failed with status ${response.status}.`
    })
  }

  return (await response.json()) as T
}

async function fetchProfileReadme(username: string): Promise<string | null> {
  const response = await fetch(`${GITHUB_API}/repos/${username}/${username}/readme`, {
    headers: {
      ...githubHeaders(),
      Accept: 'application/vnd.github.raw+json'
    }
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new HTTPException(502, {
      message: `GitHub README fetch failed with status ${response.status}.`
    })
  }

  const raw = await response.text()
  const compact = raw.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  return compact.length > 0 ? compact.slice(0, 500) : null
}

function topLanguagesFromRepos(repos: GitHubRepo[]): string[] {
  const counter = new Map<string, number>()

  for (const repo of repos) {
    if (!repo.language) continue
    counter.set(repo.language, (counter.get(repo.language) ?? 0) + 1)
  }

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([language]) => language)
}

export async function fetchGitHubSignals(username: string): Promise<OracleSignals> {
  const [user, repos, readmeExcerpt] = await Promise.all([
    readJson<GitHubUser>(`${GITHUB_API}/users/${username}`),
    readJson<GitHubRepo[]>(`${GITHUB_API}/users/${username}/repos?per_page=60&sort=updated`),
    fetchProfileReadme(username)
  ])

  const recentRepoNames = repos
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, 8)
    .map((repo) => repo.name)

  return {
    profileName: user.name,
    followers: user.followers,
    publicRepos: user.public_repos,
    topLanguages: topLanguagesFromRepos(repos),
    recentRepoNames,
    readmeExcerpt
  }
}
