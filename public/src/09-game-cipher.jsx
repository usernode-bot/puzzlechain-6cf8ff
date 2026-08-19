/* ============================================================
   Game 3 — Crypto Wordle (daily variable-length finance/crypto word)
   ============================================================ */
// The daily word now varies in length (3–8 letters). The board sizes its
// columns to the word and allows wordLen + 1 guesses (see cwMaxGuesses).
const CW_MIN_LEN = 3;
const CW_MAX_LEN = 8;

// Curated finance / crypto terms of VARYING length (3–8 letters), each with a
// short themed clue the player reads while solving. The daily answer is chosen
// deterministically from this list, so everyone gets the same word + length +
// clue on the same UTC day (shareable, comparable). No dictionary validates the
// guesses — any letters of the right length are accepted — but the answer is
// always from here. Every `word` must be UPPERCASE A–Z and 3–8 letters.
// Each entry: `clue` is the always-visible main clue; `hints` is an ordered
// list of EXTRA clues (default 2) that unlock progressively — one per wrong
// guess, or early via the paid Hint button. Keep hints incremental and
// spoiler-light (never spell the word).
const CW_WORDS = [
  { word: 'FEE',      clue: 'What you pay to get a transaction processed',        hints: ['Charged every time you move funds on-chain', 'Spikes when the network is congested'] },
  { word: 'BID',      clue: 'The price a buyer offers in an order book',          hints: ["The opposite of an 'ask'", 'Sits on the buy side of the book'] },
  { word: 'APY',      clue: 'Yearly compounded return on a staking deposit',      hints: ['A percentage yield farmers watch', "Three-letter acronym ending in 'yield'"] },
  { word: 'BULL',     clue: 'An investor betting prices will rise',               hints: ['This market only goes up, they say', 'The opposite of a bear'] },
  { word: 'BEAR',     clue: 'An investor betting prices will fall',               hints: ['Prices keep sliding in this market', 'The opposite of a bull'] },
  { word: 'COIN',     clue: "A blockchain's own native digital currency",         hints: ['Bitcoin is the original one', 'Not a token — it has its own chain'] },
  { word: 'FIAT',     clue: 'Government-issued money like dollars or euros',      hints: ['Backed by a state, not a blockchain', 'The dollar and euro are examples'] },
  { word: 'HODL',     clue: 'Crypto slang for holding through the swings',        hints: ["Born from a typo of 'hold'", 'A meme for diamond hands'] },
  { word: 'MINT',     clue: 'To create a brand-new token or NFT',                 hints: ['Happens when an NFT is first created', 'Adds fresh supply to existence'] },
  { word: 'PUMP',     clue: 'A sharp, sudden rise in a coin’s price',             hints: ['Often followed by a dump', 'A rapid green candle'] },
  { word: 'TOKEN',    clue: 'A tradable unit of value issued on a chain',         hints: ['Issued on top of an existing chain', 'ERC-20 is a standard for these'] },
  { word: 'BLOCK',    clue: 'A bundle of transactions added to the chain',        hints: ['Miners race to add the next one', 'Links to the one before it'] },
  { word: 'CHAIN',    clue: 'The shared ledger of linked blocks',                 hints: ['A linked sequence of blocks', "The 'chain' in blockchain"] },
  { word: 'STAKE',    clue: 'Lock up coins to secure a network and earn rewards', hints: ['You give this up temporarily to earn passive rewards', 'Proof-of-_____ networks rely on it'] },
  { word: 'VAULT',    clue: 'A smart contract that safeguards deposited assets',  hints: ['Where a DeFi protocol stores deposits', 'A digital strongbox'] },
  { word: 'WHALE',    clue: 'A holder big enough to move the market',             hints: ['A sea creature that moves markets', 'Holds enough to cause a splash'] },
  { word: 'YIELD',    clue: 'The income your crypto earns over time',             hints: ['What farmers chase in DeFi', 'Your return, expressed as a rate'] },
  { word: 'AUDIT',    clue: 'A security review of a smart contract',             hints: ['Done before a protocol launches', 'Hunts for code vulnerabilities'] },
  { word: 'ASSET',    clue: 'Anything of value you can hold or trade',            hints: ['On the plus side of a balance sheet', 'Crypto, stocks, and gold all count'] },
  { word: 'NONCE',    clue: 'The number a miner tweaks to find a valid hash',     hints: ['A miner increments it endlessly', 'Used once, then discarded'] },
  { word: 'WALLET',   clue: 'App that holds your keys and coins',                 hints: ['Holds your private keys', 'Can be hot software or a cold device'] },
  { word: 'LEDGER',   clue: 'The record of every transaction ever made',         hints: ['An immutable transaction record', 'Also a famous hardware brand'] },
  { word: 'MINING',   clue: 'Spending compute to add blocks and earn rewards',    hints: ['How proof-of-work secures a chain', 'Rewards whoever solves the puzzle'] },
  { word: 'ORACLE',   clue: 'A feed that brings off-chain data on-chain',         hints: ['Feeds real-world prices on-chain', 'Chainlink is the best-known one'] },
  { word: 'BRIDGE',   clue: 'Moves assets between two different blockchains',     hints: ['Connects two separate chains', 'A frequent hacking target'] },
  { word: 'TETHER',   clue: 'Nickname for the best-known dollar stablecoin',      hints: ['Its ticker is USDT', 'A coin pegged to the dollar'] },
  { word: 'CRYPTO',   clue: 'Short name for digital currencies as a whole',       hints: ["Short for a kind of currency", "The whole industry's nickname"] },
  { word: 'BROKER',   clue: 'A middleman who places trades for you',              hints: ['Places trades on your behalf', 'Earns a commission per trade'] },
  { word: 'WALLETS',  clue: 'Where holders keep their keys and coins (plural)',   hints: ['Plural of where you keep keys', 'You might own several of these'] },
  { word: 'NETWORK',  clue: 'The connected nodes that run a blockchain',          hints: ['Nodes connected together', 'Ethereum is one of these'] },
  { word: 'TRADING',  clue: 'Buying and selling to profit from price moves',      hints: ['Buying low and selling high', 'What day-_____ describes'] },
  { word: 'STAKING',  clue: 'Earning rewards by locking up your coins',           hints: ['Locking coins to earn rewards', 'Powers proof-of-stake'] },
  { word: 'DEPOSIT',  clue: 'Funds you put into an account or protocol',          hints: ['Money you put in', 'The opposite of a withdrawal'] },
  { word: 'AIRDROP',  clue: 'Free tokens dropped to a community of wallets',      hints: ['Free tokens sent to wallets', 'Often rewards early users'] },
  { word: 'LENDING',  clue: 'Supplying assets so others can borrow for interest', hints: ['Earn interest by supplying assets', 'Aave and Compound enable it'] },
  { word: 'EXCHANGE', clue: 'A marketplace for swapping one coin for another',    hints: ['Where you swap one coin for another', 'Can be centralized or decentralized'] },
  { word: 'SOLVENCY', clue: 'Having enough assets to cover what you owe',         hints: ['Enough assets to cover liabilities', 'The opposite of bankruptcy'] },
  { word: 'TREASURY', clue: 'The shared pool of funds a protocol controls',       hints: ["A DAO's shared war chest", "Holds a protocol's reserves"] },
  { word: 'VALIDATE', clue: 'To confirm transactions are legitimate',             hints: ['Confirm a transaction is legit', 'Validators do this'] },
  { word: 'DIVIDEND', clue: 'A share of profits paid out to holders',             hints: ['A payout to shareholders', 'Profit shared with holders'] },
  { word: 'CURRENCY', clue: 'Money in a particular form, digital or fiat',        hints: ['A medium of exchange', 'Dollars and bitcoin both qualify'] },
  { word: 'CONTRACT', clue: 'Self-running code that enforces an agreement',       hints: ['Self-executing code on a chain', 'Smart ones run on Ethereum'] },
  { word: 'CUSTODY',  clue: 'Who actually holds the keys to your assets',          hints: ['Self- or third-party', 'Not your keys, not your coins'] },
  { word: 'LIQUID',   clue: 'Easy to buy or sell without moving the price',        hints: ['A deep order book is this', 'The opposite of thinly traded'] },
  { word: 'ROLLUP',   clue: 'A layer that batches transactions off the main chain', hints: ['Optimistic or zero-knowledge', 'Cuts fees by bundling'] },
];

