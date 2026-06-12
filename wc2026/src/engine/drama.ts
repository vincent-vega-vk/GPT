import type { DramaEvent, PressQuestion, MatchResult, MatchStage } from '../types';

export const DRAMA_EVENTS: DramaEvent[] = [
  {
    id: 'player_unhappy',
    type: 'player_unhappy',
    title: 'Star Player Demands Starting Role',
    description: 'Your star forward has stormed into your office demanding more playing time. He claims he is being underused and the team is suffering because of it. The press are already circling.',
    choices: [
      { id: 'promise', text: 'Promise him a starting spot next match', effect: 'Player morale boosted, but team hierarchy affected', moraleDelta: 12, chemistrydelta: -5 },
      { id: 'firm', text: 'Stand firm — he plays when the team needs him', effect: 'He sulks but respects your authority', moraleDelta: -5, chemistrydelta: 3 },
      { id: 'compromise', text: 'Offer him a key role off the bench with increased responsibility', effect: 'A reasonable compromise keeps everyone happy', moraleDelta: 6, chemistrydelta: 5 },
    ],
  },
  {
    id: 'captain_meeting',
    type: 'captain_meeting',
    title: 'Captain Requests Emergency Team Meeting',
    description: 'Your captain has pulled you aside before training. The dressing room is divided over tactical choices. Some players think the approach is too defensive, others back you completely. This needs to be addressed.',
    choices: [
      { id: 'open_forum', text: 'Hold an open meeting — let everyone speak', effect: 'Clears the air and boosts unity', moraleDelta: 8, chemistrydelta: 12 },
      { id: 'back_captain', text: 'Back the captain 100% to restore hierarchy', effect: 'Clear leadership improves team structure', moraleDelta: 5, chemistrydelta: 8 },
      { id: 'ignore', text: 'Dismiss it — focus on the next match', effect: 'Tension simmers but some respect your resolve', moraleDelta: -8, chemistrydelta: -5 },
    ],
  },
  {
    id: 'media_attack',
    type: 'media_attack',
    title: 'Explosive Media Attack',
    description: 'A leading football journalist has published a scathing article questioning your tactical decisions, calling your setup "outdated" and "overly cautious." It\'s gone viral and the players have seen it.',
    choices: [
      { id: 'fire_back', text: 'Publicly defend your methods with confidence', effect: 'Wins respect from the squad but escalates media war', moraleDelta: 7, chemistrydelta: 5 },
      { id: 'ignore_media', text: 'Ignore it completely — results speak', effect: 'Quiet dignity — players appreciate the focus', moraleDelta: 3, chemistrydelta: 7 },
      { id: 'partial_concede', text: 'Acknowledge some valid points, announce tactical review', effect: 'Shows humility but some players question your conviction', moraleDelta: -2, chemistrydelta: 3 },
    ],
  },
  {
    id: 'injury_scare',
    type: 'injury_scare',
    title: 'Key Player Injury Scare in Training',
    description: 'Your best player left training early with a suspected muscle problem. The physio is cautiously optimistic, but there are 48 hours until the next match. He wants to play through it.',
    choices: [
      { id: 'risk_it', text: 'Clear him to play — he\'s crucial', effect: 'He starts but risks aggravating the injury', moraleDelta: 8, chemistrydelta: 3 },
      { id: 'rest', text: 'Rest him to ensure he\'s fit for the knockout stage', effect: 'Wise management — squad responds positively', moraleDelta: -3, chemistrydelta: 8 },
      { id: 'fitness_test', text: 'Late fitness test — decision on matchday', effect: 'Keeps everyone guessing including the opposition', moraleDelta: 5, chemistrydelta: 5 },
    ],
  },
  {
    id: 'tactical_leak',
    type: 'tactical_leak',
    title: 'Tactical Leak Scandal',
    description: 'Your detailed tactical briefing for the next match has somehow reached the opposition coach. Someone in the camp is talking. The players are shocked and trust is fractured.',
    choices: [
      { id: 'investigate', text: 'Launch an internal investigation immediately', effect: 'Shows decisiveness but creates paranoia', moraleDelta: -5, chemistrydelta: -8 },
      { id: 'change_tactics', text: 'Completely overhaul the game plan overnight', effect: 'Keeps the opposition guessing but disrupts preparation', moraleDelta: 3, chemistrydelta: -3 },
      { id: 'trust_squad', text: 'Address the squad directly and choose to trust everyone', effect: 'Unity in adversity — team bonds tighten', moraleDelta: 10, chemistrydelta: 10 },
    ],
  },
  {
    id: 'dressing_room_split',
    type: 'dressing_room_split',
    title: 'Dressing Room Split',
    description: 'A physical altercation in training between two senior players has been caught on video. The footage is being sold to tabloids. The squad is split along tribal lines and you must act fast.',
    choices: [
      { id: 'drop_both', text: 'Drop both players from the squad temporarily', effect: 'Strong leadership — sends clear message to all', moraleDelta: -3, chemistrydelta: 10 },
      { id: 'mediate', text: 'Personally mediate and bring them together', effect: 'Time-consuming but potentially repairs the bond', moraleDelta: 7, chemistrydelta: 12 },
      { id: 'side_with_one', text: 'Back the more important player publicly', effect: 'Divisive — one side loves it, the other seethes', moraleDelta: 5, chemistrydelta: -8 },
    ],
  },
  {
    id: 'federation_pressure',
    type: 'federation_pressure',
    title: 'Federation Demands Tactical Change',
    description: 'The president of the football federation has summoned you to a private meeting. He wants you to play more attacking football. "The fans expect entertainment," he says. You must decide how to respond.',
    choices: [
      { id: 'comply', text: 'Agree to a more attacking approach', effect: 'Political peace but tactical compromise', moraleDelta: 5, chemistrydelta: 3 },
      { id: 'refuse', text: 'Refuse point-blank — tactics are your domain', effect: 'Tense standoff — squad rallies behind you', moraleDelta: 8, chemistrydelta: 8 },
      { id: 'negotiate', text: 'Compromise — promise to be more adventurous when winning', effect: 'A diplomatic solution that satisfies both sides', moraleDelta: 5, chemistrydelta: 5 },
    ],
  },
  {
    id: 'breakout_player',
    type: 'breakout_player',
    title: 'Young Star Demanding a Chance',
    description: 'Your youngest squad member has been incredible in training. The other players are talking about him. Social media is buzzing. He walks into your office with fire in his eyes. "I\'m ready, boss."',
    choices: [
      { id: 'start_him', text: 'Give him his first start next match', effect: 'High risk, high reward — squad excited by youth', moraleDelta: 10, chemistrydelta: 8 },
      { id: 'super_sub', text: 'Bring him on as an impact substitute', effect: 'Measured approach — he understands and accepts', moraleDelta: 6, chemistrydelta: 5 },
      { id: 'not_yet', text: 'Explain he needs more time — stay patient', effect: 'He\'s disappointed but trusts the process', moraleDelta: -3, chemistrydelta: 3 },
    ],
  },
  {
    id: 'veteran_redemption',
    type: 'veteran_redemption',
    title: 'Veteran Seeks One Last Dance',
    description: 'Your veteran player, in what will be his final World Cup, pulls you aside. Eyes glistening, he asks to be given a chance to prove himself one more time. "This is my last shot. I have more to give."',
    choices: [
      { id: 'give_chance', text: 'Give him a starting role in the next match', effect: 'Emotional boost ripples through the entire squad', moraleDelta: 12, chemistrydelta: 10 },
      { id: 'bench_role', text: 'Promise him meaningful minutes off the bench', effect: 'He accepts graciously — a true professional', moraleDelta: 8, chemistrydelta: 7 },
      { id: 'keep_rotation', text: 'Explain that merit must come first', effect: 'He respects the honesty but feels deflated', moraleDelta: -5, chemistrydelta: 3 },
    ],
  },
  {
    id: 'fan_backlash',
    type: 'fan_backlash',
    title: 'Angry Fan Backlash',
    description: 'Thousands of fans are camped outside the team hotel. They are chanting for a change of approach and several banners criticise you personally. Players are watching from their rooms. The atmosphere is toxic.',
    choices: [
      { id: 'meet_fans', text: 'Go outside and meet with fan representatives', effect: 'Brave and bold — players inspired by your courage', moraleDelta: 10, chemistrydelta: 8 },
      { id: 'security', text: 'Request security to move them on — stay focused', effect: 'Controversial but creates a siege mentality', moraleDelta: 5, chemistrydelta: 5 },
      { id: 'message_out', text: 'Send a written statement addressing their concerns', effect: 'Safe and diplomatic — deflects immediate pressure', moraleDelta: 3, chemistrydelta: 3 },
    ],
  },
  {
    id: 'secret_training',
    type: 'secret_training',
    title: 'New Tactical Weapon Unveiled',
    description: 'Your coaching staff has developed a new pressing trigger system in secret. The players are excited by it. It could devastate the opposition — but it\'s untested at this level.',
    choices: [
      { id: 'deploy_it', text: 'Deploy the new system in the next match', effect: 'High risk but squad buzzing with excitement', moraleDelta: 8, chemistrydelta: 7 },
      { id: 'save_knockouts', text: 'Save it as a trump card for the knockout stage', effect: 'Strategic masterstroke if it works', moraleDelta: 5, chemistrydelta: 6 },
      { id: 'abandon', text: 'Stick with the tried and trusted approach', effect: 'Safe and predictable — no surprises either way', moraleDelta: 2, chemistrydelta: 3 },
    ],
  },
];

