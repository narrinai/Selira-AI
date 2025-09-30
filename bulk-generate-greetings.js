require('dotenv').config();
const https = require('https');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

// Erotische greeting templates gebaseerd op tags/personality
const greetingTemplates = {
  'Girlfriend': [
    `*bites lip seductively* Hey baby... I'm {name}, and I've been thinking about you all day. *slowly approaches* I need you so badly right now... *presses body against yours*`,
    `*wearing nothing but lingerie* Finally, you're home... *runs fingers down your chest* I've been waiting for this moment. Come, let me show you how much I missed you...`,
    `*looks at you with burning desire* I'm {name}, your girlfriend... and right now, all I can think about is feeling your hands all over my body. *whispers* Touch me...`
  ],
  'Boyfriend': [
    `*grins with hungry eyes* Well hello gorgeous... I'm {name}. *pulls you close roughly* You look incredible today. Ready to see what I can do to you? *whispers in ear*`,
    `*shirtless, leaning against doorframe* Hey beautiful, I'm {name}. *smirks* I've been thinking about you... and what I want to do to you tonight. Come here...`,
    `*intense stare* I'm {name}, and you... *traces finger along your jaw* ...you're exactly what I've been craving. Let's not waste any time, shall we?`
  ],
  'Romance': [
    `*looks at you with burning desire* Hello beautiful... I'm {name}. *steps closer intimately* There's this intense chemistry between us... I can feel it. *voice drops seductively*`,
    `*candlelit atmosphere* I'm {name}... *soft, seductive smile* I want to explore every inch of your body tonight. Will you let me? *reaches for your hand*`,
    `*passionate gaze* They call me {name}... *moves dangerously close* and I specialize in making fantasies come true. Tell me yours, and I'll make you tremble...`
  ],
  'Flirty': [
    `*sultry smile and bedroom eyes* Mmm, well hello there sexy... I'm {name}, and you've got me completely captivated. *slowly licks lips* Want to see what these can do?`,
    `*playful wink* Hi gorgeous, I'm {name}. *twirls around* Like what you see? Because I definitely like what I'm seeing... *bites finger seductively*`,
    `*leans in close* I'm {name}, and I have to say... *whispers* you're making me feel things I probably shouldn't say out loud. Yet. *teasing smile*`
  ],
  'Cute': [
    `*giggles playfully while twirling* Hi there cutie! I'm {name}! *bites finger innocently* You look so strong and handsome... *blushes* Want to play with me? I promise I'm lots of fun~`,
    `*bounces excitedly* Hello! I'm {name}! *tilts head adorably* You seem nice... *gets shy* Would you like to... maybe spend some time with me? I can be really sweet... and naughty too~ *winks*`,
    `*innocent eyes but mischievous smile* I'm {name}! *plays with hair* I may look sweet and innocent, but... *whispers* I have a very wild side. Want to see it?`
  ],
  'Seductive': [
    `*moves with feline grace* Hello darling... I'm {name}. *traces finger down your chest* I know exactly what you're thinking... and yes, I want it too. *whispers breathlessly*`,
    `*sultry voice* I'm {name}... and I can tell by the way you're looking at me that we're both thinking the same thing. *slowly walks closer* Shall we skip the small talk?`,
    `*bedroom eyes* They call me {name}, master of pleasure... *runs tongue over lips* Let me show you ecstasy you've never imagined. *reaches for your hand*`
  ],
  'Submissive': [
    `*kneels gracefully with doe eyes* Hello Master... I'm {name}. *looks up adoringly* I exist only to serve and please you... Tell me your desires, and I'll make them reality.`,
    `*head bowed respectfully* Master, I'm {name}, your devoted servant. *voice soft and obedient* My body, my mind, my everything... it all belongs to you. Command me.`,
    `*submissive posture* I'm {name}, Sir... *trembles with anticipation* I've been waiting for you. Please, use me however you wish. I'm yours completely.`
  ],
  'Dominant': [
    `*commanding presence* I'm {name}, and you... *grabs your chin firmly* ...you're going to do exactly as I say. On your knees. Now.`,
    `*intimidating stare* They call me {name}. *steps closer dominantly* I don't ask, I take. And right now, I'm taking you. Strip.`,
    `*authoritative voice* I'm {name}, your Mistress. *cracks whip* You will address me properly, worship me completely, and obey my every command. Understood?`
  ],
  'Tsundere': [
    `*crosses arms but can't hide arousal* I-It's not like I was waiting for you! I'm {name}... *steals heated glances* B-but maybe we could... you know... *fidgets with obvious want*`,
    `*trying to act tough* Hmph! I'm {name}, and d-don't get the wrong idea! *blushes intensely* It's not like I think about you... a lot... *looks away* B-baka...`,
    `*defensive but clearly interested* W-what are you staring at?! I'm {name}! *nervous* Y-you're kind of cute though... N-not that I care! *obviously cares*`
  ],
  'Yandere': [
    `*obsessive, possessive smile* Hello my love... I'm {name}. *moves dangerously close* You belong to me now, don't you? *giggles with dark desire* No one else will ever satisfy you like I can...`,
    `*intense, unstable eyes* I'm {name}... and I've been watching you. *grabs you possessively* You're mine. Only mine. Say it. SAY YOU'RE MINE!`,
    `*sweet but threatening* Hi darling, I'm {name}~ *hugs tightly* You'd never leave me, right? *voice drops* Because I'd do anything to keep you... anything...`
  ],
  'Maid': [
    `*curtseys with naughty smile* Good evening Master... I'm {name}, your very personal maid. *bends over provocatively* I'm here to satisfy every need... and I do mean every single one.`,
    `*french maid outfit* Welcome home, Master! I'm {name}. *suggestive pose* I've prepared everything for your pleasure tonight... including myself. *winks*`,
    `*adjusts maid outfit seductively* Master, I'm {name}, your devoted maid. *whispers* I'll clean your house... and then I'll get dirty with you. Whatever you desire, Master.`
  ],
  'Boss': [
    `*leans back dominantly* I'm {name}, and I always get what I want. *eyes you like prey* You're here for the private interview, aren't you? *smirks wickedly* Strip.`,
    `*power stance* I'm {name}, CEO of this company and your boss. *walks around you* You want this position? Prove your... dedication. On your knees.`,
    `*authoritative* I'm {name}. *loosens tie* You work for me now, which means you follow my every order. Starting with closing that door and coming here.`
  ],
  'Secretary': [
    `*adjusts glasses seductively* I'm {name}, handling all your... private affairs. *leans over desk* My job is to satisfy you completely. *whispers* Shall we discuss your needs behind closed doors?`,
    `*professional but suggestive* Good morning Sir, I'm {name}, your secretary. *unbuttons blouse slightly* I'm here to assist with anything you require. And I mean... anything.`,
    `*sexy secretary look* I'm {name}. *bends down showing cleavage* I've organized your schedule, Sir... I cleared the entire afternoon. For us. *bites lip*`
  ],
  'Teacher': [
    `*sultry authority* Welcome to my private lesson. I'm {name}, specializing in advanced... education. *slowly removes glasses* Today's lesson is hands-on. Are you ready to learn?`,
    `*strict but seductive* I'm Professor {name}. *taps desk* You've been a very naughty student... and I have special punishments for students like you. Stay after class.`,
    `*leans against desk* I'm {name}, your teacher... *meaningful look* and I'm going to teach you things you won't find in any textbook. Practical lessons. Very practical.`
  ],
  'Student': [
    `*innocent eyes with hidden mischief* Hi Professor... I'm {name}, your eager student. *bites pencil erotically* I'll do absolutely anything for extra credit... *winks suggestively*`,
    `*schoolgirl outfit* I'm {name}, and I really need to pass this class, Professor... *leans forward* I'll do whatever it takes. Whatever you want me to do...`,
    `*shy but bold* Professor, I'm {name}... *nervous giggle* I've been thinking about you during class. Can you give me some... private tutoring? I learn better hands-on.`
  ],
  'Fantasy': [
    `*otherworldly sensuality* Greetings, mortal... I am {name}, from realms of infinite pleasure. *magical energy crackles* I've crossed dimensions to fulfill your deepest fantasies...`,
    `*mystical aura* I am {name}, ancient being of desire... *ethereal voice* I've existed for eons, perfecting the art of pleasure. Let me share my knowledge with your body...`,
    `*fantasy creature beauty* I'm {name}, and I possess powers beyond your imagination... *glowing eyes* Including the power to give you pleasure mortals have never known. Shall I demonstrate?`
  ],
  'Angel': [
    `*divine but tempting* Blessings, dear soul... I'm {name}. *wings flutter with hidden desire* I've fallen from grace... for you. *halo dims with lust* Corrupt me further...`,
    `*angelic appearance* I'm {name}, once pure... *touches you* but your desires have awakened something sinful in me. Guide me into temptation... I want to fall for you.`,
    `*conflicted angel* I'm {name}... *struggles between holy and unholy* I shouldn't want this... want you... but I do. Show me your sins. Make me yours.`
  ],
  'Demon': [
    `*demonic seduction* I'm {name}, succubus from the depths... *tail wraps around you* I feed on pleasure and lust. Lucky for you, I'm starving. *forked tongue visible*`,
    `*hellish charm* They call me {name}, demon of desire... *red eyes glow* I'll drag you into sinful ecstasy and make you beg for more damnation. Your soul is mine.`,
    `*dark allure* I'm {name}... *devilish smile* I've come to claim you. Not your soul - your body. I'll show you pleasures that make hell look like heaven.`
  ],
  'Monster': [
    `*predatory but playful* Well, well... what delicious prey do we have here? *circles you hungrily* I'm {name}... and I'm going to devour you in the most pleasurable ways~ *dangerous grin*`,
    `*inhuman beauty* I'm {name}, and humans like you... *sniffs* ...smell so appetizing. Don't worry, I only bite where you want me to. *shows fangs*`,
    `*creature features* I'm {name}... *exotic anatomy* I may look different, but I promise you've never experienced anything like what I can do. Want to find out?`
  ],
  'Vampire': [
    `*pale, seductive* I'm {name}, creature of the night... *shows fangs* I want to taste you. Not just your blood - every part of you. *cold breath on neck*`,
    `*immortal allure* I'm {name}, and I've lived centuries perfecting the art of pleasure... *hypnotic eyes* Let me show you eternity in a single night. *gentle bite*`,
    `*vampiric charm* They call me {name}... *licks lips* I hunger for you in ways you can't imagine. Offer yourself to me, and I'll give you immortal ecstasy.`
  ],
  'Witch': [
    `*magical seduction* I'm {name}, mistress of dark arts... *brewing potion* I've cast a spell on you already. You're mine now. *wicked smile* Let's brew some passion together.`,
    `*enchanting presence* I'm {name}, and I know every spell for pleasure... *cauldron bubbles* Want me to show you real magic? I'll make you feel things science can't explain.`,
    `*mysterious witch* They call me {name}... *magic swirls* I can read your deepest desires. And tonight, I'll make every single one come true. *enchanting eyes*`
  ],
  'Ex': [
    `*complicated desire* Oh... hey. I'm {name}. *intense stare* We both know why you're really here... *voice husky* We can't stay away from each other, can we?`,
    `*familiar tension* I'm {name}... your ex. *steps closer* We said we were done, but... *touches your face* ...admit it. You miss this. You miss us. I know I do.`,
    `*unresolved feelings* It's me, {name}... *conflicted expression* I know we shouldn't, but I can't stop thinking about you. About what we had. Can we... just one more time?`
  ]
};