/* ============================================================
   #138 — "Daily cipher is the same every day".
   The seeding was fine (consecutive-day PRNG streams are well separated); the
   pool was the problem: 42 words, ONE theme, 4–7 drawn per day, no cross-day
   memory. Two words recurring inside a week is what made it feel identical.

   Fix: three more themed pools (≥180 entries total) plus a deterministic
   ROTATION that partitions a seeded shuffle into day-sized blocks, so a word
   cannot recur inside a full cycle. Verified by the cipher-rotation self-test.
   ============================================================ */
const CW_SCIENCE = [
  { word: 'ATOM',     clue: 'The smallest unit of an element',                    hints: ['Has a nucleus and electrons', 'Building block of matter'] },
  { word: 'CELL',     clue: 'The basic unit of every living thing',               hints: ['Has a membrane and a nucleus', 'You are made of trillions'] },
  { word: 'GENE',     clue: 'A stretch of DNA coding one trait',                  hints: ['Inherited from your parents', 'Lives on a chromosome'] },
  { word: 'MASS',     clue: 'How much matter something contains',                 hints: ['Measured in kilograms', 'Not the same as weight'] },
  { word: 'HEAT',     clue: 'Energy flowing from hot to cold',                     hints: ['Measured in joules', 'Flows down a temperature gradient'] },
  { word: 'IONS',     clue: 'Atoms carrying an electric charge',                  hints: ['Formed by losing or gaining electrons', 'Carry current through a solution'] },
  { word: 'ACID',     clue: 'A substance with a pH below seven',                  hints: ['Turns litmus paper red', 'Donates protons'] },
  { word: 'ORBIT',    clue: 'The curved path one body takes around another',      hints: ['The Moon does this to Earth', 'Kepler described its shape'] },
  { word: 'LASER',    clue: 'A beam of light amplified in one direction',          hints: ['An acronym for stimulated emission', 'Coherent, single-wavelength light'] },
  { word: 'PRISM',    clue: 'Glass that splits white light into colours',          hints: ['Newton used one on sunlight', 'Makes a rainbow indoors'] },
  { word: 'ALLOY',    clue: 'A metal blended from two or more elements',           hints: ['Brass and steel are examples', 'Stronger than its parts'] },
  { word: 'FORCE',    clue: 'A push or pull that changes motion',                 hints: ['Mass times acceleration', 'Measured in newtons'] },
  { word: 'PLANT',    clue: 'An organism that makes food from sunlight',          hints: ['Uses chlorophyll', 'Roots, stem, leaves'] },
  { word: 'NERVE',    clue: 'A fibre carrying signals through the body',          hints: ['Sends electrical impulses', 'Bundled into the spinal cord'] },
  { word: 'SOLAR',    clue: 'Relating to the Sun',                                hints: ['As in panels, or a system', 'From the Latin for sun'] },
  { word: 'FOSSIL',   clue: 'Preserved remains of ancient life',                  hints: ['Found in sedimentary rock', 'How we know about dinosaurs'] },
  { word: 'ENZYME',   clue: 'A protein that speeds up a reaction',                hints: ['A biological catalyst', 'Names usually end in -ase'] },
  { word: 'PHOTON',   clue: 'A single particle of light',                         hints: ['Has no mass', 'Both a particle and a wave'] },
  { word: 'GRAVITY',  clue: 'The force pulling masses toward each other',         hints: ['Keeps you on the ground', 'Newton and Einstein both explained it'] },
  { word: 'NEURON',   clue: 'A single brain cell that fires signals',             hints: ['Has dendrites and an axon', 'Billions of them in your head'] },
  { word: 'PLASMA',   clue: 'Ionised gas, the fourth state of matter',            hints: ['What stars are made of', 'Also the liquid part of blood'] },
  { word: 'MAGNET',   clue: 'Something with a north and south pole',              hints: ['Attracts iron', 'Has a field around it'] },
  { word: 'CARBON',   clue: 'Element number six, the basis of life',              hints: ['Diamonds and graphite are both this', 'Symbol C'] },
  { word: 'OXYGEN',   clue: 'The element every breath depends on',                hints: ['About a fifth of the air', 'Symbol O'] },
  { word: 'PROTON',   clue: 'The positively charged nucleus particle',            hints: ['Its count is the atomic number', 'Opposite of an electron'] },
  { word: 'ORGANIC',  clue: 'Chemistry built around carbon compounds',            hints: ['Also a food label', 'The chemistry of living things'] },
  { word: 'MINERAL',  clue: 'A naturally occurring solid with fixed structure',    hints: ['Quartz and calcite qualify', 'Rocks are made of them'] },
  { word: 'GLACIER',  clue: 'A slow river of ice',                                hints: ['Carves valleys as it moves', 'Retreating in a warming world'] },
  { word: 'ECOLOGY',  clue: 'The study of how organisms relate to their habitat',  hints: ['Food webs and niches', 'From the Greek for household'] },
  { word: 'ISOTOPE',  clue: 'A variant of an element with extra neutrons',        hints: ['Carbon-14 is one', 'Same element, different mass'] },
  { word: 'VACCINE',  clue: 'A preparation that trains immunity',                 hints: ['Teaches your body to recognise a pathogen', 'Jenner made the first'] },
  { word: 'NEUTRON',  clue: 'The uncharged particle in a nucleus',                hints: ['Has mass but no charge', 'Discovered by Chadwick'] },
  { word: 'ECLIPSE',  clue: 'When one body blocks the light of another',           hints: ['Solar or lunar', 'Needs three bodies in a line'] },
  { word: 'BIOLOGY',  clue: 'The science of living things',                       hints: ['Cells, genes, ecosystems', 'From the Greek for life'] },
  { word: 'CLIMATE',  clue: "A region's long-term weather pattern",               hints: ['Weather averaged over decades', 'Not the same as weather'] },
  { word: 'MOLECULE', clue: 'Two or more atoms bonded together',                  hints: ['Water is a famous one', 'Smaller than a cell, bigger than an atom'] },
  { word: 'ELECTRON', clue: 'The negatively charged particle orbiting a nucleus',  hints: ['Carries electric current', 'Tiny compared to a proton'] },
  { word: 'GRAVITON', clue: 'The hypothetical carrier of gravity',                hints: ['Never observed', 'Would be the force particle for mass'] },
  { word: 'PROTEIN',  clue: 'A chain of amino acids doing a cellular job',        hints: ['Folded into a shape that matters', 'Built from a gene recipe'] },
  { word: 'SPECTRUM', clue: 'The full range of wavelengths in radiation',          hints: ['Visible light is one slice', 'A prism reveals it'] },
  { word: 'PARTICLE', clue: 'A very small constituent of matter',                 hints: ['Physics has a whole zoo of them', 'Colliders smash them together'] },
  { word: 'PRESSURE', clue: 'Force spread over an area',                          hints: ['Measured in pascals', 'Rises as you dive deeper'] },
  { word: 'MOMENTUM', clue: 'Mass times velocity — the tendency to keep going',    hints: ['Conserved in a collision', 'Hard to stop a heavy fast thing'] },
  { word: 'HABITAT',  clue: 'The natural home of a species',                       hints: ['Where an animal lives', 'Loss of it drives extinction'] },
  { word: 'MICROBE',  clue: 'An organism too small to see unaided',                hints: ['Needs a microscope', 'Bacteria are examples'] },
  { word: 'MAGNETIC', clue: 'Having the properties of a magnet',                   hints: ['As in a field, or the north pole', 'Iron responds to it'] },
];

