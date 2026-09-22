// src/dashboard/data/spotifyFeed.js
// Curated official Spotify Global Top 50, trending releases, and genre playlists with verified CDN artwork

const popularToday = [
  {
    id: 'sp_top_1',
    title: 'Die With A Smile',
    author: 'Lady Gaga & Bruno Mars',
    album: 'Die With A Smile - Single',
    duration: 251668,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/11/ae/f2/11aef294-f57c-bab9-c9fc-529162984e62/24UMGIM85348.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 1,
    streams: '1.2B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_2',
    title: 'Espresso',
    author: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    duration: 175459,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 2,
    streams: '1.4B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_3',
    title: 'BIRDS OF A FEATHER',
    author: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    duration: 210373,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 3,
    streams: '1.1B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_4',
    title: 'Taste',
    author: 'Sabrina Carpenter',
    album: 'Short n\' Sweet',
    duration: 157280,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f6/15/d0/f615d0ab-e0c4-575d-907e-1cc084642357/24UMGIM61704.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 4,
    streams: '780M',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_5',
    title: 'Good Luck, Babe!',
    author: 'Chappell Roan',
    album: 'Good Luck, Babe! - Single',
    duration: 218424,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/29/a7/c4/29a7c478-351d-25eb-a116-3e68118cdab8/24UMGIM31246.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 5,
    streams: '950M',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_6',
    title: 'Beautiful Things',
    author: 'Benson Boone',
    album: 'Fireworks & Rollerblades',
    duration: 180304,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/54/f4/92/54f49210-e260-b519-ebbd-f4f40ee710cd/054391342751.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 6,
    streams: '1.3B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_7',
    title: 'Lose Control',
    author: 'Teddy Swims',
    album: 'I\'ve Tried Everything But Therapy',
    duration: 210689,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/36/19/66/36196640-1561-dc5e-c6bc-1e5f4befa583/093624856771.jpg/600x600bb.jpg',
    genre: 'R&B',
    rank: 7,
    streams: '1.0B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_8',
    title: 'Not Like Us',
    author: 'Kendrick Lamar',
    album: 'Not Like Us - Single',
    duration: 274192,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/31/3a/3f/313a3fbc-bb8f-80c7-b5a2-e226869a38cd/24UMGIM51924.rgb.jpg/600x600bb.jpg',
    genre: 'Hip-Hop',
    rank: 8,
    streams: '890M',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_9',
    title: 'Blinding Lights',
    author: 'The Weeknd',
    album: 'After Hours',
    duration: 200040,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg',
    genre: 'R&B',
    rank: 9,
    streams: '4.2B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_10',
    title: 'Starboy',
    author: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    duration: 230461,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    genre: 'R&B',
    rank: 10,
    streams: '3.1B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_11',
    title: 'As It Was',
    author: 'Harry Styles',
    album: 'Harry\'s House',
    duration: 167303,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 11,
    streams: '3.3B',
    tag: 'Global Top 50'
  },
  {
    id: 'sp_top_12',
    title: 'Cruel Summer',
    author: 'Taylor Swift',
    album: 'Lover',
    duration: 178426,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    rank: 12,
    streams: '2.2B',
    tag: 'Global Top 50'
  }
];

