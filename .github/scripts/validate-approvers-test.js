const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');
const github = require('@actions/github');

const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
const PR_NUMBER = github.context.payload.pull_request.number;
const COMMENT_MARKER = `<!-- APPROVAL_SUMMARY_COMMENT -->`;
const STAGE_MARKER = `<!-- APPROVAL_STAGE_MARKER -->`;
const teamsConfig = JSON.parse(process.env.teams);
const APP_TOKEN = process.env.APP_TOKEN;
const PR_TOKEN = process.env.PR_TOKEN;

console.log(`Debug - PR Number: ${PR_NUMBER}`);
console.log(`Debug - Teams config: ${JSON.stringify(teamsConfig)}`);

const appOctokit = new Octokit({ auth: APP_TOKEN });
const prOctokit = new Octokit({ auth: PR_TOKEN });

async function getTeamMembers(teamSlug) {
  try {
    const members = await appOctokit.rest.teams.listMembersInOrg({
      org: OWNER,
      team_slug: teamSlug,
    });
    return members.data.map(member => member.login);
  } catch (error) {
    console.error(`Error fetching team members for ${teamSlug}:`, error.message);
    return [];
  }
}

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

async function findExistingComment() {
  try {
    const { data: comments } = await prOctokit.rest.issues.listComments({
      owner: OWNER,
      repo: REPO,
      issue_number: PR_NUMBER,
    });
    return comments.find(comment => comment.body.includes(COMMENT_MARKER));
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    return null;
  }
}

async function findStageMarker() {
  try {
    const { data: comments } = await prOctokit.rest.issues.listComments({
      owner: OWNER,
      repo: REPO,
      issue_number: PR_NUMBER,
    });
    const stageComment = comments.find(comment => comment.body.includes(STAGE_MARKER));
    if (stageComment) {
      const match = stageComment.body.match(/Stage: (\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    }
    return 1;
  } catch (error) {
    console.error('Error fetching stage marker:', error.message);
    return 1;
  }
}

async function upsertComment(body) {
  try {
    const existingComment = await findExistingComment();

    if (existingComment) {
      await prOctokit.rest.issues.updateComment({
        owner: OWNER,
        repo: REPO,
        comment_id: existingComment.id,
        body,
      });
    } else {
      await prOctokit.rest.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: PR_NUMBER,
        body,
      });
    }
  } catch (error) {
    console.error('Error posting/updating comment:', error.message);
    core.setFailed(`Error posting/updating comment: ${error.message}`);
  }
}

async function updateStage(stage) {
  const body = `${STAGE_MARKER}\nStage: ${stage}`;
  await upsertComment(body);
}

async function requestReviewersForSecondTeam() {
  const secondTeam = teamsConfig[1];
  const members = await getTeamMembers(secondTeam.name);

  if (members.length > 0) {
    try {
      console.log(`Requesting review from ${secondTeam.name}: ${members.join(', ')}`);
      await prOctokit.rest.pulls.requestReviewers({
        owner: OWNER,
        repo: REPO,
        pull_number: PR_NUMBER,
        reviewers: members,
      });
      console.log(`Review request sent to ${secondTeam.name}`);
    } catch (error) {
      console.error(`Error requesting reviewers for ${secondTeam.name}:`, error.message);
    }
  } else {
    console.log(`No members found for the ${secondTeam.name} team.`);
  }
}

async function main() {
  try {
    const stage = await findStageMarker();
    const reviews = await getPRReviews(PR_NUMBER);
    let approvalCounts = {};
    let teamApprovers = {};

    for (const team of teamsConfig) {
      approvalCounts[team.name] = 0;
      teamApprovers[team.name] = [];
    }

    for (const team of teamsConfig) {
      const members = await getTeamMembers(team.name);
      for (const review of reviews) {
        if (members.includes(review.user.login)) {
          approvalCounts[team.name]++;
          teamApprovers[team.name].push(review.user.login);
        }
      }
    }

    if (stage === 1) {
      const firstTeam = teamsConfig[0];
      const received = approvalCounts[firstTeam.name];

      if (received >= firstTeam.approvals) {
        await updateStage(2);
        await requestReviewersForSecondTeam();
        console.log(`Stage 1 complete. Moving to ${teamsConfig[1].name} team for review.`);
      } else {
        core.setFailed(`Stage 1: Requires ${firstTeam.approvals} approvals from ${firstTeam.name}. Currently: ${received}`);
      }

    } else if (stage === 2) {
      const secondTeam = teamsConfig[1];
      const received = approvalCounts[secondTeam.name];

      if (received >= secondTeam.approvals) {
        console.log(`Stage 2 complete. All approvals met.`);
      } else {
        core.setFailed(`Stage 2: Requires ${secondTeam.approvals} approvals from ${secondTeam.name}. Currently: ${received}`);
      }
    }

  } catch (error) {
    console.error('Error in main function:', error.message);
    core.setFailed(`Error: ${error.message}`);
  }
}

main();
