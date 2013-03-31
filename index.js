#!/usr/bin/env node

var _ = require('underscore');
var dazeus = require('dazeus');
var csv = require('csv');
var fs = require('fs');
var util = require('util');
var prettybnf = require('prettybnf');

// some constants and messages
var BULLSHIT = 'bullshit';
var ABOUT = 'about';
var LEARN = 'learn';
var ALIAS = 'alias';
var TO = 'to';
var FORGET = 'forget';
var HELP = 'help';
var ANYTHING = 'anything';
var EVERYTHING = 'everything';

var NOT_EXISTS = "Sorry, I don't know any bullshit about %s";

var NAMESFILE = './data/names.txt';
var ALLCORPUS = './data/all.txt';
var CORPORA = './data/corpora/';
var GRAMMARS = './data/grammars/';
var CORPUSEXT = '.txt';

var BLACKLISTED = [EVERYTHING, ANYTHING];

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

var client = dazeus.connect(options, function () {
    var showHelp = function (network, channel, user, about) {
        var message;

        if (typeof about === 'undefined' || about === null || about.length === 0) {
            message = "Get help about specific topics: `{CMD} help [topic]`. Available topics: about, learn, forget, alias";
        } else {
            switch (about) {
                case LEARN:
                    message = "Use `{CMD} learn [type] [word] about [topic]`";
                    break;
                case FORGET:
                    message = "Use `{CMD} forget [type] [word] about [topic]` or `{CMD} forget [word] about [topic]` or `{CMD} forget [word]`";
                    break;
                case ABOUT:
                    message = "Use `{CMD} about [topic]` to get some bullshit about [topic], or use `{CMD}` to get bullshit about a random topic";
                    break;
                case ALIAS:
                    message = "Use `{CMD} alias [topic1] to [topic2]`";
                    break;
                default:
                    message = "I haven't got anything to say about that help topic";
                    break;
            }
        }

        client.insertCommand(message, BULLSHIT, function (msg) {
            client.reply(network, channel, user, msg);
        });
    };

    var bullshitAbout = function (network, channel, user, aboutWhat) {
        if (aboutWhat.length === 0) {
            aboutWhat = ANYTHING;
        }

        if (aboutWhat === ANYTHING) {
            everythingRandomSentence(function (sentence) {
                client.reply(network, channel, user, sentence, false);
            });
        } else {
            randomSentenceFromCorpus(aboutWhat, function (sentence, exists) {
                if (exists) {
                    client.reply(network, channel, user, sentence, false);
                } else {
                    client.reply(network, channel, user, util.format(NOT_EXISTS, aboutWhat));
                }
            });
        }
    };

    var learnBullshit = function (network, channel, user, type, word, aboutWhat) {
        addToCorpus(aboutWhat === EVERYTHING ? null : aboutWhat, type, word, function (success) {
            if (success) {
                client.reply(network, channel, user, util.format('Added %s (type %s) to %s', word, type, aboutWhat));
            } else {
                client.reply(network, channel, user, "Already exists");
            }
        });
    };

    var forgetBullshit = function (network, channel, user, type, word, aboutWhat) {
        if (aboutWhat === null) {
            removeEverywhere(type, word, function () {
                client.reply(network, channel, user, "Alright, removed word");
            });
        } else {
            removeFromCorpus(aboutWhat, type, word, function () {
                client.reply(network, channel, user, "Alright, removed word");
            });
        }
    };

    var aliasTopic = function (network, channel, user, from, to) {
        addCorpusAlias(from, to, function (success) {
            if (success) {
                client.reply(network, channel, user, util.format('Made alias from %s to %s', from, to));
            } else {
                client.reply(network, channel, user, util.format('Could not make alias from %s to %s', from, to));
            }
        });
    };

    client.onCommand(BULLSHIT, function (network, user, channel, command, args) {
        if (typeof args === 'undefined' || args === null || args.trim().length === 0) {
            args = util.format('%s %s', ABOUT, ANYTHING);
        }

        action = dazeus.firstArgument(args);
        args = action[1];
        action = action[0];
        switch (action) {
            case ABOUT:
                bullshitAbout(network, channel, user, args.trim());
                break;
            case LEARN:
                dazeus.isCommand(['$', '$', ABOUT, '$'], args, function (type, word, aboutWhat) {
                    learnBullshit(network, channel, user, type, word, aboutWhat);
                }, function () {
                    showHelp(network, channel, user, LEARN);
                });
                break;
            case FORGET:
                dazeus.isCommand(['$', '$', ABOUT, '$'], args, function (type, word, aboutWhat, rest) {
                    forgetBullshit(network, channel, user, type, word, aboutWhat);
                }, function () {
                    dazeus.isCommand(['$', ABOUT, '$'], args, function (word, aboutWhat) {
                        forgetBullshit(network, channel, user, null, word, aboutWhat);
                    }, function () {
                        dazeus.isCommand(['$', '$'], args, function (type, word) {
                            forgetBullshit(network, channel, user, type, word, null);
                        }, function () {
                            dazeus.isCommand(['$'], args, function (word) {
                                forgetBullshit(network, channel, user, null, word, null);
                            }, function () {
                                showHelp(network, channel, user, FORGET);
                            });
                        });
                    });
                });
                break;
            case ALIAS:
                dazeus.isCommand(['$', TO, '$'], args, function (from, to) {
                    aliasTopic(network, channel, user, from, to);
                }, function () {
                    showHelp(network, channel, user, ALIAS);
                });
                break;
            case HELP:
                showHelp(network, channel, user, args.trim());
                break;
            default:
                showHelp(network, channel, user);
                break;
        }
    });
});