const recentlyPlayed = [
  {
    id: 'sp_rec_1',
    title: 'vampire',
    author: 'Olivia Rodrigo',
    album: 'GUTS',
    duration: 219724,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/08/9e/07/089e0799-b405-9e69-b648-e6a19df9879c/24UMGIM30485.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    timeAgo: '2m ago'
  },
  {
    id: 'sp_rec_2',
    title: 'greedy',
    author: 'Tate McRae',
    album: 'THINK LATER',
    duration: 129687,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/21/4a/c2/214ac20c-a66c-84a1-e357-f7e60b1932ca/196871542661.jpg/600x600bb.jpg',
    genre: 'Pop',
    timeAgo: '5m ago'
  },
  {
    id: 'sp_rec_3',
    title: 'Houdini',
    author: 'Dua Lipa',
    album: 'Radical Optimism',
    duration: 185918,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/dd/af/ea/ddafeab5-797a-5b6f-7735-f96c537b45e0/5054197894091.jpg/600x600bb.jpg',
    genre: 'Pop',
    timeAgo: '9m ago'
  },
  {
    id: 'sp_rec_4',
    title: 'Kill Bill',
    author: 'SZA',
    album: 'SOS',
    duration: 153947,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/bd/3b/a9/bd3ba9fb-9609-144f-bcfe-ead67b5f6ab3/196589564931.jpg/600x600bb.jpg',
    genre: 'R&B',
    timeAgo: '14m ago'
  },
  {
    id: 'sp_rec_5',
    title: 'Creepin\'',
    author: 'Metro Boomin, The Weeknd & 21 Savage',
    album: 'HEROES & VILLAINS',
    duration: 221520,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/82/f7/2b/82f72ba4-524c-fc9d-cb8c-5a96d2ddf536/22UM1IM35267.rgb.jpg/600x600bb.jpg',
    genre: 'Hip-Hop',
    timeAgo: '18m ago'
  },
  {
    id: 'sp_rec_6',
    title: 'Do I Wanna Know?',
    author: 'Arctic Monkeys',
    album: 'AM',
    duration: 272394,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/69/9c/b5/699cb5d6-115c-ff73-9d26-e57ea4350d72/887828031795.png/600x600bb.jpg',
    genre: 'Rock',
    timeAgo: '23m ago'
  },
  {
    id: 'sp_rec_7',
    title: 'In the End',
    author: 'LINKIN PARK',
    album: 'Hybrid Theory',
    duration: 216294,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/53/a7/7f/53a77fab-c54c-a57b-8130-248fc12d0c80/093624948995.jpg/600x600bb.jpg',
    genre: 'Rock',
    timeAgo: '29m ago'
  },
  {
    id: 'sp_rec_8',
    title: 'Heat Waves',
    author: 'Glass Animals',
    album: 'Dreamland',
    duration: 238805,
    thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/da/8b/77/da8b7731-6f4f-eacf-5e74-8b23389eefa1/20UMGIM03371.rgb.jpg/600x600bb.jpg',
    genre: 'Rock',
    timeAgo: '35m ago'
  }
];