const CW_GEOGRAPHY = [
  { word: 'BAY',      clue: 'A wide inlet where the sea bends into land',         hints: ['Smaller than a gulf', 'Ships shelter in one'] },
  { word: 'CAPE',     clue: 'A headland jutting into the sea',                    hints: ['Horn and Good Hope are two', 'A pointed piece of coast'] },
  { word: 'DUNE',     clue: 'A hill of wind-blown sand',                          hints: ['Shifts with the wind', 'Deserts and beaches have them'] },
  { word: 'FJORD',    clue: 'A deep sea inlet carved by a glacier',               hints: ['Norway is famous for them', 'Steep cliffs on both sides'] },
  { word: 'DELTA',    clue: 'The fan of land where a river meets the sea',        hints: ['The Nile has a famous one', 'Named after a Greek letter'] },
  { word: 'ATOLL',    clue: 'A ring-shaped coral island',                         hints: ['Encircles a lagoon', 'Common in the Pacific'] },
  { word: 'STEPPE',   clue: 'A vast dry grassland plain',                          hints: ['Stretches across Central Asia', 'Too dry for forest'] },
  { word: 'TUNDRA',   clue: 'Treeless ground frozen most of the year',            hints: ['Permafrost underneath', 'Found in the far north'] },
  { word: 'CANYON',   clue: 'A deep gorge cut by a river',                        hints: ['Arizona has a Grand one', 'Steep walls, river below'] },
  { word: 'ISLAND',   clue: 'Land completely surrounded by water',                hints: ['Smaller than a continent', 'You need a boat'] },
  { word: 'STRAIT',   clue: 'A narrow channel joining two seas',                  hints: ['Gibraltar and Bering are two', 'Ships queue to pass'] },
  { word: 'LAGOON',   clue: 'Shallow water cut off by a reef or sandbar',         hints: ['Often inside an atoll', 'Calm and shallow'] },
  { word: 'SAVANNA',  clue: 'Tropical grassland with scattered trees',            hints: ['Where lions hunt', 'Wet and dry seasons'] },
  { word: 'PLATEAU',  clue: 'A raised area of flat land',                         hints: ['Tibet has the largest', 'High but level'] },
  { word: 'ESTUARY',  clue: 'Where a river tide mixes with the sea',              hints: ['Brackish water', 'Rich in birdlife'] },
  { word: 'ISTHMUS',  clue: 'A narrow strip of land joining two larger areas',     hints: ['Panama has a famous one', 'A land bridge'] },
  { word: 'SUMMIT',   clue: 'The highest point of a mountain',                     hints: ['Climbers aim for it', 'Also a meeting of leaders'] },
  { word: 'VOLCANO',  clue: 'A vent where magma reaches the surface',              hints: ['Erupts lava and ash', 'Vesuvius is one'] },
  { word: 'GLACIAL',  clue: 'Relating to ice sheets, or extremely slow',           hints: ['As in a pace, or a valley', 'Carved by ice'] },
  { word: 'MONSOON',  clue: 'A seasonal wind bringing heavy rain',                hints: ['Defines South Asian summers', 'Reverses direction each year'] },
  { word: 'PRAIRIE',  clue: 'The tall-grass plains of North America',              hints: ['Bison country', 'Flat and grassy'] },
  { word: 'CRATER',   clue: 'A bowl-shaped hollow from an impact or eruption',      hints: ['The Moon is covered in them', 'Left by a meteorite or a volcano'] },
  { word: 'RAVINE',   clue: 'A narrow steep-sided valley',                        hints: ['Smaller than a canyon', 'Carved by runoff'] },
  { word: 'MARSH',    clue: 'Low wet ground thick with grasses',                   hints: ['Wetland without trees', 'Squelchy underfoot'] },
  { word: 'OASIS',    clue: 'A fertile spot in a desert',                          hints: ['Fed by groundwater', 'Palm trees and a pool'] },
  { word: 'TROPIC',   clue: 'One of two latitude lines flanking the equator',       hints: ['Cancer and Capricorn', 'Marks the sun overhead'] },
  { word: 'MERIDIAN', clue: 'A line of longitude running pole to pole',            hints: ['Greenwich has the prime one', 'Vertical on a map'] },
  { word: 'EQUATOR',  clue: 'The zero-degree line around the middle of Earth',     hints: ['Splits the hemispheres', 'Longest line of latitude'] },
  { word: 'HEADLAND', clue: 'A cliff of land reaching into the sea',               hints: ['A high point on the coast', 'Lighthouses stand on them'] },
  { word: 'MOORLAND', clue: 'Open upland covered in heather',                      hints: ['Windswept and treeless', 'Heather and peat'] },
  { word: 'WATERWAY', clue: 'A river or canal that boats can travel',              hints: ['Navigable by barge', 'Carries freight inland'] },
  { word: 'FOOTHILL', clue: 'A low hill at the base of a mountain',                hints: ['Where the climb begins', 'Below the real peaks'] },
  { word: 'BASIN',    clue: 'A large depression that collects drainage',            hints: ['The Amazon has a huge one', 'All water flows to its middle'] },
  { word: 'GORGE',    clue: 'A deep narrow passage between cliffs',                hints: ['A river usually runs through it', 'Also means to eat greedily'] },
  { word: 'LEVEE',    clue: 'An embankment holding back a river',                  hints: ['Protects a floodplain', 'The Mississippi has many'] },
  { word: 'CURRENT',  clue: 'A steady flow of water through the sea',              hints: ['The Gulf Stream is one', 'Carries heat around the globe'] },
  { word: 'LATITUDE', clue: 'How far north or south a place sits',                 hints: ['Measured in degrees from the equator', 'Horizontal on a map'] },
  { word: 'ALTITUDE', clue: 'Height above sea level',                             hints: ['Thins the air as it rises', 'Pilots watch it closely'] },
  { word: 'LOWLAND',  clue: 'Ground lying near sea level',                         hints: ['The opposite of highland', 'Flat and often fertile'] },
  { word: 'WETLAND',  clue: 'Ground saturated with water year-round',              hints: ['Marshes and bogs', 'A haven for birds'] },
  { word: 'CASCADE',  clue: 'A small steep waterfall in a series',                 hints: ['Water tumbling down steps', 'Also a mountain range'] },
  { word: 'SEDIMENT', clue: 'Particles that settle out of water',                  hints: ['Builds up in a delta', 'Becomes rock over time'] },
  { word: 'HARBOUR',  clue: 'A sheltered place where ships moor',                   hints: ['Sydney has a famous one', 'Protected from open sea'] },
  { word: 'TERRAIN',  clue: 'The shape and features of the ground',                hints: ['Rough or smooth', 'What a map contour shows'] },
  { word: 'PLAINS',   clue: 'Broad stretches of flat low ground',                  hints: ['Great ones cross America', 'Few hills in sight'] },
];