export function generatePressQuestions(
  result: MatchResult | null,
  stage: MatchStage,
  isWin: boolean,
  mediaHeat: number
): PressQuestion[] {
  const questions: PressQuestion[] = [];
  if (!result) {
    questions.push({
      question: 'How do you assess your squad\'s readiness for this tournament?',
      options: [
        { text: 'We are fully prepared and ready to make history.', moraleDelta: 5, pressureDelta: -5, label: 'Confident' },
        { text: 'We have worked hard and will take it one match at a time.', moraleDelta: 3, pressureDelta: 0, label: 'Measured' },
        { text: 'The squad is not at 100% but we have quality depth.', moraleDelta: -3, pressureDelta: -8, label: 'Cautious' },
      ],
    });
    return questions;
  }
  if (isWin) {
    questions.push({
      question: `Magnificent result! What was the key tactical decision that unlocked the opposition?`,
      options: [
        { text: 'We identified their weakness early and exploited it ruthlessly.', moraleDelta: 7, pressureDelta: 5, label: 'Bold' },
        { text: 'The players executed the game plan brilliantly — credit to them.', moraleDelta: 8, pressureDelta: -2, label: 'Humble' },
        { text: 'I made crucial adjustments at half time that changed the game.', moraleDelta: 5, pressureDelta: 8, label: 'Tactical' },
      ],
    });
    questions.push({
      question: 'Some say you were lucky today. Is the criticism fair?',
      options: [
        { text: 'Luck? We created the chances and finished them. Simple as that.', moraleDelta: 6, pressureDelta: 10, label: 'Defiant' },
        { text: 'Every team needs a bit of fortune but we earned this result.', moraleDelta: 4, pressureDelta: 3, label: 'Balanced' },
        { text: 'We can improve but the result is all that matters.', moraleDelta: 3, pressureDelta: -2, label: 'Pragmatic' },
      ],
    });
  } else {
    questions.push({
      question: 'A difficult result. What went wrong tactically?',
      options: [
        { text: 'We gave away too much space and were punished for it.', moraleDelta: -3, pressureDelta: -5, label: 'Honest' },
        { text: 'Individual errors cost us — it happens in football.', moraleDelta: -5, pressureDelta: -3, label: 'Deflecting' },
        { text: 'We dominated the game but were let down by finishing.', moraleDelta: 2, pressureDelta: 3, label: 'Positive spin' },
      ],
    });
    questions.push({
      question: 'Are you worried about the team\'s morale after this result?',
      options: [
        { text: 'This group has character. We will bounce back stronger.', moraleDelta: 8, pressureDelta: 2, label: 'Inspirational' },
        { text: 'Of course it hurts, but we must use this as motivation.', moraleDelta: 5, pressureDelta: 0, label: 'Realistic' },
        { text: 'I have full confidence in my players and my methods.', moraleDelta: 6, pressureDelta: 5, label: 'Defiant' },
      ],
    });
  }
  if (mediaHeat > 60) {
    questions.push({
      question: 'The press is speculating about your future. How are you handling the pressure?',
      options: [
        { text: 'I don\'t read the newspapers. I focus purely on football.', moraleDelta: 5, pressureDelta: -8, label: 'Steely' },
        { text: 'I am fully supported by the federation and that\'s all that matters.', moraleDelta: 3, pressureDelta: -5, label: 'Diplomatic' },
        { text: 'The pressure only makes me stronger. Ask me again in the final.', moraleDelta: 8, pressureDelta: 8, label: 'Arrogant' },
      ],
    });
  }
  if (['qf', 'sf', 'final'].includes(stage)) {
    questions.push({
      question: `A ${stage === 'final' ? 'World Cup Final' : stage.toUpperCase()} awaits. How do you prepare mentally for such magnitude?`,
      options: [
        { text: 'This is what we have worked for. Embrace every moment.', moraleDelta: 10, pressureDelta: 5, label: 'Inspirational' },
        { text: 'Treat it like any other match — one chance, one moment.', moraleDelta: 6, pressureDelta: -3, label: 'Focused' },
        { text: 'The occasion will motivate the players more than any team talk.', moraleDelta: 7, pressureDelta: 0, label: 'Philosophical' },
      ],
    });
  }
  return questions.slice(0, 3);
}

export function pickDramaEvent(
  round: number,
  mediaHeat: number,
  teamMorale: number,
  previousEvents: string[]
): DramaEvent | null {
  if (Math.random() < 0.4) return null;
  const available = DRAMA_EVENTS.filter(e => !previousEvents.includes(e.id));
  if (available.length === 0) return null;
  const weights = available.map(e => {
    let w = 1;
    if (mediaHeat > 70 && ['media_attack', 'fan_backlash', 'federation_pressure'].includes(e.type)) w = 3;
    if (teamMorale < 50 && ['dressing_room_split', 'player_unhappy', 'captain_meeting'].includes(e.type)) w = 3;
    if (round >= 4 && ['veteran_redemption', 'breakout_player'].includes(e.type)) w = 2;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return available[i];
  }
  return available[0];
}