var everythingRandomSentence = function (callback) {
    getRandomCorpus(function (corpusName) {
        randomSentenceFromCorpus(corpusName, callback);
    });
};

var randomSentenceFromCorpus = function (corpusName, callback) {
    getAndBuildCorpus(corpusName, function (corpus, exists) {
        var rules = randomGrammar();
        callback(generateSentence(corpus, rules), exists);
    });
};

var randomGrammar = function () {
    var files = _.filter(fs.readdirSync(GRAMMARS), function (name) {
        return name !== '.' && name !== '..';
    });
    return parseGrammar(GRAMMARS + files[Math.floor(Math.random() * files.length)]);
};

var handleTerminal = function (terminal, corpus) {
    var options;
    if (terminal.substr(0, 7) === 'choose=') {
        options = terminal.substr(7).split(';');
    } else {
        if (corpus[terminal]) {
            options = corpus[terminal];
        } else {
            options = [];
        }
    }

    if (options.length === 0) {
        return ' ' + util.format('error_no_%s_available', terminal);
    } else {
        return ' ' + options[Math.floor(Math.random() * options.length)];
    }
};

var parseGrammar = function (grammarFile) {
    var data = fs.readFileSync(grammarFile).toString();
    var ast = prettybnf.parse(data);
    var rules = {};
    ast.productions.forEach(function (prod) {
        rules[prod.lhs.text] = _.map(prod.rhs, function (item) { return item['terms']; });
    });
    return rules;
};

var generateSentence = function (corpus, rules, rule) {
    if (typeof rule === 'undefined' || rule === null) {
        rule = 'sentence';
    }

    var r = rules[rule];
    var selected = r[Math.floor(Math.random() * r.length)];
    return _.map(selected, function (item) { return completeItem(item, corpus, rules); }).join('').trim();
};

var completeItem = function (item, corpus, rules) {
    if (item.type === 'terminal') {
        return handleTerminal(item.text, corpus);
    } else {
        return generateSentence(corpus, rules, item.text);
    }
};

var getRandomCorpus = function (callback) {
    csv().from.path(NAMESFILE, {
        trim: true
    }).to.array(function (result) {
        callback(result[Math.floor(Math.random() * result.length)][0]);
    });
};

var getRandomAndBuildCorpus = function (callback) {
    getRandomCorpus(function (which) {
        getAndBuildCorpus(which, callback);
    });
};

var corpusFile = function (what, callback, n) {
    if (typeof n === 'undefined' || n === null) {
        n = 0;
    }

    if (n > 20) {
        callback(false);
    } else if (typeof what === 'undefined' || what === null || what.trim().length === 0 || what === EVERYTHING) {
        callback(ALLCORPUS);
    } else {
        var gotRecord = false;
        csv().from.path(NAMESFILE, {
            trim: true
        }).on('record', function (row, index) {
            if (what === row[0] && !gotRecord) {
                gotRecord = true;
                if (row[0] !== row[1]) {
                    // recurse, because it might be an alias of an alias
                    corpusFile(row[1], callback, n + 1);
                } else {
                    callback(CORPORA + row[1] + CORPUSEXT);
                }
            }
        }).on('end', function () {
            if (!gotRecord) {
                callback(false);
            }
        });
    }
};

