export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'CF' | 'ST';
export type Personality = 'Leader' | 'Professional' | 'Temperamental' | 'Reserved' | 'Ambitious' | 'Maverick';
export type TacticalStyle = 'possession' | 'pressing' | 'counter' | 'direct' | 'tiki-taka' | 'low-block' | 'gegenpress' | 'vertical' | 'wing-play' | 'compact';
export type Mentality = 'ultra-attacking' | 'attacking' | 'balanced' | 'defensive' | 'ultra-defensive';
export type Difficulty = 'casual' | 'realistic' | 'brutal';
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
export type GamePhase =
  | 'WELCOME' | 'TEAM_SELECT' | 'SQUAD_HUB' | 'TACTICAL_BOARD' | 'PRE_MATCH'
  | 'LIVE_MATCH' | 'POST_MATCH' | 'PRESS_CONFERENCE' | 'DRESSING_ROOM'
  | 'BETWEEN_MATCHES' | 'GROUP_TABLES' | 'KNOCKOUT_BRACKET' | 'TOURNAMENT_END'
  | 'PENALTY_SHOOTOUT';

export type Duty = 'defend' | 'support' | 'attack';

export type PlayerRole =
  | 'Goalkeeper' | 'SweepingKeeper'
  | 'CentralDefender' | 'BallPlayingDefender' | 'NoNonsenseDefender' | 'Stopper' | 'CoverDefender' | 'WideCentreBack'
  | 'FullBack' | 'WingBack' | 'InvertedFullBack' | 'InvertedWingBack' | 'DefensiveFullBack' | 'AttackingFullBack'
  | 'DefensiveMidfielder' | 'Anchor' | 'HalfBack' | 'BallWinningMidfielder' | 'DeepLyingPlaymaker' | 'SegundoVolante'
  | 'CentralMidfielder' | 'BoxToBoxMidfielder' | 'AdvancedPlaymaker' | 'Mezzala' | 'Carrilero'
  | 'AttackingMidfielder' | 'ShadowStriker' | 'Trequartista' | 'Enganche'
  | 'Winger' | 'InvertedWinger' | 'InsideForward' | 'WidePlaymaker' | 'DefensiveWinger' | 'RaumdeGiver'
  | 'AdvancedForward' | 'PressingForward' | 'DeepLyingForward' | 'TargetForward' | 'CompleteForward' | 'Poacher' | 'FalseNine';

export type PositionFamiliarity = 'natural' | 'accomplished' | 'awkward' | 'unsuitable';

export interface PlayerAttributes {
  passing: number;
  shooting: number;
  crossing: number;
  dribbling: number;
  tackling: number;
  heading: number;
  firstTouch: number;
  longShots: number;
  finishing: number;
  positioning: number;
  vision: number;
  composure: number;
  aggression: number;
  leadership: number;
  workRate: number;
  bravery: number;
  teamwork: number;
  concentration: number;
  pace: number;
  acceleration: number;
  strength: number;
  stamina: number;
  jumping: number;
  balance: number;
  handling: number;
  reflexes: number;
  kicking: number;
  communication: number;
  penaltyStopping: number;
  pressing: number;
  anticipation: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  role: string;
  rating: number;
  form: number;
  fitness: number;
  morale: number;
  experience: number;
  personality: Personality;
  injuryRisk: number;
  bigMatchMentality: number;
  penaltyAbility: number;
  isInjured: boolean;
  injuredUntilRound: number | null;
  isSuspended: boolean;
  yellowCards: number;
  goals: number;
  assists: number;
  matchRatings: number[];
  isInStartingXI: boolean;
  // Extended attributes (optional for backward compat)
  attributes?: PlayerAttributes;
  naturalPositions?: Position[];
  accomplishedPositions?: Position[];
  awkwardPositions?: Position[];
  currentRole?: PlayerRole;
  duty?: Duty;
  strongFoot?: 'left' | 'right' | 'both';
  height?: number;
  weight?: number;
}

export interface TeamTactics {
  formation: string;
  style: TacticalStyle;
  mentality: Mentality;
  pressingIntensity: number;
  defensiveLine: number;
  tempo: number;
  buildUpStyle: 'short' | 'mixed' | 'long';
  attackingWidth: number;
  // Extended tactics phase (optional)
  phase?: TacticsPhase;
  setPieces?: SetPieces;
}

export interface TacticalWarning {
  severity: 'info' | 'warning' | 'danger';
  message: string;
  affectedPlayers?: string[];
}