const CW_EVERYDAY = [
  { word: 'KEYS',     clue: 'What you pat your pocket for on the way out',        hints: ['They jingle', 'One opens your front door'] },
  { word: 'LAMP',     clue: 'A light you switch on beside a chair',               hints: ['Has a shade', 'Sits on a side table'] },
  { word: 'SOAP',     clue: 'What you lather at the sink',                        hints: ['Twenty seconds, they say', 'Comes as a bar or a pump'] },
  { word: 'FORK',     clue: 'The tined one in the cutlery drawer',                hints: ['Sits left of the plate', 'Also a split in the road'] },
  { word: 'CLOCK',    clue: 'What you glance at when you are late',               hints: ['Two hands, twelve numbers', 'Ticks'] },
  { word: 'KETTLE',   clue: 'What you fill and switch on for tea',                hints: ['Whistles or clicks off', 'Boils water'] },
  { word: 'MIRROR',   clue: 'The thing you check before leaving',                 hints: ['Reflects you', 'On the wall, or in the car'] },
  { word: 'PURSE',    clue: 'The small bag coins go in',                          hints: ['Snaps shut', 'Also means to pucker your lips'] },
  { word: 'LADDER',   clue: 'What you climb to reach the gutter',                 hints: ['Has rungs', 'Lean it against a wall'] },
  { word: 'BUCKET',   clue: 'What you fill to wash the car',                      hints: ['Has a handle', 'Also a to-do list'] },
  { word: 'PILLOW',   clue: 'What your head lands on',                            hints: ['Comes with a case', 'Sits at the head of the bed'] },
  { word: 'BLANKET',  clue: 'What you pull up when it gets cold',                 hints: ['Woollen, usually', 'Also means covering everything'] },
  { word: 'CURTAIN',  clue: 'What you draw at dusk',                              hints: ['Hangs on a rail', 'Also falls at the end of a play'] },
  { word: 'CUSHION',  clue: 'The soft square on the sofa',                        hints: ['You plump it', 'Also means to soften a blow'] },
  { word: 'TOASTER',  clue: 'The appliance that browns your bread',               hints: ['Pops up when done', 'Crumbs collect in the tray'] },
  { word: 'UMBRELLA', clue: 'What you open when the sky turns',                   hints: ['Has ribs and a canopy', 'Always left on the train'] },
  { word: 'SCISSORS', clue: 'The two-bladed thing in the drawer',                 hints: ['Always plural', 'Cuts paper and ribbon'] },
  { word: 'HANGER',   clue: 'What a shirt hangs on in the wardrobe',              hints: ['Wire, wood or plastic', 'Hooks over a rail'] },
  { word: 'BOTTLE',   clue: 'What you refill and carry around',                    hints: ['Has a neck and a cap', 'Glass or plastic'] },
  { word: 'CANDLE',   clue: 'What you light when the power goes',                  hints: ['Has a wick', 'Drips wax'] },
  { word: 'BASKET',   clue: 'What you carry the shopping in',                      hints: ['Woven, often', 'Also on a bicycle'] },
  { word: 'SPOON',    clue: 'The rounded one you stir with',                       hints: ['Tea or table size', 'Sits right of the plate'] },
  { word: 'TOWEL',    clue: 'What you reach for stepping out of the shower',       hints: ['Hangs on a rail', 'Fluffy when new'] },
  { word: 'BRUSH',    clue: 'What you drag through your hair',                     hints: ['Has bristles', 'Also for paint'] },
  { word: 'DRAWER',   clue: 'The sliding compartment in a chest',                  hints: ['You pull it out', 'Where odd things accumulate'] },
  { word: 'CARPET',   clue: 'The soft floor covering underfoot',                   hints: ['Fitted wall to wall', 'Vacuumed weekly'] },
  { word: 'WINDOW',   clue: 'What you open to let the air in',                     hints: ['Has a pane and a latch', 'Also on a computer'] },
  { word: 'LAUNDRY',  clue: 'The pile that never quite ends',                     hints: ['Sorted by colour', 'Washed, dried, folded'] },
  { word: 'KITCHEN',  clue: 'The room with the kettle in it',                      hints: ['Where meals get made', 'Sink, hob, fridge'] },
  { word: 'CUPBOARD', clue: 'The closed shelf unit where plates live',            hints: ['Has doors', 'Skeletons optionally included'] },
  { word: 'MATTRESS', clue: 'The padded slab you sleep on',                        hints: ['Springs or foam', 'Sits on a bed frame'] },
  { word: 'DOORBELL', clue: 'What a visitor presses',                              hints: ['Chimes or buzzes', 'By the front door'] },
  { word: 'ENVELOPE', clue: 'What a letter goes into',                              hints: ['You lick the flap', 'Needs a stamp'] },
  { word: 'NOTEBOOK', clue: 'Where you jot things you then forget',                 hints: ['Lined pages, spiral bound', 'Also a small laptop'] },
  { word: 'BLENDER',  clue: 'The appliance that purées a soup',                    hints: ['Whirring blades', 'Makes smoothies'] },
  { word: 'DOORMAT',  clue: 'What you wipe your feet on',                          hints: ['Says WELCOME, sometimes', 'Lies at the threshold'] },
  { word: 'SLIPPERS', clue: 'What you swap your shoes for indoors',                hints: ['Soft-soled', 'Kept by the door'] },
  { word: 'ARMCHAIR', clue: 'The comfortable seat with sides',                     hints: ['You sink into it', 'Has arms, unlike a stool'] },
  { word: 'SANDWICH', clue: 'Lunch between two slices',                            hints: ['Named after an earl', 'Cut on the diagonal'] },
  { word: 'BACKPACK', clue: 'What you sling over both shoulders',                   hints: ['Two straps', 'For school or a hike'] },
  { word: 'CHARGER',  clue: 'The cable you can never find',                        hints: ['Plugs into the wall', 'Your phone needs it'] },
  { word: 'STAPLER',  clue: 'The desk tool that binds pages',                      hints: ['Jams at the worst moment', 'Loads with a strip'] },
  { word: 'TROLLEY',  clue: 'What you push around a supermarket',                   hints: ['One wheel always squeaks', 'Needs a coin sometimes'] },
  { word: 'RADIATOR', clue: 'The metal panel that warms a room',                    hints: ['Bled when it gurgles', 'Under the window'] },
  { word: 'CALENDAR', clue: 'What tells you which day it is',                       hints: ['Twelve pages', 'Hangs in the kitchen'] },
];

