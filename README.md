# DaZeus Bullshit generator
Generates random bullshit about some topic by using a simple grammar and a list of words.

## Available commands
    bullshit

Generate some bullshit about a random topic, equivalent to `bullshit about anything`.


    bullshit about [what]

Generate some bullshit about a specific topic.


    bullshit learn [type] [word] about [what]

Learn some new bullshit about some topic.


    bullshit forget [type] [word] about [what]
    bullshit forget [word] about [what]
    bullshit forget [type] [word]
    bullshit forget [word]

These are used to forget bullshit from a number of different scopes.


    bullshit alias [what] to [what]

Alias some topic to another topic.

The special topics `anything` and `everything` exist. You can learn new bullshit for the `everything`
topic to let it show up in bullshit about any topic. You can use `anything` to get bullshit about
a random topic.

## Installing it

    npm install dazeus-plugin-bullshit

## Running it
To let this command run, simple execute this command in the root folder of the plugin

    node index

Several options are available, see the command line documentation for that:

    node index --help