var buildCorpus = function (lines) {
    var corpus = {};
    for (var i = 0; i < lines.length; i += 1) {
        var type = lines[i][0];
        var word = lines[i][1];
        if (typeof corpus[type] === 'undefined' || corpus[type] === null) {
            corpus[type] = [];
        }
        corpus[type].push(word);
    }
    return corpus;
};

var loadCorpusLines = function (file, addAll, callback) {
    if (typeof addAll === 'function') {
        callback = addAll;
        addAll = true;
    }

    var lines = [];
    var onRecord = function (record) {
        lines.push(record);
    };
    var onComplete = function (exists) {
        if (addAll) {
            csv().from.path(ALLCORPUS, {
                trim: true
            }).on('record', onRecord).on('end', function () {
                callback(lines, exists);
            });
        } else {
            callback(lines, exists);
        }
    };

    if (typeof file !== 'string') {
        onComplete(false);
    } else {
        fs.exists(file, function (ex) {
            if (ex) {
                csv().from.path(file, {
                    trim: true
                }).on('record', onRecord).on('end', function () {
                    onComplete(true);
                });
            } else {
                onComplete(false);
            }
        });
    }
};

var getAndBuildCorpus = function (name, callback) {
    corpusFile(name, function (file) {
        loadCorpusLines(file, function (lines, exists) {
            callback(buildCorpus(lines), exists);
        });
    });
};

var existsInCorpus = function (corpus, type, what, callback) {
    corpusFile(corpus, function (file) {
        if (file === false) {
            callback(false);
        } else {
            var found = false;
            csv().from.path(file, {
                trim: true
            }).on('record', function (record) {
                if ((record[0] === type || type === null) && record[1] === what && !found) {
                    found = true;
                    callback(true);
                }
            }).on('end', function () {
                if (!found) {
                    callback(false);
                }
            });
        }
    });
};

var addToCorpus = function (corpus, type, what, callback) {
    var updateCorpus = function (file) {
        fs.appendFile(file, util.format('"%s","%s"\n', escapeCsv(type), escapeCsv(what)), function () {
            callback(true);
        });
    };

    existsInCorpus(corpus, type, what, function (ex) {
        if (ex) {
            callback(false);
        } else {
            corpusFile(corpus, function (file) {
                if (file === false) {
                    addCorpusAlias(corpus, corpus, function (result, file) {
                        updateCorpus(file);
                    });
                } else {
                    updateCorpus(file);
                }
            });
        }
    });
};

var addCorpusAlias = function (alias, to, callback) {
    fs.readFile(NAMESFILE, function (err, result) {
        if (!err) {
            fs.writeFile(NAMESFILE, util.format('"%s","%s"\n', escapeCsv(alias), escapeCsv(to)) + result, function (err) {
                if (!err) {
                    fs.utimes(CORPORA + to + CORPUSEXT, new Date(), new Date(), function (err) {
                        callback(true, CORPORA + to + CORPUSEXT);
                    });
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    });
};

var escapeCsv = function (str) {
    return str.replace(/"/g, '\\"');
};

var removeFromCorpus = function (corpus, type, what, callback) {
    existsInCorpus(corpus, type, what, function (ex) {
        if (!ex) {
            callback(false);
        } else {
            corpusFile(corpus, function (file) {
                if (file !== false) {
                    csv().from.path(file, {
                        trim: true
                    }).transform(function (row) {
                        if ((row[0] === type || type === null) && row[1] === what) {
                            return null;
                        } else {
                            return row;
                        }
                    }).to.array(function (data) {
                        csv().from.array(data).to.path(file, {quoted: true}).on('end', function () {
                            callback(true);
                        });
                    });
                }
            });

        }
    });
};

var removeEverywhere = function (type, what, callback) {
    csv().from.path(NAMESFILE, {
        trim: true
    }).to.array(function (result) {
        result.push(EVERYTHING);
        _.each(result, function (corpus) {
            removeFromCorpus(corpus, type, what, function () {});
        });
        callback();
    }).transform(function (row) {
        if (row[0] === row[1]) {
            return row[0];
        } else {
            return null;
        }
    });
};
