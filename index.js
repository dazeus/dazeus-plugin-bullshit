require('js-methods');
var dazeus = require("dazeus");

// some constants and messages
var BULLSHIT = 'bullshit';
var ADD = 'add';
var REMOVE = 'remove';
var NOUN = 'noun';
var VERB = 'verb';
var ADJECTIVE = 'adjective';

var NOUNS = 'data/nouns.txt';
var VERBS = 'data/verbs.txt';
var ADJECTIVES = 'data/adjectives.txt';

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

var client = dazeus.connect(options, function () {
    client.onCommand(BULLSHIT, function (network, user, channel, command, args, action) {
        if (typeof action !== 'undefined') {
            var commandExecuted = false;

            if (addTry(NOUN, NOUNS, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (addTry(VERB, VERBS, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (addTry(ADJECTIVE, ADJECTIVES, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (removeTry(NOUN, NOUNS, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (removeTry(VERB, VERBS, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (removeTry(ADJECTIVE, ADJECTIVES, args, client, network, channel, user)) {
                commandExecuted = true;
            }

            if (!commandExecuted) {
                client.reply(
                    network,
                    channel,
                    user,
                    "Use }bullshit [" + ADD + ", " + REMOVE +
                    "] [" + VERB + ", " + ADJECTIVE + ", " + NOUN +
                    "] [word]"
                );
            }
        } else {
            var verb = dazeus.randomFrom(VERBS);
            var noun = dazeus.randomFrom(NOUNS);
            var adj = dazeus.randomFrom(ADJECTIVES);
            client.reply(network, channel, user, verb + ' ' + adj + ' ' + noun, false);
        }
    });
});

/** Check if this is a certain type of add, and if so: execute it */
var addTry = function (what, file, args, client, network, channel, user) {
    var ret = false;
    dazeus.isCommand([ADD, what], args, function (word) {
        if (word.trim().length > 0) {
            ret = true;
            if (dazeus.appendTo(file, word)) {
                client.reply(network, channel, user, "Added " + word + " to " + what + "s");
            } else {
                client.reply(network, channel, user, "Already exists");
            }
        }
    });
    return ret;
};

/** Check if this is a certain type of remove, and if so: execute it */
var removeTry = function (what, file, args, client, network, channel, user) {
    var ret = false;
    dazeus.isCommand([REMOVE, what], args, function (word) {
        if (word.trim().length > 0) {
            ret = true;
            if (dazeus.removeFrom(file, word)) {
                client.reply(network, channel, user, "Removed " + word + " from " + what + "s");
            } else {
                client.reply(network, channel, user, "Doesn't exist");
            }
        }
    });
    return ret;
};