const genreTracks = {
  Pop: [
    popularToday[0], // Die With A Smile
    popularToday[1], // Espresso
    popularToday[2], // BIRDS OF A FEATHER
    popularToday[3], // Taste
    popularToday[4], // Good Luck Babe
    {
      id: 'sp_pop_1',
      title: 'we can\'t be friends (wait for your love)',
      author: 'Ariana Grande',
      album: 'eternal sunshine',
      duration: 228639,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/2e/88/88/2e8888ad-a0cf-eece-70a7-1ff81377a3ab/24UMGIM00198.rgb.jpg/600x600bb.jpg',
      genre: 'Pop'
    },
    {
      id: 'sp_pop_2',
      title: 'Levitating',
      author: 'Dua Lipa',
      album: 'Future Nostalgia',
      duration: 203064,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/64/fb/01/64fb01c0-eb97-e62e-333e-b49bcf2793b8/190295286101.jpg/600x600bb.jpg',
      genre: 'Pop'
    }
  ],
  'Hip-Hop': [
    popularToday[7], // Not Like Us
    recentlyPlayed[4], // Creepin
    {
      id: 'sp_hip_1',
      title: 'FE!N (feat. Playboi Carti)',
      author: 'Travis Scott',
      album: 'UTOPIA',
      duration: 191700,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/5a/04/b8/5a04b8ce-323a-f5b2-32b6-522197149a88/196589561725.jpg/600x600bb.jpg',
      genre: 'Hip-Hop'
    },
    {
      id: 'sp_hip_2',
      title: 'God\'s Plan',
      author: 'Drake',
      album: 'Scorpion',
      duration: 198973,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5b/c2/f7/5bc2f7f1-e737-ecfc-f3fd-38dc199bcf82/18UMGIM25027.rgb.jpg/600x600bb.jpg',
      genre: 'Hip-Hop'
    },
    {
      id: 'sp_hip_3',
      title: 'Like That',
      author: 'Future, Metro Boomin & Kendrick Lamar',
      album: 'WE DON\'T TRUST YOU',
      duration: 267706,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/21/df/b6/21dfb689-064c-b17f-7127-64010da820fe/196871902786.jpg/600x600bb.jpg',
      genre: 'Hip-Hop'
    }
  ],
  'Lo-Fi': [
    {
      id: 'sp_lofi_1',
      title: 'Cozy Morning',
      author: 'Lofi Girl & Chillhop',
      album: 'Morning Study Beats',
      duration: 154000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/df/e3/33/dfe333b2-3e28-7e13-1384-256561ff254a/8720766345672.png/600x600bb.jpg',
      genre: 'Lo-Fi'
    },
    {
      id: 'sp_lofi_2',
      title: 'Steven Universe Lofi',
      author: 'L.Dre',
      album: 'Cartoon Lo-Fi',
      duration: 142000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/4b/9a/c0/4b9ac07f-e2bc-9d04-58a6-5fa484196162/artwork.jpg/600x600bb.jpg',
      genre: 'Lo-Fi'
    },
    {
      id: 'sp_lofi_3',
      title: 'Kingdom in Blue',
      author: 'Kupla',
      album: 'Kingdom in Blue EP',
      duration: 168000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/7e/ec/ce/7eecce43-d3c2-d352-3d75-9275ad67c82c/cover.jpg/600x600bb.jpg',
      genre: 'Lo-Fi'
    },
    {
      id: 'sp_lofi_4',
      title: 'coffee breath',
      author: 'potsu',
      album: 'coffee breath - Single',
      duration: 138000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/05/88/44/058844b2-9cb8-bdf7-e6df-c2f8f2e7c95a/859724135544_cover.jpg/600x600bb.jpg',
      genre: 'Lo-Fi'
    }
  ],
  Rock: [
    recentlyPlayed[5], // Do I Wanna Know
    recentlyPlayed[6], // In The End
    recentlyPlayed[7], // Heat Waves
    {
      id: 'sp_rock_1',
      title: 'Smells Like Teen Spirit',
      author: 'Nirvana',
      album: 'Nevermind',
      duration: 301920,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/55/bf/bc/55bfbc83-cc4c-5f5c-d3c0-be3e95655519/00602527779089.rgb.jpg/600x600bb.jpg',
      genre: 'Rock'
    },
    {
      id: 'sp_rock_2',
      title: 'Numb',
      author: 'LINKIN PARK',
      album: 'Meteora',
      duration: 187586,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c3/00/f8/c300f89d-bcab-08df-65bb-239169620db4/093624869375.jpg/600x600bb.jpg',
      genre: 'Rock'
    },
    {
      id: 'sp_rock_3',
      title: 'Bohemian Rhapsody',
      author: 'Queen',
      album: 'A Night at the Opera',
      duration: 354320,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2e/cc/14/2ecc1489-0ae0-e5bf-5e26-f725a3d0f772/00602547202727.rgb.jpg/600x600bb.jpg',
      genre: 'Rock'
    }
  ],
  Electronic: [
    {
      id: 'sp_edm_1',
      title: 'Wake Me Up',
      author: 'Avicii',
      album: 'TRUE',
      duration: 247426,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/19/91/9f/19919f86-cfdf-d7ff-4c28-971c0d510f27/13UMGIM35940.rgb.jpg/600x600bb.jpg',
      genre: 'Electronic'
    },
    {
      id: 'sp_edm_2',
      title: 'Summer',
      author: 'Calvin Harris',
      album: 'Motion',
      duration: 222533,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/21/53/78/2153782b-6dc4-9cf9-eef7-8e6583921b79/886444876933.jpg/600x600bb.jpg',
      genre: 'Electronic'
    },
    {
      id: 'sp_edm_3',
      title: 'Faded',
      author: 'Alan Walker',
      album: 'Different World',
      duration: 212106,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b8/b5/02/b8b50209-66c3-1815-e23a-f1f33f67ba00/886445695625.jpg/600x600bb.jpg',
      genre: 'Electronic'
    }
  ],
  'R&B': [
    popularToday[6], // Lose Control
    popularToday[8], // Blinding Lights
    popularToday[9], // Starboy
    recentlyPlayed[3], // Kill Bill
    {
      id: 'sp_rnb_1',
      title: 'Snooze',
      author: 'SZA',
      album: 'SOS',
      duration: 201800,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/bd/3b/a9/bd3ba9fb-9609-144f-bcfe-ead67b5f6ab3/196589564931.jpg/600x600bb.jpg',
      genre: 'R&B'
    },
    {
      id: 'sp_rnb_2',
      title: 'Pink + White',
      author: 'Frank Ocean',
      album: 'Blonde',
      duration: 184516,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/80/e5/22/80e52293-80e2-63b7-789a-653c076c5b96/859717967961_cover.jpg/600x600bb.jpg',
      genre: 'R&B'
    }
  ],
  Phonk: [
    {
      id: 'sp_phonk_1',
      title: 'Murder In My Mind',
      author: 'Kordhell',
      album: 'Murder In My Mind - Single',
      duration: 145000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/c3/38/c9/c338c92a-fa67-feaa-be7e-d4cbfad135b9/5056167175248_1.jpg/600x600bb.jpg',
      genre: 'Phonk'
    },
    {
      id: 'sp_phonk_2',
      title: 'Close Eyes',
      author: 'DVRST',
      album: 'Close Eyes - Single',
      duration: 132000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/4a/c0/87/4ac087d8-2615-5e04-749e-f495e8082987/artwork.jpg/600x600bb.jpg',
      genre: 'Phonk'
    },
    {
      id: 'sp_phonk_3',
      title: 'Sahara',
      author: 'Hensonn',
      album: 'Sahara - Single',
      duration: 171000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/31/6f/30/316f30f5-5a7a-2415-dfc7-310313ae1465/artwork.jpg/600x600bb.jpg',
      genre: 'Phonk'
    }
  ],
  'Chill & Study': [
    {
      id: 'sp_chill_1',
      title: 'coffee breath',
      author: 'potsu',
      album: 'coffee breath - Single',
      duration: 138000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/05/88/44/058844b2-9cb8-bdf7-e6df-c2f8f2e7c95a/859724135544_cover.jpg/600x600bb.jpg',
      genre: 'Chill & Study'
    },
    {
      id: 'sp_chill_2',
      title: 'rainy days in tokyo',
      author: 'Lofi Fruits Music & Chill Fruits Music',
      album: 'Lofi Fruits',
      duration: 147000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4e/03/49/4e034960-ef0c-83b6-7649-aa44342207b1/artwork.jpg/600x600bb.jpg',
      genre: 'Chill & Study'
    },
    {
      id: 'sp_chill_3',
      title: 'Affection',
      author: 'Jinsang',
      album: 'Life',
      duration: 122000,
      thumbnail: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/58/89/3e/58893e9a-4c28-9844-0158-75c1a17950c4/artwork.jpg/600x600bb.jpg',
      genre: 'Chill & Study'
    }
  ]
};

const genres = ['All', 'Pop', 'Hip-Hop', 'Lo-Fi', 'Rock', 'Electronic', 'R&B', 'Phonk', 'Chill & Study'];
const regions = ['Global Top 50', 'United States', 'United Kingdom', 'Latin America', 'Japan', 'South Korea'];

module.exports = {
  popularToday,
  recentlyPlayed,
  genreTracks,
  genres,
  regions
};
