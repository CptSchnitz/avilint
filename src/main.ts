/* eslint-disable no-undef */
import * as core from '@actions/core';
import {context, getOctokit} from '@actions/github';
import * as glob from '@actions/glob';
import {promises as fsPromises} from 'fs';
import table from 'markdown-table';

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
  const patterns = core.getInput('GLOBS').split(',').join('\n');
  core.debug(`pattern ares: ${patterns}`);
  const globber = await glob.create(patterns);
  const files = await globber.glob();
  // for await (const file of globber.globGenerator()) {
  // }
  const regex = new RegExp(/^\/\* eslint-disable (?<avi>.*) \*\/$/, 'g');
  const promises = files.map(async file => {
    core.debug(`working on ${file}`);
    const content = (await fsPromises.readFile(file)).toString();
    let array: RegExpExecArray | null;
    const result: string[] = [];

    while ((array = regex.exec(content))) {
      if (!array || !array.groups) {
        break;
      }
      result.push(array.groups['avi']);
    }
    core.debug(`rules are ${result}`);
    return {file, rules: result};
  });

  const content = (await Promise.all(promises))
    .filter(m => m.rules.length > 0)
    .map(m => [m.file, m.rules.join(',')]);
  core.debug(JSON.stringify(content));
  const res = table([['file', 'rules'], ...content]);

  // Create a comment on PR
  // https://octokit.github.io/rest.js/#octokit-routes-issues-create-comment
  const response = await octoKit.issues.createComment({
    owner,
    repo,
    // eslint-disable-next-line @typescript-eslint/camelcase
    issue_number: pr.number,
    body: res
  });
  core.debug(`created comment URL: ${response.data.html_url}`);
  core.debug('Wrote a comment successfully');
}

run().catch(() => {
  core.setFailed(':(');
});
