// Names of the most common TMDB topic tags in the interface languages. TMDB has keywords only in
// English; these are the ~140 most frequent ones among 600 of the most voted films and series
// (counted 03.11.2026), after the generic and mood tags dropped in similar.ts. Anything else is
// shown as TMDB writes it. Order per entry: uk, bg, de, es, fr.

import type { LocaleMode } from './preferences';

type Names = [uk: string, bg: string, de: string, es: string, fr: string];

const NAMES: Record<string, Names> = {
  superhero: ['супергерой', 'супергерой', 'Superheld', 'superhéroe', 'super-héros'],
  villain: ['лиходій', 'злодей', 'Bösewicht', 'villano', 'méchant'],
  dystopia: ['антиутопія', 'антиутопия', 'Dystopie', 'distopía', 'dystopie'],
  magic: ['магія', 'магия', 'Magie', 'magia', 'magie'],
  'super power': ['суперсила', 'суперсила', 'Superkraft', 'superpoder', 'super-pouvoir'],
  'new york city': ['Нью-Йорк', 'Ню Йорк', 'New York City', 'Nueva York', 'New York'],
  'marvel cinematic universe (mcu)': [
    'кіновсесвіт Marvel',
    'киновселена на Marvel',
    'Marvel Cinematic Universe',
    'Universo cinematográfico de Marvel',
    'univers cinématographique Marvel'
  ],
  'female protagonist': [
    'героїня',
    'главна героиня',
    'Protagonistin',
    'protagonista femenina',
    'héroïne'
  ],
  'neo-noir': ['неонуар', 'неоноар', 'Neo-Noir', 'neo-noir', 'néo-noir'],
  'time travel': [
    'подорож у часі',
    'пътуване във времето',
    'Zeitreise',
    'viaje en el tiempo',
    'voyage dans le temps'
  ],
  supernatural: ['надприродне', 'свръхестествено', 'Übernatürliches', 'sobrenatural', 'surnaturel'],
  alien: ['прибулець', 'извънземен', 'Außerirdischer', 'extraterrestre', 'extraterrestre'],
  'psychological thriller': [
    'психологічний трилер',
    'психологически трилър',
    'Psychothriller',
    'thriller psicológico',
    'thriller psychologique'
  ],
  'spin off': ['спін-оф', 'спин-оф', 'Spin-off', 'spin-off', 'spin-off'],
  witch: ['відьма', 'вещица', 'Hexe', 'bruja', 'sorcière'],
  'los angeles, california': [
    'Лос-Анджелес',
    'Лос Анджелис',
    'Los Angeles',
    'Los Ángeles',
    'Los Angeles'
  ],
  hero: ['герой', 'герой', 'Held', 'héroe', 'héros'],
  'martial arts': [
    'бойові мистецтва',
    'бойни изкуства',
    'Kampfkunst',
    'artes marciales',
    'arts martiaux'
  ],
  'dark comedy': [
    'чорна комедія',
    'черна комедия',
    'schwarze Komödie',
    'comedia negra',
    'comédie noire'
  ],
  'secret identity': [
    'таємна особистість',
    'тайна самоличност',
    'geheime Identität',
    'identidad secreta',
    'identité secrète'
  ],
  'coming of age': [
    'дорослішання',
    'порастване',
    'Erwachsenwerden',
    'madurez',
    'passage à l’âge adulte'
  ],
  space: ['космос', 'космос', 'Weltraum', 'espacio', 'espace'],
  'good versus evil': [
    'добро проти зла',
    'добро срещу зло',
    'Gut gegen Böse',
    'el bien contra el mal',
    'le bien contre le mal'
  ],
  school: ['школа', 'училище', 'Schule', 'escuela', 'école'],
  'post-apocalyptic future': [
    'постапокаліпсис',
    'постапокалипсис',
    'Postapokalypse',
    'futuro posapocalíptico',
    'futur post-apocalyptique'
  ],
  detective: ['детектив', 'детектив', 'Detektiv', 'detective', 'détective'],
  wizard: ['чарівник', 'магьосник', 'Zauberer', 'mago', 'sorcier'],
  survival: ['виживання', 'оцеляване', 'Überleben', 'supervivencia', 'survie'],
  'space opera': [
    'космічна опера',
    'космическа опера',
    'Space Opera',
    'ópera espacial',
    'space opera'
  ],
  'saving the world': [
    'порятунок світу',
    'спасяване на света',
    'Rettung der Welt',
    'salvar el mundo',
    'sauver le monde'
  ],
  'loss of loved one': [
    'втрата близької людини',
    'загуба на близък човек',
    'Verlust eines geliebten Menschen',
    'pérdida de un ser querido',
    'perte d’un être cher'
  ],
  'serial killer': [
    'серійний убивця',
    'сериен убиец',
    'Serienmörder',
    'asesino en serie',
    'tueur en série'
  ],
  '1980s': ['1980-ті', '80-те години', '1980er', 'años 80', 'années 1980'],
  'high school': ['старша школа', 'гимназия', 'Highschool', 'instituto', 'lycée'],
  investigation: ['розслідування', 'разследване', 'Ermittlung', 'investigación', 'enquête'],
  spacecraft: [
    'космічний корабель',
    'космически кораб',
    'Raumschiff',
    'nave espacial',
    'vaisseau spatial'
  ],
  tragedy: ['трагедія', 'трагедия', 'Tragödie', 'tragedia', 'tragédie'],
  'sibling relationship': [
    'брати й сестри',
    'братя и сестри',
    'Geschwister',
    'hermanos',
    'frères et sœurs'
  ],
  'artificial intelligence (a.i.)': [
    'штучний інтелект',
    'изкуствен интелект',
    'künstliche Intelligenz',
    'inteligencia artificial',
    'intelligence artificielle'
  ],
  vigilante: ['самосуд', 'отмъстител', 'Selbstjustiz', 'justiciero', 'justicier'],
  halloween: ['Гелловін', 'Хелоуин', 'Halloween', 'Halloween', 'Halloween'],
  satire: ['сатира', 'сатира', 'Satire', 'sátira', 'satire'],
  fbi: ['ФБР', 'ФБР', 'FBI', 'FBI', 'FBI'],
  'fantasy world': [
    'вигаданий світ',
    'фантастичен свят',
    'Fantasywelt',
    'mundo de fantasía',
    'monde imaginaire'
  ],
  'parent child relationship': [
    'батьки й діти',
    'родители и деца',
    'Eltern und Kinder',
    'padres e hijos',
    'parents et enfants'
  ],
  philosophical: ['філософське', 'философско', 'philosophisch', 'filosófico', 'philosophique'],
  'dark fantasy': [
    'темне фентезі',
    'тъмно фентъзи',
    'Dark Fantasy',
    'fantasía oscura',
    'dark fantasy'
  ],
  lgbt: ['ЛГБТ', 'ЛГБТ', 'LGBT', 'LGBT', 'LGBT'],
  anthropomorphism: [
    'олюднені тварини',
    'антропоморфизъм',
    'Vermenschlichung',
    'antropomorfismo',
    'anthropomorphisme'
  ],
  'anti hero': ['антигерой', 'антигерой', 'Antiheld', 'antihéroe', 'antihéros'],
  corruption: ['корупція', 'корупция', 'Korruption', 'corrupción', 'corruption'],
  ghost: ['привид', 'призрак', 'Geist', 'fantasma', 'fantôme'],
  'organized crime': [
    'організована злочинність',
    'организирана престъпност',
    'organisiertes Verbrechen',
    'crimen organizado',
    'crime organisé'
  ],
  shounen: ['сьонен', 'шонен', 'Shōnen', 'shōnen', 'shōnen'],
  fight: ['бійка', 'бой', 'Kampf', 'pelea', 'combat'],
  'london, england': ['Лондон', 'Лондон', 'London', 'Londres', 'Londres'],
  gore: ['кривава жорстокість', 'кървави сцени', 'Gore', 'gore', 'gore'],
  'family relationships': [
    'родинні стосунки',
    'семейни отношения',
    'Familienbeziehungen',
    'relaciones familiares',
    'relations familiales'
  ],
  future: ['майбутнє', 'бъдеще', 'Zukunft', 'futuro', 'futur'],
  gangster: ['гангстер', 'гангстер', 'Gangster', 'gánster', 'gangster'],
  police: ['поліція', 'полиция', 'Polizei', 'policía', 'police'],
  psychopath: ['психопат', 'психопат', 'Psychopath', 'psicópata', 'psychopathe'],
  betrayal: ['зрада', 'предателство', 'Verrat', 'traición', 'trahison'],
  battle: ['битва', 'битка', 'Schlacht', 'batalla', 'bataille'],
  quest: ['пошуки', 'мисия', 'Suche', 'búsqueda', 'quête'],
  creature: ['істота', 'създание', 'Kreatur', 'criatura', 'créature'],
  'dying and death': ['смерть', 'смърт', 'Sterben und Tod', 'muerte', 'mort'],
  'world war ii': [
    'Друга світова війна',
    'Втората световна война',
    'Zweiter Weltkrieg',
    'Segunda Guerra Mundial',
    'Seconde Guerre mondiale'
  ],
  robot: ['робот', 'робот', 'Roboter', 'robot', 'robot'],
  'superhero team': [
    'команда супергероїв',
    'екип супергерои',
    'Superheldenteam',
    'equipo de superhéroes',
    'équipe de super-héros'
  ],
  'period drama': [
    'історична драма',
    'историческа драма',
    'Historiendrama',
    'drama de época',
    'drame historique'
  ],
  monster: ['чудовисько', 'чудовище', 'Monster', 'monstruo', 'monstre'],
  dragon: ['дракон', 'дракон', 'Drache', 'dragón', 'dragon'],
  'historical fiction': [
    'історична проза',
    'историческа измислица',
    'historische Fiktion',
    'ficción histórica',
    'fiction historique'
  ],
  'space travel': [
    'космічна подорож',
    'космическо пътуване',
    'Raumfahrt',
    'viaje espacial',
    'voyage spatial'
  ],
  assassin: [
    'найманий убивця',
    'наемен убиец',
    'Auftragsmörder',
    'asesino a sueldo',
    'tueur à gages'
  ],
  'paris, france': ['Париж', 'Париж', 'Paris', 'París', 'Paris'],
  princess: ['принцеса', 'принцеса', 'Prinzessin', 'princesa', 'princesse'],
  escape: ['втеча', 'бягство', 'Flucht', 'fuga', 'évasion'],
  conspiracy: ['змова', 'конспирация', 'Verschwörung', 'conspiración', 'complot'],
  military: ['армія', 'армия', 'Militär', 'ejército', 'armée'],
  flashback: ['спогади', 'ретроспекция', 'Rückblende', 'flashback', 'flash-back'],
  drugs: ['наркотики', 'наркотици', 'Drogen', 'drogas', 'drogue'],
  bullying: ['цькування', 'тормоз', 'Mobbing', 'acoso', 'harcèlement'],
  'small town': [
    'маленьке містечко',
    'малко градче',
    'Kleinstadt',
    'pueblo pequeño',
    'petite ville'
  ],
  scientist: ['науковець', 'учен', 'Wissenschaftler', 'científico', 'scientifique'],
  'father son relationship': [
    'батько й син',
    'баща и син',
    'Vater und Sohn',
    'padre e hijo',
    'père et fils'
  ],
  android: ['андроїд', 'андроид', 'Android', 'androide', 'androïde'],
  '1940s': ['1940-ві', '40-те години', '1940er', 'años 40', 'années 1940'],
  heist: ['пограбування', 'обир', 'Raubüberfall', 'atraco', 'braquage'],
  spy: ['шпигун', 'шпионин', 'Spion', 'espía', 'espion'],
  mutant: ['мутант', 'мутант', 'Mutant', 'mutante', 'mutant'],
  kidnapping: ['викрадення', 'отвличане', 'Entführung', 'secuestro', 'enlèvement'],
  'teen drama': [
    'підліткова драма',
    'тийнейджърска драма',
    'Teenie-Drama',
    'drama adolescente',
    'drame adolescent'
  ],
  teenager: ['підліток', 'тийнейджър', 'Teenager', 'adolescente', 'adolescent'],
  'dc extended universe (dceu)': [
    'розширений всесвіт DC',
    'разширената вселена на DC',
    'DC Extended Universe',
    'Universo extendido de DC',
    'univers cinématographique DC'
  ],
  'fairy tale': ['казка', 'приказка', 'Märchen', 'cuento de hadas', 'conte de fées'],
  '1970s': ['1970-ті', '70-те години', '1970er', 'años 70', 'années 1970'],
  '1960s': ['1960-ті', '60-те години', '1960er', 'años 60', 'années 1960'],
  'san francisco, california': [
    'Сан-Франциско',
    'Сан Франциско',
    'San Francisco',
    'San Francisco',
    'San Francisco'
  ],
  'super villain': ['суперлиходій', 'суперзлодей', 'Superschurke', 'supervillano', 'super-méchant'],
  supervillain: ['суперлиходій', 'суперзлодей', 'Superschurke', 'supervillano', 'super-méchant'],
  'secret organization': [
    'таємна організація',
    'тайна организация',
    'Geheimorganisation',
    'organización secreta',
    'organisation secrète'
  ],
  obsession: ['одержимість', 'обсебеност', 'Besessenheit', 'obsesión', 'obsession'],
  'live action and animation': [
    'гра акторів і анімація',
    'игрален и анимационен',
    'Realfilm und Animation',
    'imagen real y animación',
    'prises de vues réelles et animation'
  ],
  criminal: ['злочинець', 'престъпник', 'Krimineller', 'criminal', 'criminel'],
  'alien invasion': [
    'вторгнення прибульців',
    'извънземно нашествие',
    'Invasion Außerirdischer',
    'invasión extraterrestre',
    'invasion extraterrestre'
  ],
  island: ['острів', 'остров', 'Insel', 'isla', 'île'],
  'teen fantasy': [
    'підліткове фентезі',
    'тийнейджърско фентъзи',
    'Jugend-Fantasy',
    'fantasía juvenil',
    'fantasy adolescente'
  ],
  cyberpunk: ['кіберпанк', 'киберпънк', 'Cyberpunk', 'ciberpunk', 'cyberpunk'],
  orphan: ['сирота', 'сирак', 'Waise', 'huérfano', 'orphelin'],
  rivalry: ['суперництво', 'съперничество', 'Rivalität', 'rivalidad', 'rivalité'],
  'psychological drama': [
    'психологічна драма',
    'психологическа драма',
    'Psychodrama',
    'drama psicológico',
    'drame psychologique'
  ],
  'dysfunctional family': [
    'неблагополучна родина',
    'дисфункционално семейство',
    'dysfunktionale Familie',
    'familia disfuncional',
    'famille dysfonctionnelle'
  ],
  'drug dealer': ['наркоторговець', 'наркодилър', 'Drogendealer', 'narcotraficante', 'dealer'],
  dreams: ['сни', 'сънища', 'Träume', 'sueños', 'rêves'],
  superhuman: ['надлюдина', 'свръхчовек', 'Übermensch', 'sobrehumano', 'surhumain'],
  army: ['армія', 'армия', 'Armee', 'ejército', 'armée'],
  prison: ['в’язниця', 'затвор', 'Gefängnis', 'prisión', 'prison'],
  fighting: ['бої', 'битки', 'Kämpfe', 'peleas', 'combats'],
  torture: ['тортури', 'изтезания', 'Folter', 'tortura', 'torture'],
  loneliness: ['самотність', 'самота', 'Einsamkeit', 'soledad', 'solitude'],
  bravery: ['хоробрість', 'смелост', 'Tapferkeit', 'valentía', 'courage'],
  castle: ['замок', 'замък', 'Burg', 'castillo', 'château'],
  england: ['Англія', 'Англия', 'England', 'Inglaterra', 'Angleterre'],
  manipulation: ['маніпуляція', 'манипулация', 'Manipulation', 'manipulación', 'manipulation'],
  racism: ['расизм', 'расизъм', 'Rassismus', 'racismo', 'racisme'],
  whodunit: ['хто вбивця', 'кой е убиецът', 'Whodunit', 'quién lo hizo', 'whodunit'],
  apocalypse: ['апокаліпсис', 'апокалипсис', 'Apokalypse', 'apocalipsis', 'apocalypse'],
  'father daughter relationship': [
    'батько й донька',
    'баща и дъщеря',
    'Vater und Tochter',
    'padre e hija',
    'père et fille'
  ],
  'school of witchcraft': [
    'школа чарівництва',
    'училище за магия',
    'Zauberschule',
    'escuela de magia',
    'école de sorcellerie'
  ],
  shootout: ['перестрілка', 'престрелка', 'Schießerei', 'tiroteo', 'fusillade'],
  'supernatural power': [
    'надприродна сила',
    'свръхестествена сила',
    'übernatürliche Kraft',
    'poder sobrenatural',
    'pouvoir surnaturel'
  ],
  flying: ['політ', 'летене', 'Fliegen', 'volar', 'vol'],
  training: ['тренування', 'обучение', 'Training', 'entrenamiento', 'entraînement'],
  'psychological horror': [
    'психологічний жах',
    'психологически ужас',
    'Psychohorror',
    'terror psicológico',
    'horreur psychologique'
  ],
  'action hero': [
    'герой бойовика',
    'екшън герой',
    'Actionheld',
    'héroe de acción',
    'héros d’action'
  ],
  terrorism: ['тероризм', 'тероризъм', 'Terrorismus', 'terrorismo', 'terrorisme'],
  '19th century': ['XIX століття', 'XIX век', '19. Jahrhundert', 'siglo XIX', 'XIXe siècle'],
  california: ['Каліфорнія', 'Калифорния', 'Kalifornien', 'California', 'Californie'],
  amnesia: ['амнезія', 'амнезия', 'Amnesie', 'amnesia', 'amnésie'],
  virus: ['вірус', 'вирус', 'Virus', 'virus', 'virus'],
  'crime investigation': [
    'розслідування злочину',
    'разследване на престъпление',
    'Kriminalermittlung',
    'investigación criminal',
    'enquête criminelle'
  ],
  'murder investigation': [
    'розслідування вбивства',
    'разследване на убийство',
    'Mordermittlung',
    'investigación de asesinato',
    'enquête pour meurtre'
  ],
  mission: ['місія', 'мисия', 'Mission', 'misión', 'mission'],
  elves: ['ельфи', 'елфи', 'Elfen', 'elfos', 'elfes'],
  christianity: ['християнство', 'християнство', 'Christentum', 'cristianismo', 'christianisme'],
  'high fantasy': [
    'епічне фентезі',
    'епично фентъзи',
    'High Fantasy',
    'alta fantasía',
    'high fantasy'
  ],
  buddy: ['напарники', 'приятели', 'Buddy', 'compañeros', 'duo'],
  'giant monster': [
    'гігантське чудовисько',
    'гигантско чудовище',
    'Riesenmonster',
    'monstruo gigante',
    'monstre géant'
  ],
  'strong woman': ['сильна жінка', 'силна жена', 'starke Frau', 'mujer fuerte', 'femme forte'],
  'man vs machine': [
    'людина проти машини',
    'човек срещу машина',
    'Mensch gegen Maschine',
    'hombre contra máquina',
    'homme contre machine'
  ],
  'teen superhero': [
    'підліток-супергерой',
    'тийнейджър супергерой',
    'Teenager-Superheld',
    'superhéroe adolescente',
    'super-héros adolescent'
  ],
  demon: ['демон', 'демон', 'Dämon', 'demonio', 'démon'],
  'breaking the fourth wall': [
    'ламання четвертої стіни',
    'разрушаване на четвъртата стена',
    'Durchbrechen der vierten Wand',
    'romper la cuarta pared',
    'briser le quatrième mur'
  ],
  kingdom: ['королівство', 'кралство', 'Königreich', 'reino', 'royaume'],
  transformation: [
    'перевтілення',
    'превъплъщение',
    'Verwandlung',
    'transformación',
    'transformation'
  ],
  'gay theme': ['гей-тема', 'гей тема', 'schwules Thema', 'temática gay', 'thème gay'],
  steampunk: ['стімпанк', 'стиймпънк', 'Steampunk', 'steampunk', 'steampunk'],
  parody: ['пародія', 'пародия', 'Parodie', 'parodia', 'parodie'],
  'social satire': [
    'соціальна сатира',
    'социална сатира',
    'Gesellschaftssatire',
    'sátira social',
    'satire sociale'
  ],
  'family conflict': [
    'родинний конфлікт',
    'семеен конфликт',
    'Familienkonflikt',
    'conflicto familiar',
    'conflit familial'
  ]
};

const ORDER: Exclude<LocaleMode, 'en'>[] = ['uk', 'bg', 'de', 'es', 'fr'];

/** A TMDB tag in the interface language; English, or a tag not in the list, as TMDB writes it. */
export function keywordLabel(name: string, locale: LocaleMode): string {
  if (locale === 'en') return name;
  const names = NAMES[name.trim().toLowerCase()];
  return names ? names[ORDER.indexOf(locale)] : name;
}

/** Number of translated tags (for tests and the roadmap). */
export const TRANSLATED_KEYWORDS = Object.keys(NAMES).length;
