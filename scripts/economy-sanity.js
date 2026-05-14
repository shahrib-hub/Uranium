const path = require('path');

const modules = [
  '../src/economy/runtimeItems',
  '../src/economy/service',
  '../src/economy/handlers/earnHandler',
  '../src/economy/handlers/earnHandler2',
  '../src/economy/handlers/funHandler',
  '../src/economy/adventureEngine',
  '../src/events/interactionCreateEconomy',
  '../src/commands/Economy/eco'
];

for (const target of modules) {
  require(path.resolve(__dirname, target));
  console.log(`loaded ${target}`);
}

const { validateItemRegistry, getItemPrimaryAction } = require('../src/economy/service');
const { getAllRuntimeItems } = require('../src/economy/runtimeItems');

const issues = validateItemRegistry();
if (issues.length) {
  console.error('Item registry issues found:');
  for (const issue of issues) {
    console.error(`- ${issue.id}: ${issue.issue}`);
  }
  process.exitCode = 1;
} else {
  console.log('item registry validated');
}

for (const item of getAllRuntimeItems()) {
  const action = getItemPrimaryAction(item);
  if (!action || !action.mode || !action.label) {
    console.error(`missing primary action for ${item.id}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log('primary actions validated');
}
