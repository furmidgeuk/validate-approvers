const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');
const github = require('@actions/github');

const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
const PR_NUMBER = github.context.payload.pull_request.number;
const teamsConfig = JSON.parse(process.env.teams);
const PR_TOKEN = process.env.PR_TOKEN;

console.log(`Debug - PR Number: ${PR_NUMBER}`);
console.log(`Debug - Teams config: ${JSON.stringify(teamsConfig)}`);

const prOctokit = new Octokit({ auth: PR_TOKEN });

async function notifyNextStage(teamSlug) {
  try {
    const message = `Approval complete. Next stage review requested from the ${teamSlug} team.`;
    await prOctokit.rest.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number: PR_NUMBER,
      body: message,
    });
    console.log(`Notification sent to team: ${teamSlug}`);
  } catch (error) {
    console.error('Error posting notification comment:', error.message);
  }
}

async function main() {
  try {
    const baseBranch = github.context.payload.pull_request.base.ref;

    if (baseBranch === 'SME-Approval') {
      console.log('SME review complete. Notifying QA team.');
      await notifyNextStage(teamsConfig[1].name);
    } else if (baseBranch === 'QA-Approval') {
      console.log('QA review complete. Ready to merge to main.');
    } else {
      console.log('No action required for this branch.');
    }

  } catch (error) {
    console.error('Error in main function:', error.message);
    core.setFailed(`Error: ${error.message}`);
  }
}

main();