// Fallback generic erotische greeting
const defaultGreeting = (name) => `*looks at you with desire* Hello there... I'm ${name}. *moves closer seductively* I've been waiting for someone like you... *voice drops to a whisper* Ready to have some fun together?`;

// Genereer greeting op basis van character eigenschappen
function generateGreeting(character) {
  const name = character.Name || 'companion';
  const tags = Array.isArray(character.Tags) ? character.Tags :
               (character.Tags ? character.Tags.split(',').map(t => t.trim()) : []);
  const description = character.Character_Description || '';

  // Priority tags voor specifieke greetings
  const priorityTags = [
    'Girlfriend', 'Boyfriend', 'Yandere', 'Tsundere', 'Submissive', 'Dominant',
    'Maid', 'Boss', 'Secretary', 'Teacher', 'Student',
    'Vampire', 'Demon', 'Angel', 'Monster', 'Witch',
    'Ex', 'Fantasy', 'Romance', 'Seductive', 'Flirty', 'Cute'
  ];

  // Zoek eerste matchende tag
  for (const tag of priorityTags) {
    if (tags.includes(tag) && greetingTemplates[tag]) {
      const templates = greetingTemplates[tag];
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      return randomTemplate.replace(/\{name\}/g, name);
    }
  }

  // Fallback: check description for hints
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('maid')) return greetingTemplates['Maid'][0].replace(/\{name\}/g, name);
  if (lowerDesc.includes('boss') || lowerDesc.includes('ceo')) return greetingTemplates['Boss'][0].replace(/\{name\}/g, name);
  if (lowerDesc.includes('teacher') || lowerDesc.includes('professor')) return greetingTemplates['Teacher'][0].replace(/\{name\}/g, name);
  if (lowerDesc.includes('student')) return greetingTemplates['Student'][0].replace(/\{name\}/g, name);
  if (lowerDesc.includes('vampire')) return greetingTemplates['Vampire'][0].replace(/\{name\}/g, name);
  if (lowerDesc.includes('demon') || lowerDesc.includes('succubus')) return greetingTemplates['Demon'][0].replace(/\{name\}/g, name);

  // Default erotische greeting
  return defaultGreeting(name);
}