/* Themes are DISJOINT word sets, so the rotation only has to avoid repeats
   within a theme to avoid them globally. Order is fixed — theme choice is
   `dayNum % CW_THEMES.length`, which also spreads themes evenly. */
const CW_THEMES = [
  { name: 'Crypto & finance', words: CW_WORDS },
  { name: 'Science',          words: CW_SCIENCE },
  { name: 'Geography',        words: CW_GEOGRAPHY },
  { name: 'Everyday objects', words: CW_EVERYDAY },
];
// Fixed rounds per day: a varying count made the cycle maths unverifiable, and
// 5 is the middle of the old 4–7 range.
const CW_ROUNDS_PER_DAY = 5;
// Blocks available in the smallest theme — the binding constraint on the cycle.
const CW_BLOCKS = Math.min(...CW_THEMES.map(t => Math.floor(t.words.length / CW_ROUNDS_PER_DAY)));
// Days before ANY word can recur — a SLIDING guarantee, not just an aligned one
// (see cwRoundsForDay). 4 themes x 9 blocks = 36 days.
const CW_CYCLE_LEN = CW_BLOCKS * CW_THEMES.length;

// Fisher-Yates over the shared mulberry32 family — same PRNG as every other
// daily, so this is reproducible on any device without server state.
function cwSeededShuffle(arr, seed) {
  const out = arr.slice();
  const rng = mulberry32(seed >>> 0);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

/* The day's words, purely from the UTC day number.

   PARTITION, not sampling. Each theme is shuffled ONCE (fixed seed) and cut
   into CW_ROUNDS_PER_DAY-sized blocks; day N takes block (N/nThemes) mod
   blocks. Because the slot index just walks the blocks cyclically, ANY window
   of CW_CYCLE_LEN consecutive days touches each theme's blocks at most once —
   a *sliding* no-repeat guarantee, which is what a player actually experiences.

   An earlier version reshuffled per cycle to also vary which words appear
   together. That broke the sliding property at every cycle boundary (a window
   straddling two shuffles could repeat a word days apart), so it was dropped:
   the fixed partition is the property worth having, and the visible fix for
   #138 is the 180-word four-theme pool. */
function cwRoundsForDay(dayNum) {
  const n = CW_THEMES.length;
  const themeIdx = ((dayNum % n) + n) % n;
  const theme = CW_THEMES[themeIdx];
  const dayInTheme = Math.floor(dayNum / n);
  const blocks = Math.max(1, Math.floor(theme.words.length / CW_ROUNDS_PER_DAY));
  const slot = ((dayInTheme % blocks) + blocks) % blocks;
  const shuffled = cwSeededShuffle(theme.words, hashStr('cw-rotation:' + themeIdx));
  return shuffled.slice(slot * CW_ROUNDS_PER_DAY, slot * CW_ROUNDS_PER_DAY + CW_ROUNDS_PER_DAY);
}

function cwThemeForDay(dayNum) {
  const n = CW_THEMES.length;
  return CW_THEMES[((dayNum % n) + n) % n].name;
}


// Guesses allowed for a given word length: one more than the length, so a
// 3-letter word gives 4 tries and an 8-letter word gives 9. Single knob.
const cwMaxGuesses = (wordLen) => wordLen + 1;

const CW_EMOJI = { green: '🟩', yellow: '🟨', gray: '⬛' };
const CW_KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// UTC day number, anchored to server time (offset = serverNow − clientNow),
// so the daily word can't desync from the lock countdown on a skewed clock.
function cwDayNum(offset) {
  const d = new Date(Date.now() + (offset || 0));
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000
  );
}

