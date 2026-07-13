const cto = require('./cto');
const cfo = require('./cfo');
const ciso = require('./ciso');
const product = require('./product');
const legal = require('./legal');
const devilAdvocate = require('./devilAdvocate');
const historian = require('./historian');
const moderator = require('./moderator');

// The active board members (excluding Historian, Devil's Advocate, and Moderator, as they have special placement in the loop)
const boardMembers = [cto, cfo, ciso, product, legal];

module.exports = {
    boardMembers,
    historian,
    devilAdvocate,
    moderator
};
