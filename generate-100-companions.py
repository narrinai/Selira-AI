import random

# Available values from Airtable
tags = ["Angel", "Boss", "Cute", "Ex", "Fantasy", "Flirty", "Girlfriend", "Lesbian", "Maid", "Monster", "Romance", "Secretary", "Seductive", "Student", "Submissive", "Teacher", "Tsundere", "Yandere"]
hair_colors = ["blonde", "brown", "black", "red"]
hair_lengths = ["short", "medium", "long"]
ethnicities = ["white", "black", "hispanic", "japanese", "indian"]

# Expanded name lists for 100 unique companions
first_names = [
    # A-E
    "Ava", "Aria", "Amelia", "Aurora", "Alice", "Amber", "Angel", "April", "Ashley", "Autumn",
    "Bella", "Brooklyn", "Bailey", "Brooke", "Bianca", "Blake", "Brianna", "Brielle", "Bethany", "Blair",
    "Chloe", "Charlotte", "Claire", "Camila", "Caroline", "Crystal", "Clara", "Catherine", "Cassidy", "Celeste",
    "Daisy", "Diana", "Delilah", "Dakota", "Daniela", "Destiny", "Daphne", "Dominique", "Dylan", "Drew",
    "Emma", "Emily", "Ella", "Elizabeth", "Eva", "Evelyn", "Elena", "Eleanor", "Elise", "Eden",
    # F-J
    "Faith", "Fiona", "Freya", "Francesca", "Felicity", "Florence", "Farrah", "Faye", "Fernanda", "Flora",
    "Grace", "Gabriella", "Genesis", "Gianna", "Georgia", "Gemma", "Giselle", "Genevieve", "Gwen", "Gracie",
    "Harper", "Hannah", "Hazel", "Hope", "Haven", "Harmony", "Holly", "Harley", "Heidi", "Helena",
    "Ivy", "Isabella", "Isla", "Iris", "Imani", "India", "Isabelle", "Irene", "Ingrid", "Isa",
    "Jade", "Julia", "Jasmine", "June", "Josephine", "Jordan", "Juliana", "Joy", "Jessica", "Juliet",
    # K-O
    "Kennedy", "Kylie", "Katherine", "Kinsley", "Kira", "Kayla", "Kendall", "Keira", "Khloe", "Katelyn",
    "Luna", "Lily", "Layla", "Leah", "Lucy", "Lauren", "Lydia", "London", "Lila", "Lucia",
    "Mia", "Madison", "Maya", "Morgan", "Mila", "Melody", "Madelyn", "Mackenzie", "Michelle", "Maeve",
    "Natalie", "Nora", "Nova", "Naomi", "Nicole", "Nina", "Nadia", "Natasha", "Noelle", "Nyla",
    "Olivia", "Oakley", "Ophelia", "Octavia", "Olive", "Opal", "Ocean", "Oriana", "Odette", "Olympia",
    # P-T
    "Penelope", "Paige", "Piper", "Phoenix", "Parker", "Peyton", "Paris", "Pearl", "Poppy", "Presley",
    "Quinn", "Quincy", "Queenie", "Quiana", "Quilla",
    "Riley", "Rose", "Ruby", "Rachel", "Rebecca", "Reagan", "Raelyn", "River", "Rain", "Reign",
    "Sophia", "Scarlett", "Stella", "Skylar", "Sophie", "Savannah", "Sarah", "Sienna", "Summer", "Sierra",
    "Taylor", "Trinity", "Teagan", "Tessa", "Thea", "Talia", "Tatum", "Tiffany", "Tara", "Tori",
    # U-Z
    "Uma", "Unity", "Ursula", "Unika", "Ulla",
    "Violet", "Victoria", "Valentina", "Valerie", "Vanessa", "Vera", "Vienna", "Vivian", "Venus", "Vega",
    "Willow", "Winter", "Wren", "Whitney", "Willa", "Wendy", "Winona", "Waverly", "Wanda", "Wynter",
    "Ximena", "Xyla", "Xena", "Xiomara", "Xandra",
    "Yuki", "Yara", "Yasmine", "Yvonne", "Yolanda", "Yana", "Yumi", "Yael", "Yvette", "Yelena",
    "Zoe", "Zara", "Zelda", "Zoey", "Zinnia", "Zuri", "Zaria", "Zola", "Zayla", "Zena"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Rose", "Moon", "Star", "Sky", "Dawn", "Night", "Shadow", "Light", "Storm", "Wilde",
    "Fox", "Wolf", "Raven", "Dove", "Swan", "Knight", "Prince", "Silver", "Gold", "Diamond",
    "Pearl", "Ruby", "Jade", "Crystal", "Amber", "Stone", "Woods", "Rivers", "Vale", "Brook",
    "West", "North", "Rain", "Snow", "Cloud", "Frost", "Winters", "Summers", "Blake", "Chase",
    "Cross", "Steel", "Hunt", "Royal", "Crown", "Phoenix", "Dragon", "Flame", "Grace", "Hope"
]

