/* eslint-disable @typescript-eslint/no-explicit-any */

import { context, getOctokit } from "@actions/github";
import { Issue } from "./schemas";

const github = getOctokit(process.env.GITHUB_TOKEN || "");

const getIssue = async (issueNumber: string): Promise<Issue> => {
  const response = await github.rest.issues.get({
    ...context.repo,
    issue_number: Number(issueNumber),
  });
  return response.data as Issue;
};

const getContent = async (
  branchName: string,
  imageSavePath: string
): Promise<any> => {
  return github.rest.repos.getContent({
    ...context.repo,
    path: `packages/arb-token-bridge-ui/public/${imageSavePath}`,
    ref: branchName,
  });
};

export const updateContent = async (
  branchName: string,
  imageSavePath: string,
  imageBuffer: Buffer,
  sha?: string
) => {
  return github.rest.repos.createOrUpdateFileContents({
    ...context.repo,
    path: `packages/arb-token-bridge-ui/public/${imageSavePath}`,
    message: "Add new image",
    content: imageBuffer.toString("base64"),
    branch: branchName,
    sha: sha, // Include the sha if the file exists, undefined otherwise
  });
};

const createBranch = async (branchName: string): Promise<void> => {
  try {
    // Check if the branch already exists
    await github.rest.git.getRef({
      ...context.repo,
      ref: `heads/${branchName}`,
    });
    console.log(`Branch ${branchName} already exists. Using existing branch.`);
  } catch (error) {
    // If the branch doesn't exist, create it
    if ((error as any).status === 404) {
      await github.rest.git.createRef({
        ...context.repo,
        ref: `refs/heads/${branchName}`,
        sha: context.sha,
      });
      console.log(`Created new branch: ${branchName}`);
    } else {
      // If there's any other error, throw it
      throw error;
    }
  }
};

const commitChanges = async (
  branchName: string,
  targetJsonPath: string,
  fileContents: string
): Promise<void> => {
  // Convert the relative path to a repository-relative path
  const repoPath = targetJsonPath.replace(/^\.\.\//, "");

  try {
    const { data } = await github.rest.repos.getContent({
      ...context.repo,
      path: repoPath,
      ref: branchName,
    });

    await github.rest.repos.createOrUpdateFileContents({
      ...context.repo,
      path: repoPath,
      message: `Update ${repoPath} with new chain`,
      content: Buffer.from(fileContents).toString("base64"),
      sha: (data as { sha: string }).sha,
      branch: branchName,
    });
  } catch (error: any) {
    if (error.status === 404) {
      // File doesn't exist, create it
      await github.rest.repos.createOrUpdateFileContents({
        ...context.repo,
        path: repoPath,
        message: `Create ${repoPath} with new chain`,
        content: Buffer.from(fileContents).toString("base64"),
        branch: branchName,
      });
    } else {
      throw error;
    }
  }
};

const createPullRequest = async (
  branchName: string,
  chainName: string,
  issueUrl: string
): Promise<void> => {
  // Get the default branch of the repository
  const { data: repo } = await github.rest.repos.get({
    ...context.repo,
  });
  const defaultBranch = repo.default_branch;

  await github.rest.pulls.create({
    ...context.repo,
    title: `feat: add Orbit chain - ${chainName}`,
    head: branchName,
    base: defaultBranch,
    body: `Automated pull request to add ${chainName} to the bridge. Closes ${issueUrl}.`,
  });
};

export { commitChanges, createBranch, createPullRequest, getContent, getIssue };

export const saveImageToGitHub = async (
  branchName: string,
  imageSavePath: string,
  imageBuffer: Buffer
): Promise<void> => {
  try {
    // Check if the file already exists in the repository
    let sha: string | undefined;
    try {
      const { data } = await getContent(branchName, imageSavePath);

      if ("sha" in data) {
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, which is fine
      console.log(`File ${imageSavePath} doesn't exist in the repository yet.`);
    }

    // Update or create the file in the repository
    await updateContent(branchName, imageSavePath, imageBuffer, sha);
    console.log(`Successfully saved image to GitHub at ${imageSavePath}`);
  } catch (error) {
    console.error("Error saving image to GitHub:", error);
    throw error;
  }
};
