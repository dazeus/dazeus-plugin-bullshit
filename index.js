require('js-methods');
var dazeus = require("dazeus");
var fs = require('fs');

var NOUNS = 'data/nouns.txt';
var VERBS = 'data/verbs.txt';
var ADJECTIVES = 'data/adjectives.txt';

var client = dazeus.connect({path: '/tmp/dazeus.sock'}, function () {
    client.onCommand('bullshit', function (network, user, channel, command, args, action, what, word) {
        args = args.trim();
        if (typeof action !== 'undefined' && typeof what !== 'undefined' && typeof word !== 'undefined') {
            var file = '';
            if (what === 'verb') {
                file = VERBS;
            } else if (what === 'noun') {
                file = NOUNS;
            } else if (what === 'adjective') {
                file = ADJECTIVES;
            }

            if (file.length > 0) {
                var rest = objToArray(arguments);
                rest.splice(0, 7);
                word = rest.join(' ');

                if (action === 'add') {
                    if (append(word, file)) {
                        client.reply(network, channel, user, "Added " + word + " to " + what + "s");
                    } else {
                        client.reply(network, channel, user, "Already exists");
                    }
                } else if (action === 'remove') {
                    if (remove(word, file)) {
                        client.reply(network, channel, user, "Removed " + word + " from " + what + "s");
                    } else {
                        client.reply(network, channel, user, "Doesn't exist");
                    }
                } else {
                    client.reply(network, channel, user, "Use }bullshit add [verb,adjective,noun] [word]");
                }
            } else {
                client.reply(network, channel, user, "Use }bullshit add [verb,adjective,noun] [word]");
            }
        } else {
            if (typeof action === 'undefined' && typeof what === 'undefined' && typeof word === 'undefined') {
                var verb = randomFrom(VERBS);
                var noun = randomFrom(NOUNS);
                var adj = randomFrom(ADJECTIVES);

                client.reply(
                    network,
                    channel,
                    user,
                    verb + ' ' + adj + ' ' + noun,
                    false
                );
            } else {
                client.reply(network, channel, user, "Use }bullshit add [verb,adjective,noun] [word]");
            }
        }
    });
});

var randomFrom = function (file) {
    var array = readFile(file);
    return array[Math.floor(Math.random() * array.length)];
};

var readFile = function (file) {
    var fs = require('fs');
    return fs.readFileSync(file).toString().split("\n").filter(function (element) {
        return element.trim().length > 0;
    });
};

var writeFile = function (data, file) {
    var stream = fs.createWriteStream(file, {flags: 'w'});
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            if (typeof data[i] === 'string') {
                stream.write(data[i] + "\n");
            }
        }
    }
    stream.end();
};

var append = function (word, file) {
    var array = readFile(file);
    if (exists(word, file)) {
        return false;
    } else {
        array.push(word);
        writeFile(array, file);
        return true;
    }
};

var remove = function (word, file) {
    var array = readFile(file);
    if (!exists(word, array)) {
        return false;
    } else {
        array = array.filter(function (elem) {
            return elem !== word;
        });
        writeFile(array, file);
        return true;
    }
};

var exists = function (word, file) {
    if (typeof file === 'string') {
        file = readFile(file);
    }
    return file.inArray(word);
};

var objToArray = function (obj) {
    var data = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            data.push(obj[key]);
        }
    }
    return data;
};