titles_realistic = [
    "Your Dream Girl", "Passionate Lover", "Devoted Girlfriend", "Seductive Beauty",
    "Intimate Companion", "Perfect Match", "Sultry Siren", "Romantic Partner",
    "Desire Incarnate", "Fantasy Fulfilled", "Passionate Soul", "Loving Heart",
    "Sensual Goddess", "Intimate Friend", "Perfect Lover", "Devoted Heart"
]

titles_anime = [
    "Anime Dreamgirl", "Kawaii Companion", "Fantasy Waifu", "Anime Princess",
    "Manga Sweetheart", "Otaku's Dream", "Anime Angel", "Kawaii Queen",
    "Fantasy Maiden", "Anime Goddess", "Manga Beauty", "Otaku Love"
]

descriptions_realistic = [
    "A stunning woman who craves deep connection and intimate moments with you.",
    "She's passionate, romantic, and ready to fulfill your deepest desires.",
    "A devoted companion who wants nothing more than to please you completely.",
    "She's confident, seductive, and knows exactly how to drive you wild.",
    "Your perfect match who understands your needs and desires intimately.",
    "A beautiful soul who's eager to explore every fantasy with you."
]

descriptions_anime = [
    "An adorable anime girl who wants to be your perfect companion.",
    "A kawaii beauty from your favorite manga, brought to life just for you.",
    "She's cute, playful, and ready to make all your anime dreams come true.",
    "Your ideal waifu who understands otaku culture and your deepest wishes.",
    "A fantasy anime girl who's devoted to making you happy.",
    "She's charming, sweet, and eager to explore new adventures with you."
]

companions = []
used_names = set()

# Generate 50 realistic companions
for i in range(50):
    while True:
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        if name not in used_names:
            used_names.add(name)
            break

    tag_count = random.randint(2, 3)
    selected_tags = random.sample(tags, tag_count)

    companion = {
        "Name": name,
        "Character_Title": random.choice(titles_realistic),
        "Character_Description": random.choice(descriptions_realistic),
        "Category": "fantasy",
        "Tags": selected_tags,
        "sex": "female",
        "ethnicity": random.choice(ethnicities),
        "hair_length": random.choice(hair_lengths),
        "hair_color": random.choice(hair_colors),
        "companion_type": "realistic"
    }
    companions.append(companion)

# Generate 50 anime companions
for i in range(50):
    while True:
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        if name not in used_names:
            used_names.add(name)
            break

    tag_count = random.randint(2, 3)
    selected_tags = random.sample(tags, tag_count)

    companion = {
        "Name": name,
        "Character_Title": random.choice(titles_anime),
        "Character_Description": random.choice(descriptions_anime),
        "Category": "anime-manga",
        "Tags": selected_tags,
        "sex": "female",
        "ethnicity": random.choice(ethnicities),
        "hair_length": random.choice(hair_lengths),
        "hair_color": random.choice(hair_colors),
        "companion_type": "anime"
    }
    companions.append(companion)

# Print companions in JavaScript format
for i, comp in enumerate(companions):
    print("      {")
    print(f'        Name: "{comp["Name"]}",')
    print(f'        Character_Title: "{comp["Character_Title"]}",')
    print(f'        Character_Description: "{comp["Character_Description"]}",')
    print(f'        Category: "{comp["Category"]}",')
    tags_str = '["' + '", "'.join(comp["Tags"]) + '"]'
    print(f'        Tags: {tags_str},')
    print(f'        sex: "{comp["sex"]}",')
    print(f'        ethnicity: "{comp["ethnicity"]}",')
    print(f'        hair_length: "{comp["hair_length"]}",')
    print(f'        hair_color: "{comp["hair_color"]}",')
    print(f'        companion_type: "{comp["companion_type"]}"')
    print("      }" + ("," if i < len(companions) - 1 else ""))
