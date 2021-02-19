// /* eslint-disable no-undef */
import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import * as glob from '@actions/glob';

async function run(): Promise<void> {
  const pr = context.payload.pull_request;
  if (!pr) {
    core.setFailed('github.context.payload.pull_request not exist');
    return;
  }

  const octoKit = getOctokit(core.getInput('GITHUB_TOKEN'));

  // Get owner and repo from context
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pattern = '**/*.js';
  const globber = await glob.create(pattern);
  const files = await globber.glob();

  // Create a comment on PR
  // https://octokit.github.io/rest.js/#octokit-routes-issues-create-comment
  const response = await octoKit.issues.createComment({
    owner,
    repo,
    // eslint-disable-next-line @typescript-eslint/camelcase
    issue_number: pr.number,
    body: files.join('\n')
  });
  core.debug(`created comment URL: ${response.data.html_url}`);
  core.debug('Wrote a comment successfully');
}

run().catch(() => {core.setFailed(':(')});