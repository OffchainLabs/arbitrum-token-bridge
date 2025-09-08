import { context, getOctokit } from '@actions/github'
import { Issue } from './schemas'

const github = getOctokit(process.env.GITHUB_TOKEN || '')

export const getIssue = async (issueNumber: string): Promise<Issue> => {
  const response = await github.rest.issues.get({
    ...context.repo,
    issue_number: Number(issueNumber)
  })
  return response.data as Issue
}
