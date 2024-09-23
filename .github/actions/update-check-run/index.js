const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const status = core.getInput("status", { required: true });
    const conclusion = core.getInput("conclusion");
    const detailsUrl = core.getInput("details-url");
    const checkName = "CCTP E2E Tests";

    const octokit = github.getOctokit(token);
    const context = github.context;
    const { owner, repo } = context.repo;

    let pull_number, head_sha;

    if (context.eventName === "issue_comment") {
      pull_number = context.issue.number;
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
      });
      head_sha = pr.head.sha;
    } else if (context.eventName === "pull_request_review") {
      pull_number = context.payload.pull_request.number;
      head_sha = context.payload.pull_request.head.sha;
    } else {
      core.setFailed("Unexpected event type");
      return;
    }

    // Get all check runs for the current SHA
    const { data: allCheckRuns } = await octokit.rest.checks.listForRef({
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
      details_url: detailsUrl,
    };

    if (allCheckRuns[0]) {
      // Update existing check run
      await octokit.rest.checks.update({
        check_run_id: allCheckRuns[0].id,
        ...checkRunData,
      });
    } else {
      // Create new check run
      await octokit.rest.checks.create(checkRunData);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
