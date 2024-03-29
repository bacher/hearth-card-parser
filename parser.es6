
const fs = require('fs');
const request = require('request');

const REQUEST_TIMEOUT = 200;
const REPEAT_TIMEOUT = 1000;

var ok = true;
var urls = [];
var cards = {};
var ends = 0;


// 4 5 7
processPage(4, 1);


function processPage(type, page) {
    const url = `http://www.hearthpwn.com/cards?display=1&filter-premium=1&filter-type=${type}&page=${page}`;

    console.log('Page %s', page);

    request(url, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            setTimeout(() => {
                processPage(type, page);
            }, REPEAT_TIMEOUT);

        } else {
            urls = urls.concat(parseList(body));

            if (body.indexOf('rel="next">Next</a>') !== -1) {
                setTimeout(() => {
                    processPage(type, page + 1);
                }, REQUEST_TIMEOUT);

            } else {
                processCard(0);
            }
        }
    });
}

function parseList(html) {
    const lines = html.split(/[\r\n]+/);

    const urls = [];

    for (var i = 1000, count = lines.length; i < count; ++i) {
        var line = lines[i];

        if (line.indexOf('manual-data-link') !== -1) {
            const match = line.trim().match(/<a class="[^"]*manual-data-link[^"]*" href="([^"]+)"[^>]*>[^<]+<\/a>/);

            urls.push(match[1]);
        }
    }

    return urls;
}

function processCard(index, isRepeat) {
    const url = urls[index];

    if (url) {
        console.log('%s %s of %s', isRepeat ? 'Repeat' : 'Card', index, urls.length);

        request('http://www.hearthpwn.com' + url, (error, response, body) => {
            if (error || response.statusCode !== 200) {
                setTimeout(() => {
                    processCard(index, true);
                }, REPEAT_TIMEOUT);

            } else {
                const card = parseCard(body);

                cards[card.name] = card.uses;

                setTimeout(() => {
                    processCard(index + 1);
                }, REQUEST_TIMEOUT);
            }
        });

    } else {
        fs.writeFileSync('uses.json', JSON.stringify(cards, null, 2).replace(/&#x27;/g, "'"));
    }
}

function parseCard(html) {
    const nameMatch = html.substr(0, 1000).match(/<title>(.+) - Hearthstone Cards.?<\/title>/);

    const usesMatch = html.match(/Used in ([\d\.]+)% of/);

    return {
        name: nameMatch[1],
        uses: usesMatch[1]
    };
}

