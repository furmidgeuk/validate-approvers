module.exports = async ({ github, context, core }) => {
  const OWNER = context.repo.owner;
  const REPO = context.repo.repo;
  const PR_NUMBER = context.payload.pull_request.number;
  const teamsConfig = JSON.parse(process.env.teams);

  console.log(`Debug - PR Number: ${PR_NUMBER}`);
  console.log(`Debug - Teams config: ${JSON.stringify(teamsConfig)}`);

  async function getTeamMembers(teamSlug) {
    console.log(`Debug - Fetching members for team: ${teamSlug}`);
    try {
      const members = await github.rest.teams.listMembersInOrg({
        org: OWNER,
        team_slug: teamSlug,
      });
      console.log(`Debug - Team ${teamSlug} has ${members.data.length} members: ${members.data.map(m => m.login).join(', ')}`);
      return members.data.map(member => member.login);
    } catch (error) {
      console.error(`Error fetching team members for ${teamSlug}:`, error.message);
      return [];
    }
  }

  async function getPRReviews(prNumber) {
    console.log(`Debug - Fetching reviews for PR: ${prNumber}`);
    try {
      const reviews = await github.rest.pulls.listReviews({
        owner: OWNER,
        repo: REPO,
        pull_number: prNumber,
      });

      const approvedReviews = reviews.data.filter(review => review.state === 'APPROVED');
      console.log(`Debug - PR has ${reviews.data.length} reviews, ${approvedReviews.length} approved`);

      return approvedReviews;
    } catch (error) {
      console.error(`Error fetching PR reviews:`, error.message);
      return [];
    }
  }

  try {
    const reviews = await getPRReviews(PR_NUMBER);
    let approvalCounts = {};
    let teamApprovers = {};

    for (const team of teamsConfig) {
      const { name, approvals } = team;
      approvalCounts[name] = 0;
      teamApprovers[name] = [];
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

    console.log('Debug - Approval counts by team:');
    for (const team of teamsConfig) {
      const { name, approvals } = team;
      const received = approvalCounts[name];
      console.log(`Team: ${name}, Required: ${approvals}, Received: ${received}, Approvers: ${teamApprovers[name].join(', ')}`);

      if (received < approvals) {
        core.setFailed(`Requires at least ${approvals} approvals from ${name}. Currently: ${received}`);
      }
    }
  } catch (error) {
    console.error('Error in validation script:', error);
    core.setFailed(`Error validating approvers: ${error.message}`);
  }
};