export interface TacticsPhase {
  attackingWidth: number;
  tempo: number;
  passingDirectness: number;
  creativeFreeedom: number;
  playOutOfDefense: boolean;
  workBallIntoBox: boolean;
  shootOnSight: boolean;
  overlapLeft: boolean;
  overlapRight: boolean;
  underlap: boolean;
  focusLeft: boolean;
  focusRight: boolean;
  focusCentral: boolean;
  runAtDefense: boolean;
  holdShape: boolean;
  counterPressAfterLoss: boolean;
  regroupAfterLoss: boolean;
  counterQuickly: boolean;
  holdShapeAfterWin: boolean;
  distributionStyle: 'short' | 'mixed' | 'long';
  launchQuickAttacks: boolean;
  pressingIntensity: number;
  lineOfEngagement: number;
  defensiveLine: number;
  tacklingAggression: number;
  trapInside: boolean;
  offsideTrap: boolean;
  preventShortGK: boolean;
  compactness: number;
  timeWasting: boolean;
}

export interface SetPieces {
  cornerTaker: string;
  freeKickTaker: string;
  penaltyTaker: string;
  penaltyOrder: string[];
  attackingCornerTarget: string;
  defensiveCornerShape: 'zonal' | 'man' | 'mixed';
  nearPostRoutine: boolean;
  farPostRoutine: boolean;
  shortCorner: boolean;
}

export interface PenaltyKick {
  playerId: string;
  playerName: string;
  penaltyRating: number;
  composure: number;
  fatigue: number;
  morale: number;
  result: 'scored' | 'missed' | 'saved' | 'post' | null;
  direction?: 'left' | 'center' | 'right';
  height?: 'low' | 'mid' | 'high';
}

export interface PenaltyShootout {
  homeKicks: PenaltyKick[];
  awayKicks: PenaltyKick[];
  homeScore: number;
  awayScore: number;
  currentKick: number;
  phase: 'selecting' | 'in_progress' | 'complete';
  winner: 'home' | 'away' | null;
}

export interface Match3DEvent {
  id: string;
  minute: number;
  stoppage: number;
  type: 'kickoff' | 'pass' | 'dribble' | 'shot' | 'save' | 'goal' | 'tackle' | 'foul' | 'yellow' | 'red' | 'corner' | 'freekick' | 'throw' | 'offside' | 'var' | 'substitution' | 'injury' | 'penalty_kick' | 'penalty_save' | 'penalty_miss' | 'clearance' | 'header' | 'counter' | 'momentum' | 'chance';
  team: 'home' | 'away';
  primaryPlayerId?: string;
  primaryPlayerName: string;
  secondaryPlayerName?: string;
  ballFrom: [number, number];
  ballTo: [number, number];
  xG?: number;
  description: string;
  isKeyEvent: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  confederation: string;
  groupId: string;
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  depth: number;
  tacticalIdentity: TacticalStyle;
  mentality: Mentality;
  footballCulture: string;
  mediaPressure: number;
  fanExpectations: number;
  chemistry: number;
  form: number[];
  tournamentExperience: number;
  isPlayerTeam: boolean;
  players: Player[];
  tactics: TeamTactics;
  groupPoints: number;
  groupGD: number;
  groupGF: number;
  groupGA: number;
  groupMatchesPlayed: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'owngoal' | 'yellow' | 'red' | 'substitution' | 'injury' | 'penalty_miss' | 'save' | 'momentum';
  team: 'home' | 'away';
  playerName: string;
  detail?: string;
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXG: number;
  awayXG: number;
  homeCorners: number;
  awayCorners: number;
}

export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  position: Position;
  rating: number;
  goals: number;
  assists: number;
  keyAction: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homePens?: number;
  awayPens?: number;
  events: MatchEvent[];
  events3D?: Match3DEvent[];
  stats: MatchStats;
  homeRatings: PlayerMatchRating[];
  awayRatings: PlayerMatchRating[];
  tacticalVerdict: string;
  mediaReaction: string;
  motm: string;
  stoppageTime?: number;
  hasExtraTime?: boolean;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: MatchStage;
  groupId?: string;
  roundNumber: number;
  result: MatchResult | null;
  played: boolean;
}

export interface PressQuestion {
  question: string;
  options: { text: string; moraleDelta: number; pressureDelta: number; label: string }[];
}

export interface DramaEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  choices: { id: string; text: string; effect: string; moraleDelta: number; chemistrydelta: number }[];
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  managerName: string;
  playerTeamId: string | null;
  teams: Record<string, Team>;
  matches: Match[];
  currentMatchId: string | null;
  currentRound: number;
  groupsGenerated: boolean;
  knockoutGenerated: boolean;
  mediaHeat: number;
  managerRep: number;
  tournamentLog: string[];
  pendingDrama: DramaEvent | null;
  pendingPress: PressQuestion[] | null;
  notifications: string[];
  savedAt: string | null;
  penaltyShootout: PenaltyShootout | null;
}
