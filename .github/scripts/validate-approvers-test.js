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

async function getPRReviews(prNumber) {
  try {
    const reviews = await prOctokit.rest.pulls.listReviews({
      owner: OWNER,
      repo: REPO,
      pull_number: prNumber,
    });
    return reviews.data.filter(review => review.state === 'APPROVED');
  } catch (error) {
    console.error(`Error fetching PR reviews:`, error.message);
    return [];
  }
}

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
    const reviews = await getPRReviews(PR_NUMBER);

    if (baseBranch === 'SME-Approval') {
      const smeTeam = teamsConfig[0].name;
      const smeApprovalsRequired = 2;

      const smeApprovals = reviews.filter(review => review.user.login && review.user.login.includes(smeTeam)).length;

      if (smeApprovals >= smeApprovalsRequired) {
        console.log(`SME review complete with ${smeApprovals} approvals. Notifying QA team.`);
        await notifyNextStage(teamsConfig[1].name);
      } else {
        core.setFailed(`SME review requires ${smeApprovalsRequired} approvals. Currently received: ${smeApprovals}`);
      }

    } else if (baseBranch === 'QA-Approval') {
      const smeTeam = teamsConfig[0].name;
      const smeApprovalsRequired = 2;

      const smeReviews = await getPRReviews(PR_NUMBER);
      const smeApprovals = smeReviews.filter(review => review.user.login && review.user.login.includes(smeTeam)).length;

      if (smeApprovals < smeApprovalsRequired) {
        core.setFailed(`Cannot proceed to QA. SME review requires ${smeApprovalsRequired} approvals. Currently received: ${smeApprovals}`);
      } else {
        console.log('QA review complete. Ready to merge to main.');
      }
    } else {
      console.log('No action required for this branch.');
    }

  } catch (error) {
    console.error('Error in main function:', error.message);
    core.setFailed(`Error: ${error.message}`);
  }
}

main();
