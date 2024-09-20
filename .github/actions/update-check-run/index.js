const core = require("@actions/core");
const github = require("@actions/github");

module.exports = async ({ github, context, core }, inputs) => {
  try {
    const token = inputs.token;
    const status = inputs.status;
    const conclusion = inputs.conclusion;
    const detailsUrl = inputs["details-url"];

    const octokit = github.getOctokit(token);
    const { owner, repo } = context.repo;

    let pull_number, head_sha;

    if (context.eventName === "issue_comment") {
      pull_number = context.issue.number;
    } else if (context.eventName === "pull_request_review") {
      pull_number = context.payload.pull_request.number;
    } else if (
      context.eventName === "push" ||
      context.eventName === "merge_group"
    ) {
      head_sha = context.sha;
    } else {
      core.setFailed("Unexpected event type");
      return;
    }

    if (!head_sha) {
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
      });
      head_sha = pr.head.sha;
    }

    const checkName = "CCTP E2E Tests";

    // Check if a check run already exists
    const { data: existingChecks } = await octokit.rest.checks.listForRef({
      owner,
      repo,
      ref: head_sha,
      check_name: checkName,
    });

    const checkRunData = {
      owner,
      repo,
      head_sha,
      name: checkName,
      status,
      conclusion: status === "completed" ? conclusion : undefined,
      output: {
        title:
          status === "in_progress"
            ? "CCTP E2E Tests In Progress"
            : "CCTP E2E Tests Result",
        summary:
          status === "in_progress"
            ? "The CCTP E2E tests have been triggered and are now running."
            : `The CCTP E2E tests have completed with status: ${conclusion}.`,
        text:
          status === "in_progress"
            ? "Tests are currently in progress. Results will be updated upon completion."
            : `For detailed information, please check the [workflow run](${detailsUrl}).`,
      },
    };

    if (existingChecks.check_runs.length > 0) {
      // Update existing check run
      await octokit.rest.checks.update({
        check_run_id: existingChecks.check_runs[0].id,
        ...checkRunData,
      });
    } else {
      // Create new check run
      await octokit.rest.checks.create(checkRunData);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};
