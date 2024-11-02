/* eslint-disable @typescript-eslint/no-explicit-any */

import { context, getOctokit } from "@actions/github";
import { Issue } from "./schemas";

const github = getOctokit(process.env.GITHUB_TOKEN || "");

export const getIssue = async (issueNumber: string): Promise<Issue> => {
  const response = await github.rest.issues.get({
    ...context.repo,
    issue_number: Number(issueNumber),
  });
  return response.data as Issue;
};

export const getContent = async (
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
