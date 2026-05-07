
const { Rainlink, Library } = require('rainlink');

async function test() {
    const rainlink = new Rainlink({
        library: new Library.DiscordJS({ on: () => {} }),
        nodes: [{ host: 'lavalinkv4.serenetia.com', port: 443, auth: 'https://seretia.link/discord', secure: true }],
        options: { defaultSearchEngine: 'youtube' }
    });

    try {
        console.log('Searching for "never gonna give you up"...');
        const res = await rainlink.search('never gonna give you up', { engine: 'youtube' });
        console.log('Found tracks:', res.tracks.length);
        if (res.tracks.length > 0) {
            console.log('First track:', res.tracks[0].title, 'by', res.tracks[0].author);
        }
    } catch (e) {
        console.error('Search failed:', e);
    }
}

test();