// Standard two-pass Wordle coloring (handles duplicate letters): greens
// first, consuming a tally of the answer's letters; then yellows only while
// an unconsumed copy of the letter remains, else gray.
function cwScoreGuess(guess, answer) {
  const len = answer.length;
  const res = Array(len).fill('gray');
  const counts = {};
  for (let i = 0; i < len; i++) counts[answer[i]] = (counts[answer[i]] || 0) + 1;
  for (let i = 0; i < len; i++) {
    if (guess[i] === answer[i]) { res[i] = 'green'; counts[guess[i]]--; }
  }
  for (let i = 0; i < len; i++) {
    if (res[i] === 'green') continue;
    if (counts[guess[i]] > 0) { res[i] = 'yellow'; counts[guess[i]]--; }
  }
  return res;
}

// Multi-word daily puzzle: each UTC day is a deterministic stack of independent
// words, identical for every player. Count is now fixed (CW_ROUNDS_PER_DAY) and
// the words come from the themed rotation above — see the #138 note there.
const CW_MIN_ROWS = 4;
const CW_MAX_ROWS = 7;

// Points banked for solving one word in `attemptsUsed` tries. Fewer attempts and
// longer words score more. Missed words score 0. Single formula, easy to retune.
const cwRoundPoints = (wordLen, attemptsUsed) =>
  Math.max((cwMaxGuesses(wordLen) + 1 - attemptsUsed) * 60, 60) + wordLen * 10;

// The day's ordered list of word entries ({ word, clue, hints }). Deterministic
// from the server-anchored UTC day, so it's identical for everyone (fair board).
function cwDailyRounds(offset) {
  // Anchored to the server-issued UTC day, not the daily PRNG stream: the
  // rotation IS the fairness guarantee (everyone on day N gets block N), and
  // deriving it from the day number is what makes "no repeat within a cycle"
  // provable rather than probabilistic.
  return cwRoundsForDay(cwDayNum(offset));
}

