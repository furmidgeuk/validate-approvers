const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);
    const context = github.context;

    const teamsInput = core.getInput("teams");
    const teams = JSON.parse(teamsInput);

    const OWNER = context.repo.owner;
    const REPO = context.repo.repo;
    const PR_NUMBER = context.payload.pull_request.number;

    console.log(`Checking PR #${PR_NUMBER} in ${OWNER}/${REPO}`);

    // Fetch PR reviews
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner: OWNER,
      repo: REPO,
      pull_number: PR_NUMBER
    });

    console.log(`Found ${reviews.length} reviews.`);

    let approvalCounts = {};
    teams.forEach(team => {
      approvalCounts[team.team] = 0;
    });

    // Fetch team members and count approvals
    for (const review of reviews) {
      if (review.state !== "APPROVED") continue;

      for (const team of teams) {
        const members = await getTeamMembers(octokit, OWNER, team.team);
        if (members.includes(review.user.login)) {
          approvalCounts[team.team]++;
        }
      }
    }

    console.log("Approval Counts:", approvalCounts);

    // Validate approvals
    for (const team of teams) {
      const required = team.approvals;
      const received = approvalCounts[team.team];

      console.log(`Team: ${team.team}, Required: ${required}, Received: ${received}`);

      if (received < required) {
        core.setFailed(`Requires at least ${required} approvals from ${team.team}. Currently: ${received}`);
      }
    }

    core.setOutput("result", "Validation complete.");

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function getTeamMembers(octokit, owner, teamSlug) {
  try {
    const { data: members } = await octokit.rest.teams.listMembersInOrg({
      org: owner,
      team_slug: teamSlug,
    });
    return members.map(member => member.login);
  } catch (error) {
    console.error(`Error fetching members for team ${teamSlug}: ${error.message}`);
    return [];
  }
}

run();
