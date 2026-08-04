const fs = require('fs');
const path = require('path');

const targetRepos = [
  'HKUDS__Vibe-Trading.json',
  'gabime__spdlog.json',
  'alibaba__page-agent.json',
  'BloopAI__vibe-kanban.json',
  'OtterMind__Chat2DB.json',
  'jenkinsci__jenkins.json',
  'ATH-MaaS__Pixelle-Video.json',
  'AIDC-AI__Pixelle-Video.json',
  'Anil-matcha__Open-Generative-AI.json',
  'iOfficeAI__OfficeCLI.json',
  '2025Emma__vibe-coding-cn.json',
  'block__buzz.json',
  'yorukot__superfile.json',
  'Nutlope__hallmark.json',
  'hasaneyldrm__exercises-dataset.json',
  'alibaba__open-code-review.json',
  'C4illin__ConvertX.json',
  'ayghri__i-have-adhd.json',
  'pingdotgg__t3code.json',
  'Robbyant__lingbot-map.json'
];

for (const repo of targetRepos) {
  const filePath = path.join('data/repos', repo);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`Repo: ${repo}`);
  console.log(`Topics: ${data.topics ? data.topics.join(', ') : 'none'}`);
  console.log(`Description: ${data.description || 'none'}`);
  console.log(`\nREADME EXCERPT:\n${data.readmeExcerpt ? data.readmeExcerpt.substring(0, 500) : 'none'}`);
}
