const { Shoukaku } = require('shoukaku');
console.log('Shoukaku class available:', !!Shoukaku);
const shoukaku = new Shoukaku({ on: () => {} }, [], {});
console.log('joinChannel exists:', typeof shoukaku.joinChannel);
console.log('Shoukaku methods:', Object.keys(shoukaku));
