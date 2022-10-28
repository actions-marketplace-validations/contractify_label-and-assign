import * as core from "@actions/core";
import * as github from "@actions/github";

import * as common from "./common/common";
import * as helpers from "./common/helpers";
import { runLabeler } from "./labeler/labeler";
import { runAssigner } from "./assigner/assigner";
import { runOwner } from "./owner/owner";

export async function run() {
  if (github.context.actor === "dependabot[bot]") {
    core.info(`🚨 Dependabot, ignoring`);
    return;
  }

  const token = core.getInput("token", { required: true });
  const configPath = core.getInput("configuration-path", { required: true });
  const githubClient: common.ClientType = github.getOctokit(token);

  const pr = await helpers.getPullRequest(githubClient);
  if (!pr?.prNumber) {
    core.warning("⚠️ Could not get pull request number, exiting");
    return;
  }

  const branchName = helpers.getBranchName();
  core.info(`📄 Context details`);
  core.info(`    Branch name: ${branchName}`);

  if (branchName.startsWith("dependabot")) {
    core.info(`🚨 Dependabot, ignoring`);
    return;
  }

  core.info(`📄 Pull request number: ${pr.prNumber}`);

  core.info(`🏭 Running labeler for ${pr.prNumber}`);
  await runLabeler(githubClient, configPath, pr.prNumber);

  if (pr.draft) {
    core.info(`🏭 Skipping assigner for ${pr.prNumber} (draft)`);
  } else {
    core.info(`🏭 Running assigner for ${pr.prNumber}`);
    await runAssigner(githubClient, configPath, pr.prNumber);
  }

  core.info(`🏭 Running owner for ${pr.prNumber}`);
  await runOwner(githubClient, pr.prNumber);

  core.info(`📄 Finished for pull request ${pr.prNumber}`);
}

run();