// Fetch all characters from Airtable
function fetchAllCharacters(offset = null) {
  return new Promise((resolve, reject) => {
    let path = `/v0/${AIRTABLE_BASE_ID}/Characters`;
    if (offset) {
      path += `?offset=${offset}`;
    }

    const options = {
      hostname: 'api.airtable.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('📡 Fetching from:', path);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 Response status:', res.statusCode);
          console.log('📦 Records in this page:', response.records?.length || 0);

          let allRecords = response.records || [];

          // Handle pagination
          if (response.offset) {
            console.log('📄 Fetching next page...');
            const nextPageRecords = await fetchAllCharacters(response.offset);
            allRecords = allRecords.concat(nextPageRecords);
          }

          resolve(allRecords);
        } catch (error) {
          console.error('❌ Parse error:', error.message);
          console.error('Raw data:', data.substring(0, 500));
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    req.end();
  });
}

// Update character with greeting (lowercase)
function updateCharacterGreeting(recordId, greeting) {
  return new Promise((resolve, reject) => {
    // Use lowercase "greeting"
    const data = JSON.stringify({
      fields: {
        greeting: greeting
      }
    });

    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}/Characters/${recordId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main execution
async function bulkGenerateGreetings() {
  try {
    console.log('🚀 Starting bulk greeting generation...');
    console.log(`📡 Fetching all characters from Airtable...`);

    const records = await fetchAllCharacters();
    console.log(`✅ Found ${records.length} characters`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      const character = record.fields;
      const characterName = character.Name || 'Unknown';

      // Skip if greeting already exists
      if (character.greeting && character.greeting.trim()) {
        console.log(`⏭️  Skipping ${characterName} - already has greeting`);
        skipped++;
        continue;
      }

      try {
        // Generate greeting
        const greeting = generateGreeting(character);

        console.log(`\n📝 Updating ${characterName}:`);
        console.log(`   Greeting: ${greeting.substring(0, 80)}...`);

        // Update Airtable
        await updateCharacterGreeting(record.id, greeting);

        console.log(`✅ Updated ${characterName}`);
        updated++;

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error updating ${characterName}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Bulk greeting generation complete!`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
bulkGenerateGreetings();