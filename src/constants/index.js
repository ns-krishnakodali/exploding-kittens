// Game and Lobby States
export const GAME_STATE = {
  LANDING: 'LANDING',
  LOBBY: 'LOBBY',
  GAME: 'GAME',
};

export const LOBBY_STATUS = {
  WAITING: 'WAITING',
  IN_GAME: 'IN GAME',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
};

// Card Types and Card Names
export const CARD_TYPES = {
  ALTER_THE_FUTURE: 'Alter-the-Future',
  ATTACK: 'Attack',
  CAT_CARD: 'Cat-Card',
  DEFUSE: 'Defuse',
  DRAW_FROM_THE_BOTTOM: 'Draw-from-the-Bottom',
  EXPLODING_KITTEN: 'Exploding-Kitten',
  FAVOR: 'Favor',
  NOPE: 'Nope',
  SKIP: 'Skip',
  SEE_THE_FUTURE: 'See-the-Future',
  SHUFFLE: 'Shuffle',
  TARGETTED_ATTACK: 'Targeted-Attack',
};

export const CAT_CARD_NAMES = [
  'Beard-Cat',
  'Cattermelon',
  'Feral-Cat',
  'Hairy-Potato-Cat',
  'Rainbow-Ralphing-Cat',
  'Tacocat',
];

export const WILD_CAT_CARD = 'Feral-Cat';

// Loading Messages
export const LOADING_MESSAGES = [
  'Hiding the Exploding Kittens',
  'Preparing to Ruin Friendships',
  'Adding More Explosions Than Necessary',
  'Loading, Do Not Shake the Kittens',
  'Negotiating With Unstable Cats',
];

// Miscellaneous
export const ATTACK_PREFIX = 'Attack';
export const EXPLOSION_PREFIX = 'Explo';
export const SELECT_PLAYER_PREFIX = 'Select a player to';

export const LOBBY_DETAILS = 'LOBBY_DETAILS';

export const MIN_CARDS_LEFT = 15;

export const DRAW_CARD = 'Draw-Card';
export const PLAY_CARD = 'Play-Card';
export const STEAL_CARD = 'Steal-Card';

export const FAVOR_REQUEST = 'Favor-Request';
export const THREE_CARDS_REQUEST = 'Three-Cards-Request';
export const TWO_CARDS_REQUEST = 'Two-Cards-Request';

export const GENERIC_ERROR = 'Something went wrong, try again';
export const UNKOWN_ERROR = 'An unknown error occurred';
export const TRANSFER_ERROR = 'Oops! That card cannot be Transferred';
export const NOPE_ERROR = "Nope! You can't use that Card here";

export const PLAYER_TOOK_CARD = 'took a Card from the Deck!';
export const DREW_FROM_BOTTOM = 'Drew from the Bottom!';
export const CHOOSE_ANOTHER_PLAYER = 'You must choose another player';

export const WINNING_MESSAGE = "The kittens exploded. Your ego didn't, Champion!";

// Links
export const INSTRUCTIONS_LINK =
  'https://cdn.shopify.com/s/files/1/0345/9180/1483/files/ekpp-instructions-english.pdf?v=1743819467';