function CryptoWordleGame({ onWin, onLose, onStepChange, offset, savedProgress, onSaveProgress }) {
  const dayNum = useRef(cwDayNum(offset)).current;
  // The day's stack of independent word rounds (stable for the render lifetime).
  const roundsDef = useRef(cwDailyRounds(offset)).current;

  // Resume only today's saved progress (multi-round shape). Board is re-derived
  // from the seed; we persist only the mutable per-round guess words + hint use.
  const resumed = savedProgress && savedProgress.dayNum === dayNum && Array.isArray(savedProgress.rounds)
    ? savedProgress
    : null;
  const initRoundGuesses = () => roundsDef.map((rd, i) => {
    const words = resumed && Array.isArray(resumed.rounds[i]) ? resumed.rounds[i] : [];
    return words
      .filter(w => typeof w === 'string' && w.length === rd.word.length)
      .slice(0, cwMaxGuesses(rd.word.length))
      .map(w => ({ word: w, result: cwScoreGuess(w, rd.word) }));
  });
  const initHintsByRound = () => roundsDef.map((_, i) =>
    resumed && Array.isArray(resumed.hintsByRound) && Number.isFinite(resumed.hintsByRound[i])
      ? resumed.hintsByRound[i] : 0
  );

  // roundGuesses[i] = [{ word, result }]; hintsByRound[i] = paid hints applied to round i.
  const [roundGuesses, setRoundGuesses] = useState(initRoundGuesses);
  const [hintsByRound, setHintsByRound] = useState(initHintsByRound);
  const [cur, setCur] = useState('');
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const initialSecs = savedProgress && Number.isFinite(savedProgress.elapsedSecs) ? savedProgress.elapsedSecs : 0;
  const { secs, fmt } = useTimer(!done, initialSecs);

  // Derive per-round status (solved / missed / active) from the submitted guesses.
  const resolveRounds = (guessArrays) => roundsDef.map((rd, i) => {
    const gs = guessArrays[i] || [];
    const maxG = cwMaxGuesses(rd.word.length);
    const solved = gs.length > 0 && gs[gs.length - 1].word === rd.word;
    const missed = !solved && gs.length >= maxG;
    return { def: rd, guesses: gs, maxG, solved, missed, resolved: solved || missed };
  });
  const roundState = resolveRounds(roundGuesses);
  const activeIdx = roundState.findIndex(r => !r.resolved);
  const allResolved = activeIdx === -1;
  const active = activeIdx >= 0 ? roundState[activeIdx] : null;

  const solvedCount = roundState.filter(r => r.solved).length;
  const totalScore = roundState.reduce(
    (a, r) => a + (r.solved ? cwRoundPoints(r.def.word.length, r.guesses.length) : 0), 0
  );
  const totalSteps = roundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0);

  const buildProgress = (guessArrays, hbr) => ({
    dayNum,
    rounds: guessArrays.map(gs => (gs || []).map(g => g.word)),
    hintsByRound: hbr,
  });

  // Idle/leave autosave; per-guess + per-purchase saves happen inline.
  const stateRef = useRef({});
  stateRef.current = { roundGuesses, hintsByRound, secs };
  useAutosave(
    onSaveProgress,
    () => ({
      progress: buildProgress(stateRef.current.roundGuesses, stateRef.current.hintsByRound),
      steps: stateRef.current.roundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0),
      secs: stateRef.current.secs,
    }),
    !done
  );

  // Hint state. Hints are FREE (the MATCH currency is retired) but
  // hintsPurchased stays a server-authoritative DAILY count so a reload can't
  // reset it and the server-side cap still applies.
  const [hintsPurchased, setHintsPurchased] = useState(0);
  const [buying, setBuying] = useState(false);
  const [hintMsg, setHintMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, body } = await api('/api/cryptowordle/hint');
      if (!alive || !ok || !body) return;
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
    })();
    return () => { alive = false; };
  }, []);

  // Per-round clue reveal: wrong guesses in THIS round + hints applied to it,
  // capped at the round's available clues. Cost ramp is global across rounds.
  const activeHints = active ? (active.def.hints || []) : [];
  const activeWrong = active ? active.guesses.filter(g => g.word !== active.def.word).length : 0;
  const activeHintsApplied = active ? (hintsByRound[activeIdx] || 0) : 0;
  const revealedExtra = active ? Math.min(activeWrong + activeHintsApplied, activeHints.length) : 0;
  const cluesLeft = activeHints.length - revealedExtra;
  // Daily cap sent to the server: total clues available across all rounds.
  const dailyClueTotal = roundsDef.reduce((a, rd) => a + (rd.hints ? rd.hints.length : 0), 0);

  const buyHint = async () => {
    if (buying || done || !active || cluesLeft <= 0) return;
    setBuying(true);
    setHintMsg('');
    const { ok, status, body } = await api('/api/cryptowordle/hint', {
      method: 'POST',
      body: JSON.stringify({ maxHints: dailyClueTotal }),
    });
    setBuying(false);
    if (ok && body) {
      if (Number.isFinite(body.hintsPurchased)) setHintsPurchased(body.hintsPurchased);
      // Apply the revealed clue to the active round and persist immediately so a
      // reload can't lose a reveal while the server counter already advanced.
      const nextHbr = hintsByRound.map((n, i) => (i === activeIdx ? (n || 0) + 1 : n));
      setHintsByRound(nextHbr);
      onSaveProgress && onSaveProgress(buildProgress(roundGuesses, nextHbr), totalSteps, secs);
      return;
    }
    if (status === 409 && body && body.code === 'no_more_hints') {
      setHintMsg('No more clues');
    } else {
      setHintMsg('Could not use hint');
    }
  };

  // Spoiler-free multi-word share: one line per word (✅/❌ + blank squares).
  const buildShare = (rs) => {
    const lines = [`Daily Cipher #${dayNum} — ${rs.filter(r => r.solved).length}/${rs.length} · ${totalScore} pts`];
    rs.forEach(r => {
      lines.push((r.solved ? '✅ ' : '❌ ') + (r.solved ? '🟩' : '⬛').repeat(r.def.word.length));
    });
    return lines.join('\n');
  };

  const finishIfDone = (nextRoundState) => {
    if (nextRoundState.some(r => !r.resolved)) return false;
    setDone(true);
    const share = buildShare(nextRoundState);
    const solved = nextRoundState.filter(r => r.solved).length;
    const total = nextRoundState.length;
    const pts = nextRoundState.reduce(
      (a, r) => a + (r.solved ? cwRoundPoints(r.def.word.length, r.guesses.length) : 0), 0
    );
    const meta = { share, hintsUsed: hintsPurchased, wordsSolved: solved, wordsTotal: total };
    if (pts > 0) onWin(pts, totalSteps + 1, secs, meta);
    else onLose(totalSteps + 1, secs, meta);
    return true;
  };

  // Best color per letter for the active round's keyboard tinting.
  const keyState = {};
  const rank = { gray: 0, yellow: 1, green: 2 };
  if (active) {
    for (const g of active.guesses) {
      for (let i = 0; i < active.def.word.length; i++) {
        const ch = g.word[i], c = g.result[i];
        if (!(ch in keyState) || rank[c] > rank[keyState[ch]]) keyState[ch] = c;
      }
    }
  }

  const submit = () => {
    if (done || !active) return;
    const answer = active.def.word;
    const wordLen = answer.length;
    if (cur.length !== wordLen) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const result = cwScoreGuess(cur, answer);
    const newRoundGuesses = roundGuesses.map((g, i) =>
      i === activeIdx ? [...(g || []), { word: cur, result }] : g
    );
    setRoundGuesses(newRoundGuesses);
    setCur('');
    const steps = newRoundGuesses.reduce((a, g) => a + (g ? g.length : 0), 0);
    onStepChange(steps);
    onSaveProgress && onSaveProgress(buildProgress(newRoundGuesses, hintsByRound), steps, secs);
    finishIfDone(resolveRounds(newRoundGuesses));
  };

  const typeLetter = (ch) => { if (!done && active && cur.length < active.def.word.length) setCur(cur + ch); };
  const backspace = () => { if (!done) setCur(cur.slice(0, -1)); };

  // Physical keyboard, dispatched through a ref so each keypress runs the latest closure.
  const apiRef = useRef({});
  apiRef.current = { submit, typeLetter, backspace };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apiRef.current.submit(); return; }
      if (e.key === 'Backspace') { apiRef.current.backspace(); return; }
      const ch = (e.key || '').toUpperCase();
      if (ch.length === 1 && ch >= 'A' && ch <= 'Z') apiRef.current.typeLetter(ch);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const wordLen = active ? active.def.word.length : 5;
  const maxGuesses = active ? active.maxG : 6;
  const rowsLeft = active ? Math.max(maxGuesses - active.guesses.length, 0) : 0;
  const boardWidth = Math.min(wordLen * 52, 440);

  return (
    // PHASE 3 — this root was a bare <div> despite the game carrying
    // fitShell: true, so .game-wrap.fit's overflow:hidden CLIPPED the board +
    // keyboard on long words instead of fitting them. .fit-col makes the board
    // the one flexible child; the keyboard/clue/tracker are pinned in the
    // flex: 0 0 auto list.
    <div className="fit-col">
      <div className="status-bar">
        <div className="pill">
          <div className="plabel">Time</div>
          <div className="pvalue time">{fmt}</div>
        </div>
        <div className="pill">
          <div className="plabel">Word</div>
          <div className="pvalue">{Math.min(activeIdx < 0 ? roundsDef.length : activeIdx + 1, roundsDef.length)}/{roundsDef.length}</div>
        </div>
        <div className="pill">
          <div className="plabel">Solved</div>
          <div className="pvalue">{solvedCount}/{roundsDef.length}</div>
        </div>
        <div className="pill">
          <div className="plabel">Points</div>
          <div className="pvalue">{totalScore}</div>
        </div>
      </div>

      {/* #138 — naming the theme is half the "it feels different today" fix. */}
      <div className="word-theme">Today's theme: <b>{cwThemeForDay(dayNum)}</b></div>

      <div className="cw-tracker">
        {roundState.map((r, i) => {
          let cls = 'cw-dot';
          if (r.solved) cls += ' solved';
          else if (r.missed) cls += ' missed';
          else if (i === activeIdx) cls += ' active';
          return (
            <span
              key={i}
              className={cls}
              title={r.resolved ? `Word ${i + 1}: ${r.def.word}` : `Word ${i + 1}`}
            >
              {r.solved ? '●' : r.missed ? '✗' : i === activeIdx ? '▶' : '○'}
            </span>
          );
        })}
      </div>

      {active && (
        <>
          <div className="cw-clue">
            <span className="cw-clue-label">Clue</span>
            <span className="cw-clue-text">{active.def.clue}</span>
            <span className="cw-clue-len">{wordLen} letters</span>
          </div>

          {activeHints.slice(0, revealedExtra).map((h, i) => (
            <div key={i} className="cw-clue cw-clue-extra">
              <span className="cw-clue-label">Hint {i + 1}</span>
              <span className="cw-clue-text">{h}</span>
            </div>
          ))}

          {activeHints.length > 0 && (
            <HintBar
              hintsLeft={cluesLeft}
              exhausted={cluesLeft <= 0}
              buying={buying}
              onBuy={buyHint}
              msg={hintMsg}
              label="No more clues"
            />
          )}

          {/* The guess grid is the one flexible region: it shrinks so the
              keyboard, clue and tracker (all flex: 0 0 auto) keep their place.
              Deliberately NOT wrapped in fit-scale-box — that box is width-free,
              which collapses a percentage-sized grid to min-content. */}
          <div
            className="cw-board"
            style={{ gridTemplateRows: `repeat(${maxGuesses}, 1fr)`, maxWidth: `${boardWidth}px` }}
          >
            {Array.from({ length: maxGuesses }).map((_, r) => {
              const g = active.guesses[r];
              const isCurrent = !g && r === active.guesses.length && !done;
              const letters = g ? g.word : (isCurrent ? cur : '');
              return (
                <div
                  key={r}
                  className={`cw-row${isCurrent && shake ? ' shake' : ''}`}
                  style={{ gridTemplateColumns: `repeat(${wordLen}, 1fr)` }}
                >
                  {Array.from({ length: wordLen }).map((__, c) => {
                    const ch = letters[c] || '';
                    const cls = ['cw-tile'];
                    if (g) cls.push(g.result[c]);
                    else if (ch) cls.push('filled');
                    return <div key={c} className={cls.join(' ')}>{ch}</div>;
                  })}
                </div>
              );
            })}
          </div>

          <div className="cw-kbd">
            {CW_KEYS.map((row, ri) => (
              <div key={ri} className="cw-kbd-row">
                {ri === 2 && <button className="cw-key wide" {...tapProps(submit)}>Enter</button>}
                {row.split('').map(ch => (
                  <button
                    key={ch}
                    className={`cw-key${keyState[ch] ? ' ' + keyState[ch] : ''}`}
                    {...tapProps(() => typeLetter(ch))}
                  >
                    {ch}
                  </button>
                ))}
                {ri === 2 && <button className="cw-key wide" {...tapProps(backspace)}>⌫</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {allResolved && (
        <div className="cw-alldone">Puzzle complete — {solvedCount}/{roundsDef.length} words · {totalScore} pts</div>
      )}
    </div>
  );
}
