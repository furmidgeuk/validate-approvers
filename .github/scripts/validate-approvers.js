module.exports = async ({ github, context, core }) => {
  const OWNER = context.repo.owner;
  const REPO = context.repo.repo;
  const PR_NUMBER = context.payload.pull_request.number;
  const COMMENT_MARKER = `<!-- APPROVAL_SUMMARY_COMMENT -->`;
  const teamsConfig = JSON.parse(process.env.teams);

  console.log(`Debug - PR Number: ${PR_NUMBER}`);
  console.log(`Debug - Teams config: ${JSON.stringify(teamsConfig)}`);

  async function getTeamMembers(teamSlug) {
    try {
      const members = await github.rest.teams.listMembersInOrg({
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
      const reviews = await github.rest.pulls.listReviews({
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
      const { data: comments } = await github.rest.issues.listComments({
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

  async function upsertComment(body) {
    const existingComment = await findExistingComment();

    try {
      if (existingComment) {
        // Update the existing comment
        await github.rest.issues.updateComment({
          owner: OWNER,
          repo: REPO,
          comment_id: existingComment.id,
          body,
        });
      } else {
        // Create a new comment
        await github.rest.issues.createComment({
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

  try {
    const reviews = await getPRReviews(PR_NUMBER);
    let approvalCounts = {};
    let teamApprovers = {};
    let summaryLines = [];

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
      const approvers = teamApprovers[name].join(', ') || 'None';
      const status = received >= approvals ? "✅ Sufficient" : "❌ Insufficient";

      const line = `**Team:** ${name} | **Required:** ${approvals} | **Received:** ${received} | **Approvers:** ${approvers} | **Status:** ${status}`;
      summaryLines.push(line);

      if (received < approvals) {
        core.setFailed(`Requires at least ${approvals} approvals from ${name}. Currently: ${received}`);
      }
    }

    // Construct the comment body with the marker for identification
    const commentBody = `${COMMENT_MARKER}\n### PR Approval Summary\n\n${summaryLines.join('\n')}`;

    // Upsert the comment
    await upsertComment(commentBody);

  } catch (error) {
    console.error('Error in validation script:', error);
    core.setFailed(`Error validating approvers: ${error.message}`);
  }
};
